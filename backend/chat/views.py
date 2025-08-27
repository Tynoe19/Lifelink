from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from .models import ChatRoom, Message
from .serializers import ChatRoomSerializer, MessageSerializer
from backend.donations.models import Organ
from .permissions import IsChatParticipant
from .mixins import ChatParticipantMixin

# Create your views here.

class ChatRoomViewSet(ChatParticipantMixin, viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated, IsChatParticipant]

    def get_queryset(self):
        return ChatRoom.objects.filter(
            self.get_chat_queryset(self.request.user)
        ).order_by('-last_activity')

    def perform_create(self, serializer):
        organ_id = self.request.data.get('organ')
        try:
            organ = Organ.objects.get(id=organ_id)
            if self.request.user == organ.donor:
                raise PermissionDenied("Donors cannot create chat rooms")
            serializer.save(
                donor=organ.donor,
                recipient=self.request.user,
                organ=organ
            )
        except Organ.DoesNotExist:
            raise PermissionDenied("Invalid organ ID")

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        chat_room = self.get_object()
        serializer = MessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                chat_room=chat_room,
                sender=request.user
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        chat_room = self.get_object()
        messages = chat_room.messages.filter(is_read=False).exclude(sender=request.user)
        messages.update(is_read=True)
        return Response({'status': 'messages marked as read'})

class MessageViewSet(ChatParticipantMixin, viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated, IsChatParticipant]

    def get_queryset(self):
        return Message.objects.filter(
            chat_room__in=ChatRoom.objects.filter(
                self.get_chat_queryset(self.request.user)
            )
        ).order_by('timestamp')
