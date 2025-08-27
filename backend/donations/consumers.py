import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from .models import Organ, DonationRequest
from .serializers import DonationRequestSerializer

class OrganRequestConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['user'].id
        self.organ_id = self.scope['url_route']['kwargs']['organ_id']
        self.organ_group_name = f'organ_{self.organ_id}'
        self.user_group_name = f'user_{self.user_id}'
        
        # Join organ group
        await self.channel_layer.group_add(
            self.organ_group_name,
            self.channel_name
        )
        
        # Join user-specific group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()

    async def disconnect(self, close_code):
        # Leave groups
        await self.channel_layer.group_discard(
            self.organ_group_name,
            self.channel_name
        )
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json.get('action')
        
        if action == 'request_organ':
            await self.handle_organ_request(text_data_json)
        elif action == 'accept_request':
            await self.handle_request_acceptance(text_data_json)
        elif action == 'reject_request':
            await self.handle_request_rejection(text_data_json)
        elif action == 'connect_request':
            await self.handle_connection_request(text_data_json)

    @database_sync_to_async
    def create_donation_request(self, organ_id, recipient_id, message):
        organ = Organ.objects.get(id=organ_id)
        request = DonationRequest.objects.create(
            organ=organ,
            recipient_id=recipient_id,
            message=message
        )
        return request

    @database_sync_to_async
    def update_request_status(self, request_id, status):
        request = DonationRequest.objects.get(id=request_id)
        request.status = status
        request.save()
        if status == 'accepted':
            request.organ.is_available = False
            request.organ.save()
        return request

    async def handle_organ_request(self, data):
        try:
            request = await self.create_donation_request(
                self.organ_id,
                data['recipient_id'],
                data.get('message', '')
            )
            
            # Send notification to organ owner
            await self.channel_layer.group_send(
                f'notifications_{request.organ.donor.id}',
                {
                    'type': 'request_notification',
                    'request': DonationRequestSerializer(request).data
                }
            )
        except Exception as e:
            await self.send(text_data=json.dumps({
                'error': str(e)
            }))

    async def handle_request_acceptance(self, data):
        try:
            request = await self.update_request_status(data['request_id'], 'accepted')
            
            # Notify recipient
            await self.channel_layer.group_send(
                f'notifications_{request.recipient.id}',
                {
                    'type': 'request_accepted',
                    'request': DonationRequestSerializer(request).data
                }
            )
            
            # Also notify the donor's group to update their UI
            await self.channel_layer.group_send(
                f'notifications_{request.organ.donor.id}',
                {
                    'type': 'request_accepted',
                    'request': DonationRequestSerializer(request).data
                }
            )
        except Exception as e:
            await self.send(text_data=json.dumps({
                'error': str(e)
            }))

    async def handle_request_rejection(self, data):
        try:
            request = await self.update_request_status(data['request_id'], 'rejected')
            
            # Notify recipient
            await self.channel_layer.group_send(
                f'notifications_{request.recipient.id}',
                {
                    'type': 'request_rejected',
                    'request': DonationRequestSerializer(request).data
                }
            )
            
            # Also notify the donor's group to update their UI
            await self.channel_layer.group_send(
                f'notifications_{request.organ.donor.id}',
                {
                    'type': 'request_rejected',
                    'request': DonationRequestSerializer(request).data
                }
            )
        except Exception as e:
            await self.send(text_data=json.dumps({
                'error': str(e)
            }))

    async def handle_connection_request(self, data):
        try:
            request = await self.create_donation_request(
                self.organ_id,
                data['recipient_id'],
                data.get('message', '')
            )
            
            # Send notification to organ owner
            await self.channel_layer.group_send(
                f'notifications_{request.organ.donor.id}',
                {
                    'type': 'connection_request',
                    'request': DonationRequestSerializer(request).data
                }
            )
        except Exception as e:
            await self.send(text_data=json.dumps({
                'error': str(e)
            }))

    async def request_notification(self, event):
        await self.send(text_data=json.dumps(event))

    async def request_accepted(self, event):
        await self.send(text_data=json.dumps(event))

    async def request_rejected(self, event):
        await self.send(text_data=json.dumps(event))

    async def connection_request(self, event):
        await self.send(text_data=json.dumps(event))

class DonationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            print("WebSocket connection attempt received")
            
            # Get the token from the query string
            query_string = self.scope.get('query_string', b'').decode('utf-8')
            print(f"Query string: {query_string}")
            
            if not query_string:
                print("No query string found")
                await self.close(code=4001)
                return

            # Parse the query string to get the token
            try:
                params = dict(param.split('=') for param in query_string.split('&'))
                token = params.get('token')
                print(f"Extracted token: {token[:10]}..." if token else "No token found in params")
            except Exception as e:
                print(f"Error parsing query string: {e}")
                await self.close(code=4001)
                return
            
            if not token:
                print("Token not found in query parameters")
                await self.close(code=4001)
                return

            # Validate token
            try:
                print("Attempting to validate token...")
                access_token = AccessToken(token)
                user_id = access_token['user_id']
                print(f"Token validated successfully for user_id: {user_id}")
                
                self.user_id = user_id
                self.room_group_name = f'donations_{user_id}'
                
                # Accept the connection
                await self.accept()
                print("WebSocket connection accepted")
                
                # Join user's notification group
                await self.channel_layer.group_add(
                    self.room_group_name,
                    self.channel_name
                )
                print(f"Joined notification group: {self.room_group_name}")
                
                # Send authentication success message
                await self.send(text_data=json.dumps({
                    'type': 'auth_success',
                    'message': 'Authentication successful'
                }))
                print("Sent authentication success message")
                
            except Exception as e:
                print(f"Token validation error: {e}")
                await self.close(code=4001)
                
        except Exception as e:
            print(f"Connection error: {e}")
            await self.close(code=4001)

    async def disconnect(self, close_code):
        print(f"WebSocket disconnecting with code: {close_code}")
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            print(f"Left notification group: {self.room_group_name}")

    async def receive(self, text_data):
        try:
            print(f"Received message: {text_data}")
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'notification':
                # Handle notification message
                notification = text_data_json.get('notification')
                if notification:
                    print(f"Sending notification to group: {self.room_group_name}")
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'notification_message',
                            'notification': notification
                        }
                    )
        except json.JSONDecodeError as e:
            print(f"Error decoding message: {e}")
        except Exception as e:
            print(f"Error processing message: {e}")

    async def notification_message(self, event):
        try:
            notification = event['notification']
            print(f"Sending notification to client: {notification}")
            await self.send(text_data=json.dumps({
                'type': 'notification',
                'notification': notification
            }))
        except Exception as e:
            print(f"Error sending notification: {e}") 