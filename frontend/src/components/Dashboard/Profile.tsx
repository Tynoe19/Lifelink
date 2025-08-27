import React, { useState, useEffect, ChangeEvent } from 'react';
import { Container, Card, Form, Button, Alert, Badge, Row, Col } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import LocationPicker from './LocationPicker';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

interface Gender {
  value: 'male' | 'female' | 'other';
  label: string;
}

interface UrgencyLevel {
  value: 'low' | 'medium' | 'high' | 'critical';
  label: string;
}

interface OrganType {
  value: string;
  label: string;
}

interface ProfileData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  blood_type: string;
  user_type: 'donor' | 'recipient';
  country: string;
  city: string;
  phone_number: string;
  avatar?: string;
  // Location fields
  address: string;
  postal_code: string;
  latitude: string;
  longitude: string;
  place_id: string;
  // Medical information
  weight: string;
  height: string;
  // Recipient specific fields
  urgency_level?: string;
  organ_type?: string;
  hospital_letter?: string | File;
  profile_complete: boolean;
  is_active: boolean;
  is_verified: boolean;
}

const BLOOD_TYPES: string[] = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
];

const GENDERS: Gender[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' }
];

const URGENCY_LEVELS: UrgencyLevel[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

const ORGAN_TYPES: OrganType[] = [
  { value: 'kidney', label: 'Kidney' },
  { value: 'liver', label: 'Liver' },
  { value: 'heart', label: 'Heart' },
  { value: 'lung', label: 'Lung' },
  { value: 'pancreas', label: 'Pancreas' },
  { value: 'intestine', label: 'Intestine' }
];

const Profile: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await api.get('/api/accounts/user/');
      const userData = response.data;
      console.log('Fetched user data:', userData); // Debug log
      
      // Set all fields from registration
      setProfile({
        ...userData,
        // Basic info
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone_number: userData.phone_number || '',
        // Location info
        address: userData.address || '',
        city: userData.city || '',
        country: userData.country || '',
        postal_code: userData.postal_code || '',
        latitude: userData.latitude || '',
        longitude: userData.longitude || '',
        // Medical info
        blood_type: userData.blood_type || '',
        gender: userData.gender || '',
        date_of_birth: userData.date_of_birth || '',
        weight: userData.weight || '',
        height: userData.height || '',
        // Recipient specific info
        urgency_level: userData.urgency_level || '',
        organ_type: userData.organ_type || '',
        // Status info
        is_active: userData.is_active,
        is_verified: userData.is_verified,
        profile_complete: userData.profile_complete
      });

      // Update the user context with the latest data
      if (user) {
        updateUser({
          ...user,
          ...userData,
          profile_complete: userData.profile_complete ?? user.profile_complete ?? false
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setErrorMessage('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setProfile(prev => prev ? { ...prev, [name]: value } : null);
  };

  // const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
  //   const { name, files } = e.target;
  //   if (files && files[0] && profile) {
  //     setProfile({ ...profile, [name]: files[0] });
  //   }
  // };

  const handleLocationSelect = (location: {
    address: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
    postal_code: string;
  }): void => {
    setProfile(prev => prev ? {
      ...prev,
      address: location.address,
      city: location.city,
      country: location.country,
      postal_code: location.postal_code,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString()
    } : null);
  };

  const validateForm = (): boolean => {
    if (!profile) return false;

    // Required fields for all users (excluding read-only fields)
    const requiredFields = [
      'first_name', 'last_name', 'phone_number', 'email',
      'gender', 'date_of_birth', 'blood_type',
      'weight', 'height', 'city', 'country', 'address', 'postal_code'
    ];

    // Additional required fields for recipients
    if (user?.user_type === 'recipient') {
      requiredFields.push('urgency_level', 'organ_type');
    }

    console.log('Validating required fields:', requiredFields);
    console.log('Current profile data:', profile);

    // Check required fields
    for (const field of requiredFields) {
      const value = profile[field as keyof ProfileData];
      console.log(`Checking field ${field}:`, value);
      if (!value) {
        setErrorMessage(`Please fill in all required fields. Missing: ${field.replace('_', ' ')}`);
        return false;
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profile.email)) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(profile.phone_number)) {
      setErrorMessage('Please enter a valid international phone number (e.g., +263771234567)');
      return false;
    }

    // Validate weight and height are reasonable numbers
    const weight = Number(profile.weight);
    const height = Number(profile.height);
    
    if (isNaN(weight) || weight < 30 || weight > 300) {
      setErrorMessage('Weight must be between 30 and 300 kg');
      return false;
    }

    if (isNaN(height) || height < 100 || height > 250) {
      setErrorMessage('Height must be between 100 and 250 cm');
      return false;
    }

    console.log('Form validation passed');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submission started');
    
    if (!profile) {
        console.error('No profile data available');
        return;
    }

    // Validate required fields (excluding read-only fields)
    const requiredFields = user?.user_type === 'recipient' 
        ? ['first_name', 'last_name', 'phone_number', 'blood_type', 'weight', 'height', 'urgency_level', 'organ_type']
        : ['first_name', 'last_name', 'phone_number', 'blood_type', 'weight', 'height'];

    const missingFields = requiredFields.filter(field => !profile[field as keyof ProfileData]);
    if (missingFields.length > 0) {
        setErrorMessage(`Please fill in all required fields: ${missingFields.join(', ')}`);
        setSaving(false);
        return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
        console.log('Submitting form data:', profile);
        const formData = new FormData();
        
        // Append only editable form fields
        const editableFields = [
            'first_name', 'last_name', 'phone_number', 'email',
            'gender', 'date_of_birth', 'weight', 'height',
            'urgency_level', 'organ_type', 'address', 'city',
            'country', 'postal_code', 'latitude', 'longitude'
        ];

        Object.entries(profile).forEach(([key, value]) => {
            if (value !== null && value !== undefined && editableFields.includes(key)) {
                if (key === 'recipient_profile' && typeof value === 'object') {
                    // Handle nested recipient profile data
                    Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
                        if (nestedValue !== null && nestedValue !== undefined) {
                            formData.append(`recipient_profile.${nestedKey}`, String(nestedValue));
                        }
                    });
                } else if (key === 'urgency_level' || key === 'organ_type') {
                    // Add these fields to both root level and recipient_profile
                    formData.append(key, String(value));
                    formData.append(`recipient_profile.${key}`, String(value));
                } else {
                    formData.append(key, String(value));
                }
            }
        });

        // Add avatar if it exists
        if (profile.avatar) {
            formData.append('avatar', profile.avatar);
        }

        // Log FormData contents
        console.log('FormData contents:');
        for (let pair of formData.entries()) {
            console.log(pair[0]+ ', ' + pair[1]); 
        }

        console.log('Sending profile update request...');
        const response = await api.patch('/api/accounts/user/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        console.log('Profile update response:', response);

        // Update the user state with the new profile data
        if (response.data) {
            const updatedUser = {
                ...user,
                ...response.data,
                profile_complete: response.data.profile_complete ?? user?.profile_complete ?? false
            };
            
            // If there's recipient profile data, ensure it's properly merged
            if (response.data.recipient_profile) {
                updatedUser.recipient_profile = {
                    ...user?.recipient_profile,
                    ...response.data.recipient_profile
                };
            }
            
            updateUser(updatedUser);
            setProfile(response.data);
        }

        setSuccessMessage('Profile updated successfully');
        toast.success('Profile updated successfully');
        
        // Refresh the profile data
        await fetchUserProfile();
        
        // Set isEditing to false after successful update
        setIsEditing(false);
    } catch (err: any) {
        console.error('Error updating profile:', err);
        if (err.response?.status === 401) {
            toast.error('Your session has expired. Please log in again.');
            logout();
            navigate('/login');
        } else {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to update profile';
            setErrorMessage(errorMessage);
            toast.error(errorMessage);
        }
    } finally {
        setSaving(false);
    }
  };

  if (loading || !profile || !user) return <Container className="py-4"><div>Loading...</div></Container>;

  return (
    <Container fluid className="py-4">
      <Row className="justify-content-center">
        <Col md={12}>
          <Card className="profile-card mb-4 w-100">
            <Card.Header className="bg-white border-bottom-0 d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-0">{user.user_type === 'donor' ? 'Donor Profile' : 'Recipient Profile'}</h4>
                <div className="text-muted" style={{ fontSize: 14 }}>Personal details and donation information.</div>
              </div>
              <div>
                {profile.is_verified && <Badge bg="success" className="me-2">Verified</Badge>}
                {profile.profile_complete && <Badge bg="info" className="me-2">Profile Complete</Badge>}
                <div className="d-flex justify-content-end gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="secondary" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button 
                        variant="primary" 
                        onClick={handleSubmit}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </>
                  ) : (
                    <Button variant="primary" onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {successMessage && <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>{successMessage}</Alert>}
              {errorMessage && <Alert variant="danger" dismissible onClose={() => setErrorMessage('')}>{errorMessage}</Alert>}
              <Form onSubmit={handleSubmit} encType="multipart/form-data" id="profile-form">
                {/* Display read-only location when not editing */}
                {!isEditing && profile && (
                  <div className="mb-4">
                    <h5>Location Details</h5>
                    <Row>
                      <Col md={6}>
                        <p><strong>City:</strong> {profile.city || 'N/A'}</p>
                      </Col>
                      <Col md={6}>
                        <p><strong>Postal Code:</strong> {profile.postal_code || 'N/A'}</p>
                      </Col>
                    </Row>
                    <Row>
                       <Col md={12}>
                        <p><strong>Address:</strong> {profile.address || 'N/A'}</p>
                      </Col>
                    </Row>
                  </div>
                )}

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>First Name <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="first_name"
                        value={profile?.first_name || ''}
                        onChange={handleInputChange}
                        disabled={true}
                        readOnly={true}
                        className="read-only-field"
                      />
                      <Form.Text className="text-muted">Name cannot be changed for security reasons</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Last Name <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="last_name"
                        value={profile?.last_name || ''}
                        onChange={handleInputChange}
                        disabled={true}
                        readOnly={true}
                        className="read-only-field"
                      />
                      <Form.Text className="text-muted">Name cannot be changed for security reasons</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={profile?.email || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        required
                      />
                      <Form.Text className="text-muted">Your contact email address</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone Number <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone_number"
                        value={profile?.phone_number || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        required
                        pattern="^\+[1-9]\d{1,14}$"
                        title="Please enter a valid international phone number starting with + and country code (e.g., +263771234567)"
                      />
                      <Form.Text className="text-muted">Format: +[Country Code][Number] (e.g., +263771234567)</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Blood Type <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="blood_type"
                        value={profile?.blood_type || ''}
                        readOnly
                        disabled
                        className="read-only-field"
                      />
                      <Form.Text className="text-muted">Blood type from registration cannot be changed for medical safety reasons</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Account Type</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile?.user_type ? profile.user_type.charAt(0).toUpperCase() + profile.user_type.slice(1) : ''}
                        readOnly
                        className="read-only-field"
                      />
                      <Form.Text className="text-muted">Account type cannot be changed</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Gender <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        name="gender"
                        value={profile?.gender || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        required
                      >
                        <option value="">Select Gender</option>
                        {GENDERS.map(gender => (
                          <option key={gender.value} value={gender.value}>{gender.label}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date of Birth <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="date"
                        name="date_of_birth"
                        value={profile?.date_of_birth || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Weight (kg) <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="number"
                        name="weight"
                        value={profile?.weight || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        required
                        min="30"
                        max="300"
                      />
                      <Form.Text className="text-muted">Weight in kilograms</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Height (cm) <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="number"
                        name="height"
                        value={profile?.height || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        required
                        min="100"
                        max="250"
                      />
                      <Form.Text className="text-muted">Height in centimeters</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col xs={12}>
                    <Form.Group className="mb-3">
                      <LocationPicker
                        onLocationSelect={handleLocationSelect}
                        initialLocation={profile ? {
                          address: profile.address,
                          city: profile.city,
                          country: profile.country,
                          latitude: parseFloat(profile.latitude),
                          longitude: parseFloat(profile.longitude),
                          postal_code: profile.postal_code
                        } : undefined}
                        readOnly={!isEditing}
                      />
          
                    </Form.Group>
                  </Col>
                </Row>
                {user?.user_type === 'recipient' && (
                  <>
                    <Row className="mb-3">
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Urgency Level <span className="text-danger">*</span></Form.Label>
                          <Form.Select
                            name="urgency_level"
                            value={profile.urgency_level || ''}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            required
                          >
                            <option value="">Select Urgency Level</option>
                            {URGENCY_LEVELS.map(level => (
                              <option key={level.value} value={level.value}>{level.label.charAt(0).toUpperCase() + level.label.slice(1)}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Organ Type <span className="text-danger">*</span></Form.Label>
                          <Form.Select
                            name="organ_type"
                            value={profile.organ_type || ''}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            required
                          >
                            <option value="">Select Organ Type</option>
                            {ORGAN_TYPES.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                  </>
                )}
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Status</Form.Label>
                      <div>
                        <Badge bg={profile.is_active ? 'success' : 'secondary'}>{profile.is_active ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile; 