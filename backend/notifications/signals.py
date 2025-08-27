from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Notification
import json

@receiver(post_save, sender=Notification)
def notification_created(sender, instance, created, **kwargs):
    if created:
        channel_layer = get_channel_layer()
        group_name = f'notifications_{instance.user.id}'
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'notification_message',
                'notification': {
                    'id': instance.id,
                    'type': instance.type,
                    'message': instance.message,
                    'is_read': instance.is_read,
                    'created_at': instance.created_at.isoformat(),
                    'sender': {
                        'id': instance.sender.id,
                        'fullname': instance.sender.fullname
                    } if instance.sender else None,
                    'data': instance.data
                }
            }
        ) 