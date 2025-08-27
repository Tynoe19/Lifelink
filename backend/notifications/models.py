from django.db import models
from django.contrib.auth import get_user_model
from backend.donations.constants import UrgencyLevel  # Import from where it's defined

User = get_user_model()

class NotificationPreferences(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    in_app_notifications = models.BooleanField(default=True)
    notification_types = models.JSONField(default=dict)  # Store preferences for different notification types

    def __str__(self):
        return f"Notification preferences for {self.user.email}"

    def save(self, *args, **kwargs):
        # Set default notification type preferences if not set
        if not self.notification_types:
            self.notification_types = {
                'organ_request': True,
                'request_accepted': True,
                'request_rejected': True,
                'message': True,
                'connection': True,
                'connection_accepted': True,
                'news': True
            }
        super().save(*args, **kwargs)

    def update_notification_type(self, notification_type, enabled):
        """
        Update preference for a specific notification type
        """
        if not self.notification_types:
            self.notification_types = {}
        self.notification_types[notification_type] = enabled
        self.save()

    def get_notification_type_preference(self, notification_type):
        """
        Get preference for a specific notification type
        Returns True if enabled, False if disabled or not set
        """
        return self.notification_types.get(notification_type, True)

    def update_multiple_notification_types(self, preferences_dict):
        """
        Update multiple notification type preferences at once
        """
        if not self.notification_types:
            self.notification_types = {}
        self.notification_types.update(preferences_dict)
        self.save()

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('organ_request', 'Organ Request'),
        ('request_accepted', 'Request Accepted'),
        ('request_rejected', 'Request Rejected'),
        ('message', 'New Message'),
        ('connection', 'Connection Request'),
        ('connection_accepted', 'Connection Accepted'),
        ('news', 'News/Update'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    data = models.JSONField(default=dict, blank=True)  # For additional data like chat room ID, etc.

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_type_display()} for {self.user.username}"

class Announcement(models.Model):
    title = models.CharField(max_length=200)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_announcements')
    is_active = models.BooleanField(default=True)
    target_audience = models.CharField(
        max_length=20,
        choices=[
            ('all', 'All Users'),
            ('donors', 'Donors Only'),
            ('recipients', 'Recipients Only'),
        ],
        default='all'
    )
    # Add media fields
    image = models.ImageField(upload_to='announcements/images/', null=True, blank=True)
    video = models.FileField(upload_to='announcements/videos/', null=True, blank=True)
    media_type = models.CharField(
        max_length=10,
        choices=[
            ('none', 'No Media'),
            ('image', 'Image'),
            ('video', 'Video'),
        ],
        default='none'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_target_audience_display()})"

    def save(self, *args, **kwargs):
        # Set media type based on uploaded files
        if self.image:
            self.media_type = 'image'
        elif self.video:
            self.media_type = 'video'
        else:
            self.media_type = 'none'

        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            # Create notifications for all relevant users
            users = User.objects.all()
            if self.target_audience == 'donors':
                users = users.filter(user_type='donor')
            elif self.target_audience == 'recipients':
                users = users.filter(user_type='recipient')
            
            for user in users:
                Notification.objects.create(
                    user=user,
                    type='news',
                    message=self.message,
                    data={'announcement_id': self.id, 'title': self.title}
                )
