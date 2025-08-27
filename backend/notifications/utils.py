from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Notification, NotificationPreferences
from django.contrib.auth import get_user_model

User = get_user_model()

def create_notification(recipient, notification_type, title, message, related_object_id=None, urgency_level='LOW', sender=None):
    """
    Create a notification and send it through WebSocket if the user has enabled in-app notifications
    """
    # Get or create user's notification preferences
    preferences, created = NotificationPreferences.objects.get_or_create(user=recipient)
    
    # Check if user has enabled notifications for this type
    if not preferences.get_notification_type_preference(notification_type):
        print(f"Notification skipped: User {recipient.id} has disabled {notification_type} notifications")
        return  # Skip notification if user has disabled this type
    
    # Check if user has enabled in-app notifications
    if not preferences.in_app_notifications:
        print(f"Notification skipped: User {recipient.id} has disabled in-app notifications")
        return  # Skip notification if user has disabled in-app notifications
    
    # Create the notification
    notification = Notification.objects.create(
        user=recipient,
        type=notification_type,
        message=message,
        sender=sender,
        data={
            'related_object_id': related_object_id,
            'urgency_level': urgency_level,
            'navigation_path': get_navigation_path(notification_type, related_object_id)
        }
    )

    # Send WebSocket notification
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'notifications_{recipient.id}',
        {
            'type': 'notification_message',
            'notification': {
                'id': notification.id,
                'type': notification.type,
                'message': notification.message,
                'is_read': notification.is_read,
                'created_at': notification.created_at.isoformat(),
                'sender': {
                    'id': notification.sender.id,
                    'fullname': notification.sender.fullname,
                    'user_type': notification.sender.user_type
                } if notification.sender else None,
                'data': notification.data
            }
        }
    )
    
    # TODO: Implement email notifications if preferences.email_notifications is True
    # TODO: Implement push notifications if preferences.push_notifications is True

def get_navigation_path(notification_type, related_object_id):
    """
    Get the navigation path for a notification based on its type
    """
    paths = {
        'message': f'/messages/{related_object_id}',
        'request': f'/organ-listings/{related_object_id}',
        'status_update': f'/donation-requests/{related_object_id}',
        'donation': f'/donations/{related_object_id}',
        'match': f'/matches/{related_object_id}',
        'organ_request': f'/organ-listings/{related_object_id}',
        'request_accepted': f'/donation-requests/{related_object_id}',
        'request_rejected': f'/donation-requests/{related_object_id}',
        'connection': f'/connections/{related_object_id}',
        'connection_accepted': f'/connections/{related_object_id}',
        'news': '/news'
    }
    return paths.get(notification_type, '/notifications')

def notify_new_message(message):
    """
    Create a notification when a new message is received
    """
    try:
        # Get the chat room and organ information
        chat_room = message.chat_room
        if not chat_room:
            # Fallback message if chat room is not available
            notification_message = 'You have received a new message'
        else:
            # Get organ information
            organ = chat_room.organ
            if organ:
                # Create organ-specific message
                notification_message = f'You have received a new message about your {organ.organ_name}'
            else:
                # Fallback message if organ is not available
                notification_message = 'You have received a new message about your organ request'
        
        create_notification(
            recipient=message.recipient,
            notification_type='message',
            title='New Message',
            message=notification_message,
            related_object_id=message.id,
            urgency_level='HIGH',
            sender=message.sender  # Pass the sender object for frontend processing
        )
    except Exception as e:
        # Log the error and create a generic notification
        print(f"Error creating notification: {str(e)}")
        create_notification(
            recipient=message.recipient,
            notification_type='message',
            title='New Message',
            message='You have received a new message',
            related_object_id=message.id,
            urgency_level='HIGH',
            sender=message.sender
        )

def notify_donation_request_created(request):
    """
    Create notifications for relevant users when a donation request is created
    """
    # Notify hospital staff
    hospital_staff = User.objects.filter(
        is_staff=True,
        hospital=request.hospital
    )
    
    for staff in hospital_staff:
        create_notification(
            recipient=staff,
            notification_type='request',
            title='New Donation Request',
            message=f'A new donation request has been created for {request.organ_type}',
            related_object_id=request.id,
            urgency_level=request.urgency_level
        )

def notify_request_status_update(request, old_status, new_status):
    """
    Create notifications when a donation request status is updated
    """
    # Notify the requester
    create_notification(
        recipient=request.requester,
        notification_type='status_update',
        title='Request Status Updated',
        message=f'Your donation request status has changed from {old_status} to {new_status}',
        related_object_id=request.id,
        urgency_level='MEDIUM'
    )

    # Notify hospital staff
    hospital_staff = User.objects.filter(
        is_staff=True,
        hospital=request.hospital
    )
    
    for staff in hospital_staff:
        create_notification(
            recipient=staff,
            notification_type='status_update',
            title='Request Status Updated',
            message=f'Donation request status changed from {old_status} to {new_status}',
            related_object_id=request.id,
            urgency_level='MEDIUM'
        ) 