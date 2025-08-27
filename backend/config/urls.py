from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('backend.accounts.urls')),
    path('api/donations/', include('backend.donations.urls')),
    path('api/chat/', include('backend.chat.urls')),
    path('api/notifications/', include('backend.notifications.urls')),
    path('api/activity/', include('backend.activity.urls')),
] 