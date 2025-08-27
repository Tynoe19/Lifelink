from rest_framework import viewsets, status, generics, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification, NotificationPreferences, Announcement
from .serializers import NotificationSerializer, NotificationPreferenceSerializer, AnnouncementSerializer
from django.db.models import Q
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'notification marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'all notifications marked as read'})

    @action(detail=True, methods=['post'])
    def accept_request(self, request, pk=None):
        notification = self.get_object()
        
        # Verify this is a connection request
        if notification.type != 'connection':
            return Response({'error': 'This is not a connection request'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create acceptance notification for the sender
        acceptance_notification = Notification.objects.create(
            user=notification.sender,
            type='connection_accepted',
            message=f'Your connection request has been accepted by {request.user.fullname}',
            sender=request.user,
            data={'original_notification_id': notification.id}
        )
        
        # Send WebSocket notification to the sender
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{notification.sender.id}',
            {
                'type': 'notification_message',
                'notification': {
                    'id': acceptance_notification.id,
                    'type': acceptance_notification.type,
                    'message': acceptance_notification.message,
                    'is_read': acceptance_notification.is_read,
                    'created_at': acceptance_notification.created_at.isoformat(),
                    'sender': {
                        'id': request.user.id,
                        'fullname': request.user.fullname
                    },
                    'data': acceptance_notification.data
                }
            }
        )
        
        return Response({
            'status': 'request accepted',
            'notification': NotificationSerializer(acceptance_notification).data
        })

class NotificationPreferencesViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'put', 'patch']  # Only allow read and update operations

    def get_object(self):
        # Get or create preferences for the current user
        obj, created = NotificationPreferences.objects.get_or_create(user=self.request.user)
        return obj

    def get_queryset(self):
        # Only return the current user's preferences
        return NotificationPreferences.objects.filter(user=self.request.user)

class AnnouncementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Announcement.objects.filter(is_active=True)
        
        # Filter based on user type
        if user.user_type == 'donor':
            queryset = queryset.filter(Q(target_audience='all') | Q(target_audience='donors'))
        elif user.user_type == 'recipient':
            queryset = queryset.filter(Q(target_audience='all') | Q(target_audience='recipients'))
        
        return queryset.order_by('-created_at')
