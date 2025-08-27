from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'backend.notifications'

    def ready(self):
        import backend.notifications.signals  # noqa
