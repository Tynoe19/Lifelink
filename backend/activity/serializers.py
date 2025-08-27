from rest_framework import serializers
from .models import ActivityHistory
from backend.accounts.serializers import UserSerializer

class ActivityHistorySerializer(serializers.ModelSerializer):
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = ActivityHistory
        fields = [
            'id', 'user', 'activity_type', 'activity_type_display', 'description',
            'ip_address', 'device_info', 'location', 'created_at', 'metadata',
            'is_read'
        ]
        read_only_fields = ['user', 'created_at']