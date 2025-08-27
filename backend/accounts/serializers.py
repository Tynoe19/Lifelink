from rest_framework import serializers
from .models import CustomUser, RecipientProfile
from django_countries.serializers import CountryFieldMixin
from django.core.validators import validate_email
from django.contrib.auth import get_user_model
from backend.donations.models import RecipientRequest
User = get_user_model() 

class RecipientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecipientProfile
        fields = ['urgency_level', 'organ_type', 'hospital_letter']
        extra_kwargs = {
            'urgency_level': {'required': False},
            'organ_type': {'required': False},
            'hospital_letter': {'required': False}
        }

    def validate_urgency_level(self, value):
        if value:
            valid_levels = ['low', 'medium', 'high', 'critical']
            if value not in valid_levels:
                raise serializers.ValidationError(f"Invalid urgency level. Must be one of: {', '.join(valid_levels)}")
        return value

    def validate_organ_type(self, value):
        if value:
            valid_types = ['kidney', 'liver', 'heart', 'lung', 'pancreas', 'intestine']
            if value not in valid_types:
                raise serializers.ValidationError(f"Invalid organ type. Must be one of: {', '.join(valid_types)}")
        return value

class UserProfileSerializer(CountryFieldMixin, serializers.ModelSerializer):
    """Serializer for updating user profile without password fields"""
    recipient_profile = RecipientProfileSerializer(required=False)
    profile_complete = serializers.BooleanField(read_only=True)
    phone_number = serializers.CharField(required=False)  # Change to CharField
    avatar = serializers.ImageField(required=False, allow_null=True)  # Make avatar optional
    fullname = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id',
            'first_name',
            'last_name',
            'fullname',
            'email', 
            'phone_number', 
            'blood_type', 
            'city', 
            'country',
            'address',
            'postal_code',
            'latitude',
            'longitude',
            'gender',
            'date_of_birth',
            'weight',
            'height',
            'is_active',
            'user_type',
            'recipient_profile',
            'profile_complete',
            'avatar'
        ]
        read_only_fields = [
            'user_type', 
            'profile_complete',
            'blood_type',  # Make blood type read-only
            # Removed email, phone number, and location fields to allow editing
        ]

    def validate(self, data):
        """Validate required fields based on user type"""
        if data.get('user_type') == 'recipient':
            # For recipients, only validate weight and height if they're being updated
            if 'weight' in data and not data.get('weight'):
                raise serializers.ValidationError("Weight is required")
            if 'height' in data and not data.get('height'):
                raise serializers.ValidationError("Height is required")
        else:
            # For donors, only validate weight and height if they're being updated
            if 'weight' in data and not data.get('weight'):
                raise serializers.ValidationError("Weight is required")
            if 'height' in data and not data.get('height'):
                raise serializers.ValidationError("Height is required")
        
        return data

    def validate_country(self, value):
        """Ensure country is Northern Cyprus"""
        if str(value) != 'CY':
            raise serializers.ValidationError("Only Northern Cyprus locations are allowed")
        return value

    def validate_city(self, value):
        """Ensure city is a valid Northern Cyprus city"""
        valid_cities = [
            'Nicosia (Lefkoşa)', 'Kyrenia (Girne)', 'Famagusta (Gazimağusa)',
            'Morphou (Güzelyurt)', 'Iskele (Trikomo)', 'Lefke', 'Lapithos (Lapta)',
            'Karavas (Alsancak)', 'Kythrea (Değirmenlik)', 'Larnaca (Larnaka)',
            'Paphos (Baf)', 'Limassol (Limasol)'
        ]
        if value not in valid_cities:
            raise serializers.ValidationError("Please select a valid city in Northern Cyprus")
        return value

    def to_representation(self, instance):
        """Customize the representation based on user type"""
        try:
            # Get the base representation with all fields
            data = super().to_representation(instance)
            
            # Convert PhoneNumber to string
            if instance.phone_number:
                data['phone_number'] = str(instance.phone_number)
            
            # Define all possible fields that should be in the response
            all_fields = [
                'id', 'email', 'first_name', 'last_name', 'user_type',
                'phone_number', 'blood_type', 'gender', 'date_of_birth',
                'city', 'country', 'address', 'postal_code',
                'latitude', 'longitude', 'weight', 'height',
                'is_active', 'profile_complete'
            ]
            
            # Ensure all fields are present with their values from the instance
            for field in all_fields:
                value = getattr(instance, field, None)
                if value is not None:
                    if field == 'phone_number':
                        data[field] = str(value)
                    else:
                        data[field] = value
                elif field not in data:
                    data[field] = None
            
            # Handle avatar field separately
            try:
                if instance.avatar and hasattr(instance.avatar, 'url'):
                    data['avatar'] = instance.avatar.url
                else:
                    data['avatar'] = None
            except (ValueError, AttributeError):
                data['avatar'] = None
            
            # Ensure location data is consistent
            if instance.city and instance.country:
                data['city'] = instance.city
                data['country'] = str(instance.country)
                data['address'] = instance.address
                data['postal_code'] = instance.postal_code
                data['latitude'] = instance.latitude
                data['longitude'] = instance.longitude
            
            # Add recipient profile data if user is a recipient
            if instance.user_type == 'recipient':
                try:
                    # Always get or create recipient profile
                    recipient_profile, created = RecipientProfile.objects.get_or_create(
                        user=instance,
                        defaults={
                            'urgency_level': None,
                            'organ_type': None,
                            'hospital_letter': None
                        }
                    )
                    
                    # Always include recipient profile data
                    data['recipient_profile'] = {
                        'urgency_level': recipient_profile.urgency_level,
                        'organ_type': recipient_profile.organ_type,
                        'hospital_letter': recipient_profile.hospital_letter.url if recipient_profile.hospital_letter else None,
                        'recipient_image': recipient_profile.recipient_image.url if recipient_profile.recipient_image else None
                    }
                    
                    # Also include these fields at the top level for backward compatibility
                    data['urgency_level'] = recipient_profile.urgency_level
                    data['organ_type'] = recipient_profile.organ_type
                except Exception as e:
                    print(f"Error handling recipient profile: {str(e)}")
                    # Provide default values if there's an error
                    data['recipient_profile'] = {
                        'urgency_level': None,
                        'organ_type': None,
                        'hospital_letter': None,
                        'recipient_image': None
                    }
                    data['urgency_level'] = None
                    data['organ_type'] = None
            else:
                data['recipient_profile'] = None
                data['urgency_level'] = None
                data['organ_type'] = None
            
            return data
        except Exception as e:
            print(f"Error in UserProfileSerializer.to_representation: {str(e)}")
            # Return a safe default representation with all fields
            data = super().to_representation(instance)
            # Handle avatar field in error case
            try:
                if instance.avatar and hasattr(instance.avatar, 'url'):
                    data['avatar'] = instance.avatar.url
                else:
                    data['avatar'] = None
            except (ValueError, AttributeError):
                data['avatar'] = None
            return data

    def update(self, instance, validated_data):
        try:
            recipient_profile_data = validated_data.pop('recipient_profile', None)
            
            # Update user fields, including location fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            
            # Save the updated user instance
            instance.save()
            
            # Update recipient profile if user is a recipient
            if instance.user_type == 'recipient':
                recipient_profile, created = RecipientProfile.objects.get_or_create(user=instance)
                
                # Update recipient profile fields
                if recipient_profile_data:
                    for attr, value in recipient_profile_data.items():
                        if value is not None:
                            setattr(recipient_profile, attr, value)
                    recipient_profile.save()

                # Update or create recipient request with consistent location data from the updated instance
                recipient_request, created = RecipientRequest.objects.get_or_create(
                    recipient=instance,
                    defaults={
                        'organ_type': recipient_profile.organ_type if recipient_profile else None,
                        'blood_type': instance.blood_type,
                        'urgency_level': recipient_profile.urgency_level if recipient_profile else None,
                        'location': f"{instance.city}, {instance.country}" if instance.city and instance.country else None
                    }
                )
                if not created:
                    recipient_request.organ_type = recipient_profile.organ_type if recipient_profile else None
                    recipient_request.blood_type = instance.blood_type
                    recipient_request.urgency_level = recipient_profile.urgency_level if recipient_profile else None
                    recipient_request.location = f"{instance.city}, {instance.country}" if instance.city and instance.country else None
                    recipient_request.save()
            
            return instance
        except Exception as e:
            print(f"Error in UserProfileSerializer.update: {str(e)}")
            raise

    def get_fullname(self, obj):
        return f"{obj.first_name} {obj.last_name}"

class UserSerializer(CountryFieldMixin, serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True, min_length=8)
    email = serializers.EmailField(validators = [validate_email])
    country = serializers.CharField(required=True)
    recipient_profile = RecipientProfileSerializer(required=False)
    phone_number = serializers.CharField(required=True)  # Change to CharField
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 
            'gender', 'date_of_birth', 'blood_type', 'user_type', 'country', 'city', 
            'phone_number', 'recipient_profile', 'address', 'postal_code', 'latitude', 
            'longitude'
        ]
        extra_kwargs = {
            'password': {'write_only': True}, 
            'password_confirm': {'write_only': True},
            'address': {'required': True},
            'postal_code': {'required': True},
            'latitude': {'required': True},
            'longitude': {'required': True}
        }

    def to_representation(self, instance):
        """Convert instance to representation"""
        data = super().to_representation(instance)
        # Convert PhoneNumber to string
        if instance.phone_number:
            data['phone_number'] = str(instance.phone_number)
        # Convert Country to string
        if instance.country:
            data['country'] = str(instance.country)
        return data

    def validate_email(self, value):
        try:
            validate_email(value)  # Basic format check
        except:
            raise serializers.ValidationError("Invalid email format.")

        valid_domains = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "example.org"]
        domain = value.split("@")[-1]

        if domain not in valid_domains:
            raise serializers.ValidationError("Invalid email domain, use a valid domain")
        return value
    
    def validate_country(self, value):
        """Ensure country is a valid ISO 3166-1 alpha-2 code"""
        from django_countries import countries
        value = value.strip().upper()
        
        # Map common country names to their codes
        country_mapping = {
            'NORTHERN CYPRUS': 'CY',
            'CYPRUS': 'CY',
            'TRNC': 'CY',
            'TURKISH REPUBLIC OF NORTHERN CYPRUS': 'CY',
            'TURKISH CYPRIOT STATE': 'CY'
        }
        
        # Check if the input is a mapped country name
        if value in country_mapping:
            return country_mapping[value]
            
        # Check if it's a valid country code
        if value in countries.countries:
            return value
            
        raise serializers.ValidationError(
            "Invalid country. Please use a valid country code (e.g., 'CY' for Cyprus) or a recognized country name."
        )

    def validate_city(self, value):
        """Ensure city is not empty"""
        if not value.strip():
            raise serializers.ValidationError("City cannot be empty.")
        return value
    
    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        
        # Validate location data
        if not all([
            data.get('latitude'),
            data.get('longitude'),
            data.get('address'),
            data.get('postal_code')
        ]):
            raise serializers.ValidationError("Please provide complete location information.")
        
        return data

    def create(self, validated_data):
        recipient_profile_data = validated_data.pop('recipient_profile', None)
        validated_data.pop("password_confirm", None)  
        password = validated_data.pop("password", None) 
        if not password:  
            raise serializers.ValidationError({"password": "Password is required."})

        # Ensure first_name and last_name are set
        if not validated_data.get('first_name') or not validated_data.get('last_name'):
            raise serializers.ValidationError({"name": "First name and last name are required."})

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        # Only create recipient profile if user is a recipient and profile doesn't exist
        if user.user_type == 'recipient':
            try:
                RecipientProfile.objects.get(user=user)
            except RecipientProfile.DoesNotExist:
                RecipientProfile.objects.create(
                    user=user,
                    urgency_level=recipient_profile_data.get('urgency_level') if recipient_profile_data else None,
                    organ_type=recipient_profile_data.get('organ_type') if recipient_profile_data else None,
                    hospital_letter=recipient_profile_data.get('hospital_letter') if recipient_profile_data else None
                )

        return user

class DonorSerializer(UserSerializer):  # Extends UserSerializer
    class Meta(UserSerializer.Meta):
        fields = [f for f in UserSerializer.Meta.fields if f != 'recipient_profile'] + ['is_verified']

class RecipientSerializer(UserSerializer):  # Extends UserSerializer
    hospital_letter = serializers.FileField(required=False, allow_null=True)

    class Meta(UserSerializer.Meta):
        fields = [f for f in UserSerializer.Meta.fields if f not in ['urgency_level', 'organ_type']] + ['is_verified', 'hospital_letter']

    def create(self, validated_data):
        # Extract recipient-specific fields
        hospital_letter = validated_data.pop('hospital_letter', None)

        # Create the user first
        user = super().create(validated_data)
        
        # Create or update the recipient profile
        recipient_profile, created = RecipientProfile.objects.get_or_create(
            user=user,
            defaults={
                'hospital_letter': hospital_letter,
                'urgency_level': None,
                'organ_type': None
            }
        )
        
        if not created:
            if hospital_letter is not None:
                recipient_profile.hospital_letter = hospital_letter
            recipient_profile.save()
        
        return user

    def update(self, instance, validated_data):
        # Handle recipient-specific fields
        hospital_letter = validated_data.pop('hospital_letter', None)
        
        # Update the user
        user = super().update(instance, validated_data)
        
        # Update recipient profile
        recipient_profile, created = RecipientProfile.objects.get_or_create(user=user)
        if hospital_letter is not None:
            recipient_profile.hospital_letter = hospital_letter
        recipient_profile.save()
        
        return user


    






