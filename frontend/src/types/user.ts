export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    fullname: string;
    gender: string;
    date_of_birth: string;
    blood_type: string;
    user_type: 'donor' | 'recipient';
    country: string;
    city: string;
    phone_number: string;
    is_verified: boolean;
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
    medical_history: string;
    allergies: string;
    current_medications: string;
    // Recipient specific fields
    urgency_level?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    // Donor specific fields
    hospital_letter?: string;
    recipient_image?: string;
    profile_complete: boolean;
    recipient_profile?: {
        urgency_level: string;
        organ_type: string;
        hospital_letter?: string;
    };
    is_active: boolean;
    date_joined: string;
    last_login?: string;
} 