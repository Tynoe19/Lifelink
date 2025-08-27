from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class ActivityHistory(models.Model):
    ACTIVITY_TYPES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('request_sent', 'Request Sent'),
        ('request_accepted', 'Request Accepted'),
        ('request_rejected', 'Request Rejected'),
        ('organ_listed', 'Organ Listed'),
        ('organ_edited', 'Organ Edited'),
        ('organ_deleted', 'Organ Deleted'),
        ('profile_edited', 'Profile Edited'),
        ('device_login', 'Login from New Device'),
        ('message_sent', 'Message Sent'),
        ('search_performed', 'Search Performed'),
        ('organ_marked_unavailable', 'Organ Marked Unavailable'),
        ('request_cancelled', 'Request Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_info = models.CharField(max_length=255, null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(null=True, blank=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = 'Activity Histories'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['activity_type']),
            models.Index(fields=['is_read']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.get_activity_type_display()} - {self.created_at}"