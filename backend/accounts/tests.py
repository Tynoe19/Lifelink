from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import CustomUser
from django.core.files.uploadedfile import SimpleUploadedFile
import json
from datetime import date, timedelta

class RecipientTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register_recipient')
        self.login_url = reverse('token_obtain_pair')
        self.profile_url = reverse('user_profile')
        
        # Test recipient data
        self.recipient_data = {
            'email': 'recipient@test.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'fullname': 'Test Recipient',
            'gender': 'male',
            'date_of_birth': '1990-01-01',
            'blood_type': 'A+',
            'user_type': 'recipient',
            'country': 'CY',
            'city': 'Nicosia',
            'phone_number': '+905123456789',
            'urgency_level': 'high',
            'emergency_contact_name': 'Emergency Contact',
            'emergency_contact_phone': '+905987654321'
        }

    def test_recipient_registration(self):
        """Test recipient registration"""
        response = self.client.post(self.register_url, self.recipient_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CustomUser.objects.count(), 1)
        self.assertEqual(CustomUser.objects.get().user_type, 'recipient')

    def test_recipient_login(self):
        """Test recipient login"""
        # First register
        self.client.post(self.register_url, self.recipient_data, format='json')
        
        # Then login
        login_data = {
            'email': self.recipient_data['email'],
            'password': self.recipient_data['password']
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_recipient_profile_update(self):
        """Test recipient profile update"""
        # Register and login
        self.client.post(self.register_url, self.recipient_data, format='json')
        login_response = self.client.post(self.login_url, {
            'email': self.recipient_data['email'],
            'password': self.recipient_data['password']
        }, format='json')
        
        # Set token
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Update profile
        update_data = {
            'fullname': 'Updated Name',
            'city': 'Kyrenia',
            'urgency_level': 'critical',
            'emergency_contact_name': 'New Emergency Contact'
        }
        response = self.client.patch(self.profile_url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify updates
        user = CustomUser.objects.get(email=self.recipient_data['email'])
        self.assertEqual(user.fullname, update_data['fullname'])
        self.assertEqual(user.city, update_data['city'])
        self.assertEqual(user.urgency_level, update_data['urgency_level'])
        self.assertEqual(user.emergency_contact_name, update_data['emergency_contact_name'])

    def test_recipient_document_upload(self):
        """Test recipient document upload"""
        # Register and login
        self.client.post(self.register_url, self.recipient_data, format='json')
        login_response = self.client.post(self.login_url, {
            'email': self.recipient_data['email'],
            'password': self.recipient_data['password']
        }, format='json')
        
        # Set token
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Create test files
        hospital_letter = SimpleUploadedFile(
            "test_letter.pdf",
            b"file_content",
            content_type="application/pdf"
        )
        recipient_image = SimpleUploadedFile(
            "test_image.jpg",
            b"file_content",
            content_type="image/jpeg"
        )
        
        # Upload documents
        update_data = {
            'hospital_letter': hospital_letter,
            'recipient_image': recipient_image
        }
        response = self.client.patch(self.profile_url, update_data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify uploads
        user = CustomUser.objects.get(email=self.recipient_data['email'])
        self.assertTrue(user.hospital_letter)
        self.assertTrue(user.recipient_image)

    def test_recipient_validation(self):
        """Test recipient data validation"""
        # Test invalid blood type
        invalid_data = self.recipient_data.copy()
        invalid_data['blood_type'] = 'INVALID'
        response = self.client.post(self.register_url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Test invalid urgency level
        invalid_data = self.recipient_data.copy()
        invalid_data['urgency_level'] = 'INVALID'
        response = self.client.post(self.register_url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Test invalid email
        invalid_data = self.recipient_data.copy()
        invalid_data['email'] = 'invalid-email'
        response = self.client.post(self.register_url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_recipient_read_only_fields(self):
        """Test that certain fields cannot be updated"""
        # Register and login
        self.client.post(self.register_url, self.recipient_data, format='json')
        login_response = self.client.post(self.login_url, {
            'email': self.recipient_data['email'],
            'password': self.recipient_data['password']
        }, format='json')
        
        # Set token
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Try to update read-only fields
        update_data = {
            'email': 'newemail@test.com',
            'blood_type': 'B+',
            'is_verified': True
        }
        response = self.client.patch(self.profile_url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify fields were not updated
        user = CustomUser.objects.get(email=self.recipient_data['email'])
        self.assertEqual(user.email, self.recipient_data['email'])
        self.assertEqual(user.blood_type, self.recipient_data['blood_type'])
        self.assertFalse(user.is_verified)
