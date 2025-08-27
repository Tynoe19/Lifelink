from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrganViewSet, DonationRequestViewSet,
    RecipientRequestViewSet, ConnectionViewSet,
    UserViewSet
)

router = DefaultRouter()
router.register(r'organs', OrganViewSet, basename='organ')
router.register(r'donation-requests', DonationRequestViewSet, basename='donation-request')
router.register(r'recipient-requests', RecipientRequestViewSet)
router.register(r'connections', ConnectionViewSet)
router.register(r'users', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
