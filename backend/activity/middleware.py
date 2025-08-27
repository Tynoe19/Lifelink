from django.utils import timezone
from django.db import transaction
from .models import ActivityHistory
import json
import logging
import traceback

logger = logging.getLogger(__name__)

class ActivityLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Only log activities for authenticated users
        if request.user.is_authenticated:
            logger.info(f"Processing activity for user: {request.user.username}")
            logger.info(f"Request path: {request.path}")
            logger.info(f"Request method: {request.method}")

            try:
                # Get client IP
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    ip = x_forwarded_for.split(',')[0]
                else:
                    ip = request.META.get('REMOTE_ADDR')

                # Get device info
                user_agent = request.META.get('HTTP_USER_AGENT', '')
                device_info = f"{request.META.get('HTTP_USER_AGENT', 'Unknown Browser')}"

                # Get location from request headers or metadata
                location = None
                if 'HTTP_X_FORWARDED_FOR' in request.META:
                    location = request.META.get('HTTP_X_FORWARDED_FOR').split(',')[0]
                elif 'REMOTE_ADDR' in request.META:
                    location = request.META.get('REMOTE_ADDR')

                # Determine activity type based on the request
                activity_type = None
                description = None
                metadata = {}

                # Remove /api prefix for path matching
                path = request.path.replace('/api/', '/', 1)
                logger.info(f"Processing path: {path}")

                # Try to get request body for metadata
                try:
                    if request.body:
                        metadata = json.loads(request.body)
                except:
                    metadata = {}

                # Add request info to metadata
                metadata.update({
                    'method': request.method,
                    'path': request.path,
                    'timestamp': timezone.now().isoformat()
                })

                # Check for login/logout first
                if path.endswith('/token/'):
                    activity_type = 'login'
                    description = 'User logged in'
                elif path.endswith('/logout/'):
                    activity_type = 'logout'
                    description = 'User logged out'
                # Check for profile updates
                elif '/accounts/profile/' in path and request.method in ['PUT', 'PATCH']:
                    activity_type = 'profile_edited'
                    description = 'User updated their profile'
                # Check for organ-related activities
                elif '/organs/' in path:
                    if request.method == 'POST':
                        activity_type = 'organ_listed'
                        description = 'User created a new organ listing'
                    elif request.method == 'PUT':
                        activity_type = 'organ_edited'
                        description = 'User edited an organ listing'
                    elif request.method == 'DELETE':
                        activity_type = 'organ_deleted'
                        description = 'User deleted an organ listing'
                    elif 'unavailable' in path:
                        activity_type = 'organ_marked_unavailable'
                        description = 'User marked an organ as unavailable'
                # Check for request-related activities
                elif '/requests/' in path:
                    if request.method == 'POST':
                        activity_type = 'request_sent'
                        description = 'User sent a donation request'
                    elif 'accept' in path:
                        activity_type = 'request_accepted'
                        description = 'User accepted a donation request'
                    elif 'reject' in path:
                        activity_type = 'request_rejected'
                        description = 'User rejected a donation request'
                    elif 'cancel' in path:
                        activity_type = 'request_cancelled'
                        description = 'User cancelled a donation request'
                # Check for message activities
                elif '/chat/messages/' in path and request.method == 'POST':
                    activity_type = 'message_sent'
                    description = 'User sent a message'
                # Check for search activities
                elif '/search/' in path:
                    activity_type = 'search_performed'
                    description = 'User performed a search'

                # Log the activity if we have a type
                if activity_type:
                    logger.info(f"Creating activity: {activity_type} - {description}")
                    try:
                        with transaction.atomic():
                            activity = ActivityHistory.objects.create(
                                user=request.user,
                                activity_type=activity_type,
                                description=description,
                                ip_address=ip,
                                device_info=device_info,
                                location=location,
                                metadata=metadata
                            )
                            logger.info(f"Activity created successfully with ID: {activity.id}")
                    except Exception as e:
                        logger.error(f"Error creating activity: {str(e)}")
                        logger.error(f"Traceback: {traceback.format_exc()}")
                else:
                    logger.info(f"No activity type matched for request: {request.path} {request.method}")

            except Exception as e:
                logger.error(f"Unexpected error in activity middleware: {str(e)}")
                logger.error(f"Traceback: {traceback.format_exc()}")

        return response 