from rest_framework import serializers
from .models import Notification, NotificationPreferences, Announcement
from django.contrib.auth import get_user_model
from backend.accounts.serializers import UserProfileSerializer

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class NotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender = UserSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'type', 'message', 'sender', 'sender_name', 'is_read', 'created_at', 'data']
        read_only_fields = ['created_at']

    def get_sender_name(self, obj):
        if obj.sender:
            return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.username
        return None

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreferences
        fields = ['email_notifications', 'push_notifications', 'in_app_notifications', 'notification_types']

class AnnouncementSerializer(serializers.ModelSerializer):
    created_by = UserProfileSerializer(read_only=True)
    image_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'message', 'created_at', 'created_by', 'is_active', 
                 'target_audience', 'image', 'video', 'media_type', 'image_url', 'video_url']
        read_only_fields = ['created_at', 'created_by', 'media_type']

    def get_image_url(self, obj):
        if obj.image:
            return self.context['request'].build_absolute_uri(obj.image.url)
        return None

    def get_video_url(self, obj):
        if obj.video:
            return self.context['request'].build_absolute_uri(obj.video.url)
        return None