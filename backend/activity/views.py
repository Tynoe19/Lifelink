from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ActivityHistory
from .serializers import ActivityHistorySerializer
import logging

logger = logging.getLogger(__name__)

class ActivityHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = ActivityHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ActivityHistory.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def my_activities(self, request):
        activities = self.get_queryset()
        serializer = self.get_serializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'status': 'success'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        activity = self.get_object()
        activity.is_read = True
        activity.save()
        return Response({'status': 'success'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def test_activity(self, request):
        try:
            activity = ActivityHistory.objects.create(
                user=request.user,
                activity_type='login',
                description='Test activity',
                ip_address=request.META.get('REMOTE_ADDR'),
                device_info=request.META.get('HTTP_USER_AGENT', ''),
                metadata={'test': True}
            )
            logger.info(f"Test activity created with ID: {activity.id}")
            return Response({'status': 'success', 'activity_id': activity.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error creating test activity: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
