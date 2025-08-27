from django.contrib import admin
from .models import Notification, NotificationPreferences, Announcement

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'target_audience', 'created_at', 'is_active', 'created_by', 'media_type')
    list_filter = ('target_audience', 'is_active', 'created_at', 'media_type')
    search_fields = ('title', 'message')
    readonly_fields = ('created_at', 'media_type')
    fieldsets = (
        (None, {
            'fields': ('title', 'message', 'target_audience', 'is_active')
        }),
        ('Media Content', {
            'fields': ('image', 'video'),
            'description': 'Upload either an image or a video. If both are uploaded, the image will take precedence.'
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'media_type'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # If creating new announcement
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'message', 'is_read', 'created_at')
    list_filter = ('type', 'is_read', 'created_at')
    search_fields = ('user__email', 'message')
    readonly_fields = ('created_at',)

@admin.register(NotificationPreferences)
class NotificationPreferencesAdmin(admin.ModelAdmin):
    list_display = ('user', 'email_notifications', 'push_notifications', 'in_app_notifications')
    list_filter = ('email_notifications', 'push_notifications', 'in_app_notifications')
    search_fields = ('user__email',)
