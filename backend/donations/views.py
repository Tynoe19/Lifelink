from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, DjangoModelPermissions
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Case, When, F, Value, IntegerField
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction
from django.core.mail import send_mail
from django.conf import settings
from django.shortcuts import get_object_or_404
import logging

from backend.donations.models import Organ, DonationRequest, RecipientRequest, OrganMatch, Connection
from backend.donations.serializers import OrganSerializer, DonationRequestSerializer, RecipientRequestSerializer, OrganMatchSerializer, ConnectionSerializer
from backend.chat.models import ChatRoom, Message
from backend.chat.serializers import ChatRoomSerializer, MessageSerializer
from backend.donations.permissions import IsDonorOrReadOnly
from backend.donations.mixins import CacheMixin, TransactionMixin, ErrorHandlerMixin
from backend.donations.constants import BLOOD_TYPE_COMPATIBILITY, UrgencyLevel, CACHE_TTL, MATCHING_CONSTANTS
from backend.notifications.models import Notification
from backend.notifications.utils import create_notification
from .matching import find_matches, MatchCalculator
from backend.accounts.models import CustomUser as User
from backend.accounts.serializers import UserSerializer

logger = logging.getLogger(__name__)

class OrganViewSet(viewsets.ModelViewSet, CacheMixin, TransactionMixin, ErrorHandlerMixin):
    serializer_class = OrganSerializer
    permission_classes = [IsDonorOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['organ_name', 'blood_type', 'is_available', 'location']

    def get_queryset(self):
        cached_response = self.get_cached_response()
        if cached_response:
            return cached_response

        # If user is authenticated and is a donor, show all their organs
        if self.request.user.is_authenticated and self.request.user.user_type == 'donor':
            queryset = Organ.objects.filter(donor=self.request.user)
        else:
            # For other users, only show available organs
            queryset = Organ.objects.filter(is_available=True)
        
        # Filter by blood type if provided
        blood_type = self.request.query_params.get('blood_type', None)
        if blood_type:
            queryset = queryset.filter(blood_type=blood_type)
            
        # Filter by organ type if provided
        organ_type = self.request.query_params.get('organ_type', None)
        if organ_type:
            queryset = queryset.filter(organ_type=organ_type)
            
        self.set_cached_response(queryset)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(donor=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def request_organ(self, request, pk=None):
        def _request_organ():
            organ = get_object_or_404(Organ, pk=pk)
            
            if request.user.user_type != 'recipient':
                return self.handle_permission_denied('Only recipients can request organs.')
            
            if not organ.is_available:
                return self.handle_error('This organ is no longer available.')
            
            existing_request = DonationRequest.objects.filter(
                organ=organ,
                recipient=request.user,
                status__in=['pending', 'accepted']
            ).first()
            
            if existing_request:
                return self.handle_error('You have already requested this organ.')
            
            try:
                donation_request = DonationRequest.objects.create(
                    organ=organ,
                    recipient=request.user,
                    message=request.data.get('message', '')
                )
                
                # Create notification for the donor
                try:
                    logger.info(f"Attempting to create notification for donor {organ.donor.id}")
                    notif = Notification.objects.create(
                        user=organ.donor,
                        type='connection',
                        message=f"You have received a new donation request for your {organ.organ_name}",
                        sender=request.user,
                        data={'request_id': donation_request.id}
                    )
                    logger.info(f"Notification created successfully: {notif.id}")
                    
                    # Log the notification data
                    logger.info(f"Notification data - ID: {notif.id}, User: {notif.user.id}, Type: {notif.type}, Message: {notif.message}, Sender: {notif.sender.id}, Data: {notif.data}")
                except Exception as e:
                    logger.error(f"Failed to create notification: {e}")
                    logger.error(f"Error details: {str(e)}")
                
                serializer = DonationRequestSerializer(donation_request)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                logger.error(f"Error creating donation request: {str(e)}")
                return self.handle_error('Failed to create donation request.', status.HTTP_500_INTERNAL_SERVER_ERROR)

        return self.perform_in_transaction(_request_organ)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def find_matches(self, request):
        """Find potential matches for the current user"""
        try:
            # Check if user is a recipient
            if request.user.user_type != 'recipient':
                return Response(
                    {"error": "Only recipients can search for matches"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if user has completed their profile
            if not request.user.profile_complete:
                return Response(
                    {"error": "Please complete your profile before searching for matches"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get the recipient's active request
            recipient_request = RecipientRequest.objects.filter(
                recipient=request.user,
                status='open'
            ).first()

            if not recipient_request:
                return Response(
                    {"error": "Please create an organ request before searching for matches"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get all available organs matching the requested organ type
            available_organs = Organ.objects.filter(
                is_available=True,
                organ_name=recipient_request.organ_type
            )
            
            # Calculate match scores for each organ
            matches = []
            calculator = MatchCalculator()
            for organ in available_organs:
                try:
                    # Format location for comparison
                    donor_location = f"{organ.location}"
                    recipient_location = f"{request.user.city}, {request.user.country}"
                    
                    # Calculate individual scores
                    blood_score = calculator.calculate_blood_type_score(organ.blood_type, request.user.blood_type)
                    age_score = calculator.calculate_age_score(organ.donor.age, request.user.age)
                    height_score = calculator.calculate_height_score(organ.donor.height, request.user.height)
                    weight_score = calculator.calculate_weight_score(organ.donor.weight, request.user.weight)
                    location_score = calculator.calculate_location_score(donor_location, recipient_location)
                    
                    # Calculate weighted total score
                    total_score = (
                        blood_score * MATCHING_CONSTANTS['FACTOR_WEIGHTS']['BLOOD_TYPE'] +
                        age_score * MATCHING_CONSTANTS['FACTOR_WEIGHTS']['AGE'] +
                        height_score * MATCHING_CONSTANTS['FACTOR_WEIGHTS']['HEIGHT'] +
                        weight_score * MATCHING_CONSTANTS['FACTOR_WEIGHTS']['WEIGHT'] +
                        location_score * MATCHING_CONSTANTS['FACTOR_WEIGHTS']['LOCATION']
                    ) * 100
                    
                    # Create match details
                    match_details = {
                        'blood_type_match': {
                            'score': blood_score * 100,
                            'compatible': blood_score > 0
                        },
                        'age_match': {
                            'score': age_score * 100,
                            'difference': abs(organ.donor.age - request.user.age)
                        },
                        'height_match': {
                            'score': height_score * 100,
                            'difference': abs(organ.donor.height - request.user.height)
                        },
                        'weight_match': {
                            'score': weight_score * 100,
                            'difference': abs(organ.donor.weight - request.user.weight)
                        },
                        'location_match': {
                            'score': location_score * 100,
                            'distance': 'Same City' if location_score == 1.0 
                                      else 'Same Country' if location_score >= 0.7 
                                      else 'Far'
                        }
                    }
                    
                    matches.append({
                        'organ': OrganSerializer(organ).data,
                        'match_score': round(total_score, 2),
                        'match_details': match_details
                    })
                except Exception as e:
                    logger.error(f"Error calculating match score for organ {organ.id}: {str(e)}")
                    continue
            
            # Sort matches by score in descending order
            matches.sort(key=lambda x: x['match_score'], reverse=True)
            
            return Response({
                'matches': matches,
                'total_matches': len(matches)
            })

        except Exception as e:
            logger.error(f"Error finding matches: {str(e)}")
            return Response(
                {"error": "An error occurred while finding matches"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def mark_unavailable(self, request, pk=None):
        organ = self.get_object()
        if organ.donor != request.user:
            return Response(
                {"error": "You can only mark your own organs as unavailable"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        organ.is_available = False
        organ.save()
        return Response({'status': 'organ marked as unavailable'})

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def chat_history(self, request, pk=None):
        organ = self.get_object()
        if request.user not in [organ.donor, organ.recipient]:
            return Response(
                {"error": "You don't have permission to view this chat"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            chat_room = ChatRoom.objects.get(
                organ=organ,
                donor=organ.donor,
                recipient=organ.recipient
            )
            
            messages = Message.objects.filter(chat_room=chat_room, sender__isnull=False).order_by('timestamp')
            message_serializer = MessageSerializer(messages, many=True)
            
            return Response({
                'chat_room': ChatRoomSerializer(chat_room).data,
                'messages': message_serializer.data
            })
        except ChatRoom.DoesNotExist:
            return Response(
                {'error': 'No chat room found for this donation'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def send_message(self, request, pk=None):
        organ = self.get_object()
        if request.user not in [organ.donor, organ.recipient]:
            return Response(
                {"error": "You don't have permission to send messages in this chat"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            chat_room = ChatRoom.objects.get(
                organ=organ,
                donor=organ.donor,
                recipient=organ.recipient
            )
            
            message = Message.objects.create(
                chat_room=chat_room,
                sender=request.user,
                content=request.data.get('content', '')
            )
            
            chat_room.last_activity = timezone.now()
            chat_room.save()
            
            return Response({
                'status': 'message_sent',
                'message': MessageSerializer(message).data
            })
        except ChatRoom.DoesNotExist:
            return Response(
                {'error': 'No chat room found for this donation'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def donor_info(self, request, pk=None):
        organ = self.get_object()
        if not organ.is_available:
            return Response(
                {"error": "This organ is no longer available"},
                status=status.HTTP_400_BAD_REQUEST
            )

        donor = organ.donor
        donor_info = {
            'age': donor.age,
            'gender': donor.gender,
            'blood_type': donor.blood_type,
            'city': donor.city,
            'last_updated': organ.updated_at,
            'medical_history': organ.medical_history
        }
        return Response(donor_info)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Advanced search for organs with multiple filters
        """
        try:
            logger.info(f"Search request received with params: {request.query_params}")
            queryset = Organ.objects.filter(is_available=True)
            
            # Blood type filter
            blood_type = request.query_params.get('blood_type')
            if blood_type:
                logger.info(f"Filtering by blood type: {blood_type}")
                queryset = queryset.filter(blood_type=blood_type)
            
            # Organ type filter
            organ_type = request.query_params.get('organ_type')
            if organ_type:
                logger.info(f"Filtering by organ type: {organ_type}")
                queryset = queryset.filter(organ_name__iexact=organ_type)
            
            # Location filter
            location = request.query_params.get('location')
            if location:
                logger.info(f"Filtering by location: {location}")
                queryset = queryset.filter(location__icontains=location)
            
            # Age range filter
            min_age = request.query_params.get('min_age')
            max_age = request.query_params.get('max_age')
            if min_age:
                try:
                    min_age = int(min_age)
                    logger.info(f"Filtering by min age: {min_age}")
                    queryset = queryset.filter(donor__age__gte=min_age)
                except ValueError:
                    return Response(
                        {'error': 'Invalid minimum age value'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            if max_age:
                try:
                    max_age = int(max_age)
                    logger.info(f"Filtering by max age: {max_age}")
                    queryset = queryset.filter(donor__age__lte=max_age)
                except ValueError:
                    return Response(
                        {'error': 'Invalid maximum age value'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Urgency level filter
            urgency_level = request.query_params.get('urgency_level')
            if urgency_level:
                logger.info(f"Filtering by urgency level: {urgency_level}")
                # Check if the donor exists and has the specified urgency level
                queryset = queryset.filter(
                    Q(donor__isnull=False) & 
                    Q(donor__urgency_level__iexact=urgency_level)
                )
            
            # Sort by various criteria
            sort_by = request.query_params.get('sort_by', 'date_created')
            if sort_by == 'date_created':
                queryset = queryset.order_by('-date_created')
            elif sort_by == 'urgency':
                queryset = queryset.order_by('-donor__urgency_level')
            elif sort_by == 'age':
                queryset = queryset.order_by('donor__age')
            
            # For recipients, calculate match scores using the new matching system
            if request.user.user_type == 'recipient':
                try:
                    recipient_request = RecipientRequest.objects.get(
                        recipient=request.user,
                        status='open'
                    )
                    matches = find_matches(recipient_request)
                    # Create a map of organ IDs to match scores
                    match_map = {match.organ.id: match for match in matches}
                    
                    # Filter and sort results based on match scores
                    results = []
                    for organ in queryset:
                        if organ.id in match_map:
                            match = match_map[organ.id]
                            organ_data = self.get_serializer(organ).data
                            organ_data.update({
                                'match_score': round(match.match_score, 2),
                                'match_details': match.match_details
                            })
                            results.append(organ_data)
                    
                    # Sort by match score
                    results.sort(key=lambda x: x['match_score'], reverse=True)
                    return Response(results)
                except RecipientRequest.DoesNotExist:
                    logger.info("No active recipient request found for match scoring")
            
            # For non-recipients or if no active request exists, return basic results
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error in organ search: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_requests(self, request):
        """Get all requests for the donor's organs"""
        if request.user.user_type != 'donor':
            return Response(
                {"error": "Only donors can view requests for their organs"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        requests = DonationRequest.objects.filter(
            organ__donor=request.user
        ).select_related('organ', 'recipient').order_by('-created_at')
        
        serializer = DonationRequestSerializer(requests, many=True)
        return Response(serializer.data)

class DonationRequestViewSet(viewsets.ModelViewSet, TransactionMixin, ErrorHandlerMixin):
    permission_classes = [IsAuthenticated]
    serializer_class = DonationRequestSerializer

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'recipient':
            return DonationRequest.objects.filter(recipient=user)
        elif user.user_type == 'donor':
            return DonationRequest.objects.filter(organ__donor=user)
        return DonationRequest.objects.none()

    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """Get requests for the current user"""
        if request.user.user_type == 'recipient':
            requests = DonationRequest.objects.filter(recipient=request.user)
        else:
            requests = DonationRequest.objects.filter(organ__donor=request.user)
        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Create a new donation request"""
        if request.user.user_type != 'recipient':
            return Response(
                {'error': 'Only recipients can create donation requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save(recipient=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a donation request and create a connection and chat room"""
        def _accept_request():
            donation_request = self.get_object()
            if request.user.user_type != 'donor' or donation_request.organ.donor != request.user:
                return Response(
                    {'error': 'Only the organ donor can accept requests'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Update donation request status
            donation_request.status = 'accepted'
            donation_request.save()

            # Create a connection
            connection = Connection.objects.create(
                donor=request.user,
                recipient=donation_request.recipient,
                organ=donation_request.organ,
                status='active'
            )

            # Create a chat room
            chat_room = ChatRoom.objects.create(
                donor=request.user,
                recipient=donation_request.recipient,
                organ=donation_request.organ,
                status='active'
            )

            # Create notifications
            create_notification(
                recipient=donation_request.recipient,
                notification_type='connection',
                title='Donation Request Accepted',
                message=f"Your request for {donation_request.organ.organ_name} has been accepted.",
                related_object_id=connection.id
            )

            # Note: We no longer mark the organ as unavailable
            # donation_request.organ.is_available = False
            # donation_request.organ.save()

            return Response({
                'donation_request': self.get_serializer(donation_request).data,
                'connection_id': connection.id,
                'chat_room_id': chat_room.id
            })

        return self.perform_in_transaction(_accept_request)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a donation request"""
        donation_request = self.get_object()
        if request.user.user_type != 'donor' or donation_request.organ.donor != request.user:
            return Response(
                {'error': 'Only the organ donor can reject requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        donation_request.status = 'rejected'
        donation_request.save()
        return Response(self.get_serializer(donation_request).data)

class RecipientRequestViewSet(viewsets.ModelViewSet):
    queryset = RecipientRequest.objects.all()
    serializer_class = RecipientRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Recipients see only their own requests
        return RecipientRequest.objects.filter(recipient=self.request.user)

    def perform_create(self, serializer):
        serializer.save(recipient=self.request.user)

    @action(detail=True, methods=['get'])
    def potential_matches(self, request, pk=None):
        recipient_request = self.get_object()
        
        # Find matches using the new matching system
        matches = find_matches(recipient_request)
        
        # Prepare response data
        response_data = []
        for match in matches:
            organ_data = OrganSerializer(match.organ).data
            organ_data.update({
                'match_score': round(match.match_score, 2),
                'match_details': match.match_details
            })
            response_data.append(organ_data)
            
            # Notify both recipient and donor for high-potential matches
            if match.match_score >= 85:
                # Notify recipient
                create_notification(
                    recipient=recipient_request.recipient,
                    notification_type='match',
                    title='High Potential Organ Match',
                    message=f"A {match.organ.organ_name} is a {match.match_score}% match for your request.",
                    related_object_id=match.organ.id,
                    urgency_level=match.organ.donor.urgency_level if hasattr(match.organ.donor, 'urgency_level') else 'LOW'
                )
                # Notify donor
                create_notification(
                    recipient=match.organ.donor,
                    notification_type='match',
                    title='High Potential Recipient Match',
                    message=f"Your {match.organ.organ_name} matches a recipient's request at {match.match_score}% potential.",
                    related_object_id=recipient_request.id,
                    urgency_level=match.organ.donor.urgency_level if hasattr(match.organ.donor, 'urgency_level') else 'LOW'
                )
        
        return Response(response_data)

class ConnectionViewSet(viewsets.ModelViewSet, ErrorHandlerMixin):
    queryset = Connection.objects.all()
    serializer_class = ConnectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Connection.objects.filter(
            Q(donor=user) | Q(recipient=user)
        ).select_related('donor', 'recipient')

    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        connection = self.get_object()
        serializer = self.get_serializer(connection)
        return Response(serializer.data)

class UserViewSet(viewsets.ModelViewSet, ErrorHandlerMixin):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'])
    def preferred_hospitals(self, request, pk=None):
        user = self.get_object()
        # Get hospitals from user's donation requests or recipient requests
        if user.user_type == 'donor':
            hospitals = Hospital.objects.filter(
                donationrequest__donor=user,
                is_active=True
            ).distinct()
        else:
            hospitals = Hospital.objects.filter(
                recipientrequest__recipient=user,
                is_active=True
            ).distinct()
        
        serializer = HospitalSerializer(hospitals, many=True)
        return Response(serializer.data)

