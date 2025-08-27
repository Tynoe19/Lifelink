from rest_framework import serializers
from .models import Organ, DonationRequest, RecipientRequest, OrganMatch, Connection
from backend.accounts.serializers import UserSerializer

class OrganSerializer(serializers.ModelSerializer):
    donor = UserSerializer(read_only=True)

    class Meta:
        model = Organ
        fields = '__all__'
        read_only_fields = ('donor', 'date_created', 'date_updated')

class DonationRequestSerializer(serializers.ModelSerializer):
    recipient = UserSerializer(read_only=True)
    organ = OrganSerializer(read_only=True)

    class Meta:
        model = DonationRequest
        fields = '__all__'
        read_only_fields = ('recipient', 'created_at', 'updated_at')

class RecipientRequestSerializer(serializers.ModelSerializer):
    recipient = UserSerializer(read_only=True)

    class Meta:
        model = RecipientRequest
        fields = '__all__'
        read_only_fields = ('recipient', 'date_created', 'date_updated')

class OrganMatchSerializer(serializers.ModelSerializer):
    organ = OrganSerializer(read_only=True)
    recipient_request = RecipientRequestSerializer(read_only=True)

    class Meta:
        model = OrganMatch
        fields = '__all__'
        read_only_fields = ('date_created', 'date_updated')

class ConnectionSerializer(serializers.ModelSerializer):
    donor = UserSerializer(read_only=True)
    recipient = UserSerializer(read_only=True)
    organ = OrganSerializer(read_only=True)

    class Meta:
        model = Connection
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')