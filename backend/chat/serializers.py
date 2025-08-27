from rest_framework import serializers
from .models import ChatRoom, Message
from backend.accounts.serializers import UserProfileSerializer
from backend.donations.serializers import OrganSerializer

class MessageSerializer(serializers.ModelSerializer):
    sender = UserProfileSerializer(read_only=True)
    timestamp = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'content', 'is_read', 'timestamp']
        read_only_fields = ['sender', 'timestamp']

class ChatRoomSerializer(serializers.ModelSerializer):
    donor = UserProfileSerializer(read_only=True)
    recipient = UserProfileSerializer(read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    organ_id = serializers.PrimaryKeyRelatedField(source='organ', read_only=True)
    organ = OrganSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    last_activity = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S")

    class Meta:
        model = ChatRoom
        fields = [
            'id', 'organ_id', 'organ', 'donor', 'recipient', 'status',
            'status_display', 'messages', 'last_activity', 'created_at'
        ]
        read_only_fields = ['organ_id', 'organ', 'donor', 'recipient', 'created_at']

class CreateMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['content']
