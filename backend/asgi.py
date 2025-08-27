import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.sessions import SessionMiddlewareStack
from backend.notifications.routing import websocket_urlpatterns as notifications_websocket_urlpatterns
from backend.donations.routing import websocket_urlpatterns as donations_websocket_urlpatterns
from backend.chat.routing import websocket_urlpatterns as chat_websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": SessionMiddlewareStack(
        AuthMiddlewareStack(
            URLRouter(
                notifications_websocket_urlpatterns + 
                donations_websocket_urlpatterns + 
                chat_websocket_urlpatterns
            )
        )
    ),
}) 