from django.db.models import Q

class ChatParticipantMixin:
    def get_chat_queryset(self, user):
        return Q(donor=user) | Q(recipient=user) 