from django.db import models
from django.core.validators import EmailValidator
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
from phonenumber_field.modelfields import PhoneNumberField 
from django_countries.fields import CountryField

class CustomUserManager(BaseUserManager):
    def create_user(self, email, first_name, last_name, gender, date_of_birth, blood_type, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")

        user = self.model(
            email=self.normalize_email(email),
            first_name=first_name,
            last_name=last_name,
            gender=gender,
            date_of_birth=date_of_birth,
            blood_type=blood_type,
            **extra_fields
        )
        if password:
            user.set_password(password)
        else:
            raise ValueError("A password must be provided")
        user.save(using=self._db)
        return user

    def create_superuser(self, email, first_name, last_name, gender, date_of_birth, blood_type, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('user_type', 'admin')

        return self.create_user(
            email=email,
            first_name=first_name,
            last_name=last_name,
            gender=gender,
            date_of_birth=date_of_birth,
            blood_type=blood_type,
            password=password,
            **extra_fields
        )

class CustomUser(AbstractUser):
    USER_TYPES = [
        ('donor', 'Donor'),
        ('recipient', 'Recipient'),
        ('admin', 'Administrator'),
    ]

    BLOOD_TYPES = [
        ('A+', 'A+'), ('A-', 'A-'),
        ('B+', 'B+'), ('B-', 'B-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'),
        ('O+', 'O+'), ('O-', 'O-'),
    ]

    GENDER = [
        ('female', 'Female'),
        ('male', 'Male'),
    ]

    # Split name into first and last name
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    gender = models.CharField(max_length=10, choices=GENDER, default="male")
    date_of_birth = models.DateField()
    blood_type = models.CharField(max_length=3, choices=BLOOD_TYPES)
    user_type = models.CharField(max_length=20, choices=USER_TYPES)

    # Medical Information
    weight = models.FloatField(help_text="Weight in kilograms", null=True, blank=True)
    height = models.FloatField(help_text="Height in centimeters", null=True, blank=True)

    # Location Information
    email = models.EmailField(unique=True, validators=[EmailValidator("Enter a valid email address!")])
    country = CountryField(blank_label="(select country)", null=False, blank=False, default="CY")
    city = models.CharField(max_length=100, blank=False, null=False, default="City")
    address = models.CharField(max_length=255, help_text="Street address", null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    postal_code = models.CharField(max_length=20, null=True, blank=True)

    # Common fields
    phone_number = PhoneNumberField(blank=True, null=True)  
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    username = None
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'password', 'gender', 'date_of_birth', 'blood_type', 'user_type']

    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    objects = CustomUserManager()

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def fullname(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):
        today = timezone.now().date()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    @property
    def is_donor(self):
        return self.user_type == 'donor'

    @property
    def is_recipient(self):
        return self.user_type == 'recipient'

    @property
    def profile_complete(self):
        # Common required fields for all users
        required_fields = [
            self.first_name, self.last_name, self.gender, 
            self.date_of_birth, self.blood_type, self.country, 
            self.city, self.phone_number, self.weight, self.height
        ]
        if not all(required_fields):
            return False
            
        if self.is_recipient:
            # Recipients no longer require urgency_level and organ_type for profile completion
            pass
        elif self.is_donor:
            # For donors, ensure all compatibility factors are present
            if not all([
                self.first_name,
                self.last_name,
                self.phone_number,
                self.blood_type,
                self.city,
                self.country,
                self.weight,
                self.height
            ]):
                return False
            # Check if location data is complete
            if not all([self.latitude, self.longitude]):
                return False
        return True

class RecipientProfile(models.Model):
    URGENCY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    ORGAN_TYPES = [
        ('kidney', 'Kidney'),
        ('liver', 'Liver'),
        ('heart', 'Heart'),
        ('lung', 'Lung'),
        ('pancreas', 'Pancreas'),
        ('intestine', 'Intestine'),
    ]

    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='recipient_profile')
    urgency_level = models.CharField(max_length=20, choices=URGENCY_LEVELS, null=True, blank=True)
    organ_type = models.CharField(max_length=50, choices=ORGAN_TYPES, null=True, blank=True)
    hospital_letter = models.FileField(upload_to='hospital_letters/', null=True, blank=True)
    recipient_image = models.ImageField(upload_to='recipient_images/', null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.get_full_name()}'s Profile"




