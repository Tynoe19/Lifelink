from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class ChatRoom(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ]

    donor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='donor_chats')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recipient_chats')
    organ = models.ForeignKey('donations.Organ', on_delete=models.CASCADE, related_name='chats')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['donor', 'recipient', 'organ']
        ordering = ['-last_activity']

    def __str__(self):
        return f"Chat for {self.organ.organ_name} between {self.donor.fullname} and {self.recipient.fullname}"

class Message(models.Model):
    chat_room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"Message from {self.sender.fullname} in {self.chat_room}"
