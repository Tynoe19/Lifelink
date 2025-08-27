from django.db import models
from django.conf import settings
from django.utils import timezone
from backend.accounts.models import CustomUser
from .constants import OrganType, BloodType, RequestStatus, UrgencyLevel
from .utils import get_location_match_score, get_organ_age, find_matches
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.apps import apps
from .notifications import notify_potential_match
from .matching import find_matches

User = get_user_model()

class Organ(models.Model):
    """
    Model representing an organ available for donation.
    """
    donor = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='organs')
    organ_name = models.CharField(max_length=50, choices=OrganType.choices())
    blood_type = models.CharField(max_length=3, choices=BloodType.choices(), default=BloodType.O_POSITIVE.value)
    location = models.CharField(max_length=255)
    is_available = models.BooleanField(default=True)
    medical_history = models.TextField(blank=True, null=True)
    date_created = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)
    additional_notes = models.TextField(blank=True, null=True)
    alias = models.CharField(max_length=50, blank=True, null=True, help_text="Anonymous identifier for the donor")

    class Meta:
        ordering = ['-date_created']
        indexes = [
            models.Index(fields=['is_available']),
            models.Index(fields=['location']),
            models.Index(fields=['blood_type']),
        ]

    def __str__(self):
        return f"{self.organ_name} from {self.donor.fullname} ({'Available' if self.is_available else 'Not Available'})"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # If this is a new organ listing, check for potential matches
        if is_new and self.is_available:
            # Get models using apps.get_model to avoid circular imports
            RecipientRequest = apps.get_model('donations', 'RecipientRequest')
            
            # Find all recipient requests for this organ type
            recipient_requests = RecipientRequest.objects.filter(
                organ_type=self.organ_name,
                status='open'
            )
            
            # For each recipient request, find matches and notify if there's a high match
            for request in recipient_requests:
                find_matches(request)
                # The find_matches function will handle sending notifications for high-potential matches

    def mark_unavailable(self):
        """Mark the organ as unavailable"""
        self.is_available = False
        self.save()

    def is_match_for_recipient(self, recipient):
        """Check if this organ matches a recipient's criteria"""
        return (
            self.is_available and
            self.donor.blood_type == recipient.blood_type
        )

    @property
    def age(self):
        """Calculate how long the organ has been listed"""
        return get_organ_age(self.date_created)

    def get_location_match_score(self, recipient):
        """Calculate location match score for a recipient"""
        return get_location_match_score(self.location, recipient.city, recipient.country)

class DonationRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ]

    recipient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='donation_requests')
    organ = models.ForeignKey('Organ', on_delete=models.CASCADE, related_name='donation_requests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(blank=True, null=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Request from {self.recipient.get_full_name()} for {self.organ.organ_name}"

class RecipientRequest(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recipient_requests'
    )
    organ_type = models.CharField(max_length=50, choices=OrganType.choices(), null=True, blank=True)
    blood_type = models.CharField(max_length=3, choices=BloodType.choices())
    urgency_level = models.CharField(max_length=20, choices=UrgencyLevel.choices(), null=True, blank=True)
    location = models.CharField(max_length=255)
    message = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, default='open')  # open, matched, fulfilled, cancelled
    date_created = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_created']

    def __str__(self):
        return f"{self.organ_type} needed by {self.recipient.fullname} ({self.status})"

class OrganMatch(models.Model):
    """
    Model representing a match between an organ and a recipient request.
    """
    organ = models.ForeignKey(Organ, on_delete=models.CASCADE, related_name='matches')
    recipient_request = models.ForeignKey(RecipientRequest, on_delete=models.CASCADE, related_name='matches')
    match_score = models.DecimalField(max_digits=5, decimal_places=2)
    blood_type_match = models.JSONField()
    age_match = models.JSONField()
    height_match = models.JSONField()
    weight_match = models.JSONField(null=True, blank=True)
    location_match = models.JSONField()
    is_notified = models.BooleanField(default=False)
    date_created = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-match_score']
        indexes = [
            models.Index(fields=['match_score']),
            models.Index(fields=['organ', 'recipient_request']),
        ]
        unique_together = ['organ', 'recipient_request']

    def __str__(self):
        return f"Match {self.match_score}% between {self.organ.organ_name} and {self.recipient_request.recipient.fullname}"

    def get_match_details(self):
        """Get formatted match details"""
        details = {
            'blood_type_match': self.blood_type_match,
            'age_match': self.age_match,
            'height_match': self.height_match,
            'location_match': self.location_match
        }
        if self.weight_match:
            details['weight_match'] = self.weight_match
        return details

class Connection(models.Model):
    """
    Model representing a connection between a donor and recipient.
    """
    donor = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='donor_connections')
    recipient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='recipient_connections')
    organ = models.ForeignKey(Organ, on_delete=models.CASCADE, related_name='connections')
    status = models.CharField(max_length=20, default='active')  # active, completed, cancelled
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['donor', 'recipient']),
        ]

    def __str__(self):
        return f"Connection between {self.donor.fullname} and {self.recipient.fullname}"
