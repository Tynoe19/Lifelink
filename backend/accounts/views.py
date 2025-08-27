from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser
from .serializers import UserSerializer, DonorSerializer, RecipientSerializer, UserProfileSerializer
from rest_framework.views import APIView
from django.contrib.auth import views as auth_views
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator

User = get_user_model()

class RegisterUserView(generics.CreateAPIView):
    """ Generic user registration view (used for both donors and recipients) """
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        """ Custom create method to handle user type dynamically """
        user_type = request.data.get('user_type', '').lower()

        if not user_type in ['donor', 'recipient']:
            return Response(
                {"error": "Invalid user type. Must be either 'donor' or 'recipient'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user_type == 'donor':
            serializer = DonorSerializer(data=request.data)
        elif user_type == 'recipient':
            serializer = RecipientSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterDonorView(generics.CreateAPIView):
    """ Registration view specifically for donors """
    queryset = CustomUser.objects.filter(user_type='donor')
    serializer_class = DonorSerializer


class RegisterRecipientView(generics.CreateAPIView):
    """ Registration view specifically for recipients """
    queryset = CustomUser.objects.filter(user_type='recipient')
    serializer_class = RecipientSerializer
    
class UserProfileView(APIView):
    """View for getting and updating user profile"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get(self, request):
        """Get user profile"""
        try:
            serializer = self.serializer_class(request.user, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            print(f"Error in UserProfileView.get: {str(e)}")
            # Return a complete user profile with all fields
            try:
                # Get all fields from the user model
                user_data = {
                    'id': request.user.id,
                    'email': request.user.email,
                    'first_name': request.user.first_name,
                    'last_name': request.user.last_name,
                    'user_type': request.user.user_type,
                    'phone_number': str(request.user.phone_number) if request.user.phone_number else None,
                    'blood_type': request.user.blood_type,
                    'gender': request.user.gender,
                    'date_of_birth': request.user.date_of_birth,
                    'city': request.user.city,
                    'country': str(request.user.country) if request.user.country else None,
                    'address': request.user.address,
                    'postal_code': request.user.postal_code,
                    'latitude': str(request.user.latitude) if request.user.latitude else None,
                    'longitude': str(request.user.longitude) if request.user.longitude else None,
                    'weight': str(request.user.weight) if request.user.weight else None,
                    'height': str(request.user.height) if request.user.height else None,
                    'is_active': request.user.is_active,
                    'is_verified': request.user.is_verified,
                    'profile_complete': request.user.profile_complete,
                    'avatar': request.user.avatar.url if request.user.avatar else None
                }

                # Add recipient profile data if user is a recipient
                if request.user.user_type == 'recipient':
                    try:
                        recipient_profile = request.user.recipient_profile
                        if recipient_profile:
                            user_data['recipient_profile'] = {
                                'urgency_level': recipient_profile.urgency_level,
                                'organ_type': recipient_profile.organ_type,
                                'hospital_letter': recipient_profile.hospital_letter.url if recipient_profile.hospital_letter else None,
                                'recipient_image': recipient_profile.recipient_image.url if recipient_profile.recipient_image else None
                            }
                            user_data['urgency_level'] = recipient_profile.urgency_level
                            user_data['organ_type'] = recipient_profile.organ_type
                        else:
                            user_data['recipient_profile'] = None
                            user_data['urgency_level'] = None
                            user_data['organ_type'] = None
                    except Exception as profile_error:
                        print(f"Error getting recipient profile: {str(profile_error)}")
                        user_data['recipient_profile'] = None
                        user_data['urgency_level'] = None
                        user_data['organ_type'] = None
                else:
                    user_data['recipient_profile'] = None
                    user_data['urgency_level'] = None
                    user_data['organ_type'] = None

                return Response(user_data)
            except Exception as inner_e:
                print(f"Error in UserProfileView.get fallback: {str(inner_e)}")
                return Response(
                    {'error': 'Failed to retrieve user profile. Please try again.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

    def put(self, request):
        """Update user profile"""
        try:
            serializer = self.serializer_class(request.user, data=request.data, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Error in UserProfileView.put: {str(e)}")
            return Response(
                {'error': 'Failed to update user profile. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def patch(self, request):
        """Partially update user profile"""
        try:
            serializer = self.serializer_class(request.user, data=request.data, partial=True, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Error in UserProfileView.patch: {str(e)}")
            return Response(
                {'error': 'Failed to update user profile. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class LoginView(TokenObtainPairView):
    """View for user login"""
    serializer_class = TokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
            return response
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class CustomPasswordResetView(auth_views.PasswordResetView):
    def post(self, request, *args, **kwargs):
        email = request.POST.get('email') or request.body.decode('utf-8')
        
        # If the request body is JSON, parse it
        if request.content_type == 'application/json':
            import json
            try:
                data = json.loads(email)
                email = data.get('email')
            except json.JSONDecodeError:
                return JsonResponse(
                    {'detail': 'Invalid JSON data.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if not email:
            return JsonResponse(
                {'detail': 'Email is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user exists with this email
        if not User.objects.filter(email=email).exists():
            return JsonResponse(
                {'detail': 'No user found with this email address.'},
                status=status.HTTP_404_NOT_FOUND
            )
            
        # If user exists, proceed with password reset
        response = super().post(request, *args, **kwargs)
        
        # Return success response
        return JsonResponse(
            {'detail': 'Password reset email has been sent if an account exists with the email you entered.'},
            status=status.HTTP_200_OK
        )