from django.urls import path
from .views import (
    RegisterUserView, RegisterDonorView, RegisterRecipientView, 
    UserProfileView, CustomPasswordResetView
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import views as auth_views
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse
from django.views import View
from django.views.decorators.http import require_GET
from django.utils.decorators import method_decorator

@require_GET
@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({'detail': 'CSRF cookie set'})

urlpatterns = [
    path('register/', RegisterUserView.as_view(), name='register_user'),
    path('register/donor/', RegisterDonorView.as_view(), name='register_donor'),
    path('register/recipient/', RegisterRecipientView.as_view(), name='register_recipient'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'), 
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'), 
    path('user/', UserProfileView.as_view(), name='user_profile'),
    path('csrf/', get_csrf_token, name='csrf_token'),  # Simplified CSRF endpoint
    
    # Password reset URLs with custom view
    path('password_reset/', CustomPasswordResetView.as_view(
        template_name='registration/password_reset_form.html',
        email_template_name='registration/password_reset_email.html',
        subject_template_name='registration/password_reset_subject.txt'
    ), name='password_reset'),
    path('password_reset/done/', auth_views.PasswordResetDoneView.as_view(
        template_name='registration/password_reset_done.html'
    ), name='password_reset_done'),
    path('reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(
        template_name='registration/password_reset_confirm.html'
    ), name='password_reset_confirm'),
    path('reset/done/', auth_views.PasswordResetCompleteView.as_view(
        template_name='registration/password_reset_complete.html'
    ), name='password_reset_complete'),
]
