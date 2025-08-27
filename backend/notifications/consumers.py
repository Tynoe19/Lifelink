import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Notification
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)
User = get_user_model()

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Accept the connection first
        await self.accept()
        
        # Get the token from the query parameters
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        
        if not token:
            logger.error("No token provided in WebSocket connection")
            await self.send(text_data=json.dumps({
                'type': 'auth_error',
                'message': 'No token provided'
            }))
            await self.close()
            return

        try:
            # Verify the token
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            self.user = await self.get_user(user_id)
            
            if not self.user:
                logger.error(f"Invalid user ID in token: {user_id}")
                await self.send(text_data=json.dumps({
                    'type': 'auth_error',
                    'message': 'Invalid user'
                }))
                await self.close()
                return

            # Add user to their notification group
            self.room_group_name = f'notifications_{self.user.id}'
            logger.info(f"Adding user {self.user.id} to notification group {self.room_group_name}")
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            # Send authentication success message
            await self.send(text_data=json.dumps({
                'type': 'auth_success',
                'message': 'Authentication successful'
            }))
            logger.info(f"WebSocket connection established for user {self.user.id}")

        except Exception as e:
            logger.error(f"Error in WebSocket connection: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'auth_error',
                'message': str(e)
            }))
            await self.close()

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.error(f"User not found: {user_id}")
            return None

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            logger.info(f"Disconnecting user {self.user.id} from notification group {self.room_group_name}")
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            logger.info(f"Received message of type: {message_type}")
            
            if message_type == 'auth':
                # Authentication is already handled in connect
                pass
            elif message_type == 'notification':
                # Handle notification message
                notification = text_data_json.get('notification')
                if notification:
                    logger.info(f"Sending notification to group {self.room_group_name}: {notification}")
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'notification_message',
                            'notification': notification
                        }
                    )

        except json.JSONDecodeError as e:
            logger.error(f"Error decoding JSON message: {str(e)}")
            # Handle non-JSON messages
            pass

    async def notification_message(self, event):
        notification = event['notification']
        logger.info(f"Sending notification to client: {notification}")
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': notification
        })) 