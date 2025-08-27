import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from .models import ChatRoom, Message
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class ChatMessageHandler:
    """Handles chat message processing and storage"""
    
    @staticmethod
    @database_sync_to_async
    def save_message(sender_id: int, content: str, room_id: int) -> Message:
        """Save a message to the database"""
        try:
            sender = User.objects.get(id=sender_id)
            room = ChatRoom.objects.get(id=room_id)
            message = Message.objects.create(
                chat_room=room,
                sender=sender,
                content=content,
                is_read=False
            )
            logger.info(f"Message saved successfully with ID: {message.id}")
            return message
        except User.DoesNotExist:
            logger.error(f"User with ID {sender_id} not found")
            raise
        except ChatRoom.DoesNotExist:
            logger.error(f"Chat room with ID {room_id} not found")
            raise
        except Exception as e:
            logger.error(f"Error saving message: {str(e)}")
            raise

    @staticmethod
    @database_sync_to_async
    def get_room_details(room_id: int) -> dict:
        """Get chat room details including organ information"""
        try:
            room = ChatRoom.objects.select_related('organ').get(id=room_id)
            return {
                'organ_name': room.organ.organ_name if room.organ else None,
                'organ_id': room.organ.id if room.organ else None
            }
        except ChatRoom.DoesNotExist:
            logger.error(f"Chat room with ID {room_id} not found")
            return {'organ_name': None, 'organ_id': None}
        except Exception as e:
            logger.error(f"Error getting room details: {str(e)}")
            return {'organ_name': None, 'organ_id': None}

    @staticmethod
    async def format_message_response(message: str, sender: dict, chat_room_id: str, 
                              timestamp: str, is_read: bool) -> dict:
        """Format message response for WebSocket"""
        # Get room details including organ information
        room_details = await ChatMessageHandler.get_room_details(int(chat_room_id))
        
        return {
            'type': 'chat_message',
            'message': message,
            'sender': sender,
            'chatRoomId': chat_room_id,
            'timestamp': timestamp,
            'is_read': is_read,
            'organ': {
                'name': room_details['organ_name'],
                'id': room_details['organ_id']
            }
        }

class ChatAuthHandler:
    """Handles chat authentication and authorization"""
    
    @staticmethod
    async def authenticate_user(scope) -> tuple[User, str]:
        """Authenticate user from WebSocket connection"""
        try:
            query_string = scope['query_string'].decode()
            token = query_string.split('=')[1]
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            user = await ChatAuthHandler.get_user(user_id)
            return user, token
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            raise

    @staticmethod
    @database_sync_to_async
    def get_user(user_id: int) -> User:
        """Get user from database"""
        return User.objects.get(id=user_id)

    @staticmethod
    @database_sync_to_async
    def has_access_to_room(room_id: int, user: User) -> bool:
        """Check if user has access to chat room"""
        try:
            room = ChatRoom.objects.get(id=room_id)
            return room.donor == user or room.recipient == user
        except ChatRoom.DoesNotExist:
            return False

class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for chat functionality"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_id = None
        self.room_group_name = None
        self.user = None
        self.message_handler = ChatMessageHandler()
        self.auth_handler = ChatAuthHandler()

    async def connect(self):
        """Handle WebSocket connection"""
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'

        try:
            # Authenticate user
            self.user, _ = await self.auth_handler.authenticate_user(self.scope)
            
            # Verify room access
            if not await self.auth_handler.has_access_to_room(self.room_id, self.user):
                logger.warning(f"User {self.user.id} denied access to room {self.room_id}")
                await self.close(code=4001)
                return

            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            logger.info(f"WebSocket connection accepted for user {self.user.id} in room {self.room_id}")

        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.info(f"WebSocket disconnected with code {close_code}")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            logger.info(f"Received WebSocket message: {data}")

            # Extract required fields with fallbacks
            message = data.get('message')
            sender_id = data.get('sender_id')
            chat_room_id = data.get('chatRoomId')
            temp_id = data.get('tempId')
            message_type = data.get('type', 'chat_message')

            # Validate required fields
            if not message:
                logger.error("Missing message content")
                await self.close(code=4002)
                return

            if not sender_id:
                logger.error("Missing sender_id")
                await self.close(code=4002)
                return

            # Verify sender
            if int(sender_id) != self.user.id:
                logger.error(f"Sender ID mismatch: {sender_id} != {self.user.id}")
                await self.close(code=4002)
                return

            # Verify chat room
            if chat_room_id and str(chat_room_id) != str(self.room_id):
                logger.error(f"Chat room mismatch: {chat_room_id} != {self.room_id}")
                await self.close(code=4002)
                return

            try:
                # Save and broadcast message
                saved_message = await self.message_handler.save_message(
                    sender_id, message, self.room_id
                )
                
                response_data = await self.message_handler.format_message_response(
                    message=message,
                    sender={'id': self.user.id, 'fullname': self.user.fullname},
                    chat_room_id=self.room_id,
                    timestamp=saved_message.timestamp.isoformat(),
                    is_read=saved_message.is_read
                )
                # Echo tempId if present
                if temp_id:
                    response_data['tempId'] = temp_id

                await self.channel_layer.group_send(
                    self.room_group_name,
                    response_data
                )
                logger.info(f"Message processed and broadcast successfully: {response_data}")

            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
                await self.close(code=4003)
                return

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            await self.close(code=4003)
        except Exception as e:
            logger.error(f"Unexpected error in receive: {str(e)}")
            await self.close(code=4003)

    async def chat_message(self, event):
        """Handle chat message events"""
        try:
            await self.send(text_data=json.dumps(event))
        except Exception as e:
            logger.error(f"Error sending chat message: {str(e)}")

    @database_sync_to_async
    def get_latest_message_timestamp(self):
        try:
            latest_message = Message.objects.latest('timestamp')
            return str(latest_message.timestamp)
        except Message.DoesNotExist:
            return str(datetime.now())

    @database_sync_to_async
    def get_message_read_status(self):
        try:
            latest_message = Message.objects.latest('timestamp')
            return latest_message.is_read
        except Message.DoesNotExist:
            return False

class GlobalChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for global chat messages"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.auth_handler = ChatAuthHandler()

    async def connect(self):
        """Handle WebSocket connection"""
        try:
            # Authenticate user
            self.user, _ = await self.auth_handler.authenticate_user(self.scope)
            # Join global chat group
            await self.channel_layer.group_add('global_chat', self.channel_name)
            await self.accept()
            logger.info(f"Global chat WebSocket connection accepted for user {self.user.id}")
        except Exception as e:
            logger.error(f"Global chat connection error: {str(e)}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        await self.channel_layer.group_discard('global_chat', self.channel_name)
        logger.info(f"Global chat WebSocket disconnected with code {close_code}")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            logger.info(f"Received global WebSocket message: {data}")

            # Extract required fields
            message = data.get('message')
            sender_id = data.get('sender_id')
            chat_room_id = data.get('chatRoomId')

            # Validate required fields
            if not message or not sender_id or not chat_room_id:
                logger.error("Missing required fields in global chat message")
                await self.close(code=4002)
                return

            # Verify sender
            if int(sender_id) != self.user.id:
                logger.error(f"Sender ID mismatch: {sender_id} != {self.user.id}")
                await self.close(code=4002)
                return

            # Broadcast message to all clients
            await self.channel_layer.group_send(
                'global_chat',
                {
                    'type': 'chat_message',
                    'message': message,
                    'sender': {'id': sender_id, 'fullname': self.user.fullname},
                    'chatRoomId': chat_room_id,
                    'timestamp': datetime.now().isoformat(),
                    'is_read': False
                }
            )
        except Exception as e:
            logger.error(f"Error processing global chat message: {str(e)}")
            await self.close(code=4000)

    async def chat_message(self, event):
        """Send chat message to WebSocket"""
        await self.send(text_data=json.dumps(event)) 