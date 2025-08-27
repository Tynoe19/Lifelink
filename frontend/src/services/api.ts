import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Organ as OrganType, MatchResponse } from '../types/donations';

// Define the VITE_API_URL type

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Define interfaces for API responses
interface LoginResponse {
    access: string;
    refresh: string;
}

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
    is_active: boolean;
    date_joined: string;
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
    hospital_letter?: string;
    profile_complete: boolean;
    recipient_profile?: {
        urgency_level: string;
        organ_type: string;
        hospital_letter?: string;
    };
}

export interface Organ {
    id: number;
    organ_name: string;
    blood_type: string;
    location: string;
    is_available: boolean;
    date_created: string;
    date_updated: string;
    medical_history?: string;
    additional_notes?: string;
    age?: number;
    donor: number | {
        id: number;
        fullname: string;
        gender: string;
        age: number;
        blood_type: string;
    };
}

export interface OrganRequest {
    id: number;
    organ: number;
    organ_details: {
        id: number;
        organ_name: string;
        blood_type: string;
        location: string;
        is_available: boolean;
        medical_history: string | null;
        additional_notes: string;
        date_created: string;
        date_updated: string;
        donor: {
            id: number;
            first_name: string;
            last_name: string;
            email: string;
            gender: string;
            age: number;
            blood_type: string;
            urgency_level: string | null;
            city: string;
            country: {
                code: string;
                name: string;
            };
        };
    };
    recipient: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        phone_number: string;
        blood_type: string;
        city: string;
        country: string;
        gender: string;
        date_of_birth: string;
        emergency_contact_name: string | null;
        emergency_contact_phone: string | null;
        is_verified: boolean;
        is_active: boolean;
        user_type: string;
        urgency_level: string | null;
    };
    status: string;
    status_display: string;
    message: string;
    created_at: string;
    updated_at: string;
}

interface Message {
    id: number;
    conversation: number;
    sender: number;
    content: string;
    created_at: string;
}

interface Conversation {
    id: number;
    participants: number[];
    last_message: Message | null;
    created_at: string;
    updated_at: string;
}

interface Activity {
    id: number;
    user: number;
    action: string;
    details: string;
    created_at: string;
}

interface RegisterData {
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    user_type: 'donor' | 'recipient';
    city: string;
    country: string;
    phone_number: string;
    blood_type: string;
    is_verified: boolean;
    address?: string;
    postal_code?: string;
    latitude?: string;
    longitude?: string;
    // Recipient-specific fields
    urgency_level?: string;
    organ_type?: string;
    hospital_letter?: File | null;
    recipient_profile?: {
        urgency_level?: string;
        organ_type?: string;
        hospital_letter?: File | null;
    };
}

// Create axios instance with proper typing
const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,  // Enable credentials to receive cookies
    maxRedirects: 0,
    validateStatus: function (status) {
        return status >= 200 && status < 300;
    }
});

// Function to get CSRF token
const getCSRFToken = async () => {
    try {
        const response = await api.get('/api/accounts/csrf/');
        console.log('CSRF token response:', response);
        return true;
    } catch (error) {
        console.error('Error getting CSRF token:', error);
        return false;
    }
};

// Function to get CSRF token from cookies
const getCSRFTokenFromCookie = () => {
    return document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
};

// Add request interceptor to handle token and content type
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Get CSRF token for non-GET requests
        if (config.method !== 'get') {
            const success = await getCSRFToken();
            if (success) {
                const csrfToken = getCSRFTokenFromCookie();
                if (csrfToken) {
                    config.headers['X-CSRFToken'] = csrfToken;
                } else {
                    console.warn('CSRF token not found in cookies');
                }
            }
        }

        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // If the request data is FormData, don't set Content-Type
        // Let the browser set it with the boundary
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (refreshToken) {
                    const response = await axios.post<LoginResponse>(`${API_URL}/api/accounts/token/refresh/`, {
                        refresh: refreshToken
                    });

                    if (response.data.access) {
                        localStorage.setItem('access_token', response.data.access);
                        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
                        return api(originalRequest);
                    }
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
            }
        }

        if (error.code === 'ECONNREFUSED') {
            console.error('Connection refused. Please check if the backend server is running.');
            return Promise.reject(new Error('Unable to connect to the server. Please try again later.'));
        }

        return Promise.reject(error);
    }
);

// API endpoints with proper typing
export const authAPI = {
    login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
        try {
            console.log('Attempting login with credentials:', { email: credentials.email });
            const response = await api.post<LoginResponse>('/api/accounts/login/', credentials);
            console.log('Login response:', response.data);
        return response.data;
        } catch (error: any) {
            console.error('Login error details:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    },

    register: async (data: RegisterData): Promise<AxiosResponse> => {
        const endpoint = data.user_type === 'recipient' ? '/api/accounts/register/recipient/' : '/api/accounts/register/';
        return api.post(endpoint, data);
    },

    refreshToken: async (refresh: string): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>('/api/accounts/token/refresh/', { refresh });
        return response.data;
    },

    getUserDetails: () => 
        api.get<User>('/api/accounts/user/'),
};

export const donationsAPI = {
    getOrgans: (url = '/api/donations/organs/') => 
        api.get<Organ[]>(url),
    createOrgan: (data: Partial<Organ>) => 
        api.post<Organ>('/api/donations/organs/', data),
    findMatches: () => 
        api.get<MatchResponse>('/api/donations/organs/find_matches/'),
    searchOrgans: (params: Record<string, any>) => 
        api.get<Organ[]>('/api/donations/organs/search/', { params }),
    requestOrgan: (organId: number, message: string) => 
        api.post<OrganRequest>(`/api/donations/organs/${organId}/request_organ/`, { message }),
    getDonorInfo: (organId: number) => 
        api.get<User>(`/api/donations/organs/${organId}/donor_info/`),
    delete: (id: number) => 
        api.delete(`/api/donations/organs/${id}/`),
    getById: (id: number) => 
        api.get<Organ>(`/api/donations/organs/${id}/`),
    markUnavailable: (organId: number) => 
        api.post<Organ>(`/api/donations/organs/${organId}/mark_unavailable/`),
    getMyRequests: () => 
        api.get<OrganRequest[]>('/api/donations/donation-requests/'),
    cancelRequest: (requestId: number) => 
        api.delete(`/api/donations/donation-requests/${requestId}/`)
};

export const organsAPI = {
    search: async (params: Record<string, any> = {}) => {
        try {
            console.log('Searching organs with params:', params);
            const response = await api.get<Organ[]>(`/api/donations/organs/search/`, { params });
            console.log('Search response:', response.data);
            return response;
        } catch (error: any) {
            console.error('Error searching organs:', error);
            throw error;
        }
    },
    create: async (data: Partial<Organ>) => {
        try {
            console.log('Creating organ listing:', data);
            const response = await api.post<Organ>('/api/donations/organs/', data);
            console.log('Create response:', response.data);
            return response;
        } catch (error: any) {
            console.error('Error creating organ listing:', error);
            throw error;
        }
    },
    update: async (id: number, data: Partial<Organ>) => {
        try {
            console.log('Updating organ listing:', id, data);
            const response = await api.patch<Organ>(`/api/donations/organs/${id}/`, {
                ...data,
                is_available: data.is_available
            });
            console.log('Update response:', response.data);
            return response;
        } catch (error) {
            console.error('Error updating organ listing:', error);
            throw error;
        }
    },
    delete: async (id: number) => {
        try {
            console.log('Deleting organ listing:', id);
            const response = await api.delete(`/api/donations/organs/${id}/`);
            console.log('Delete response:', response.data);
            return response;
        } catch (error) {
            console.error('Error deleting organ listing:', error);
            throw error;
        }
    },
    getMyOrgans: async () => {
        try {
            console.log('Fetching user organs');
            const response = await api.get<{ count: number; next: string | null; previous: string | null; results: Organ[] }>('/api/donations/organs/', {
                params: { 
                    include_unavailable: true,
                    show_all: true  // Add this parameter to ensure we get all organs
                }
            });
            console.log('My organs response:', response.data);
            // Ensure we're returning the results array
            return {
                ...response,
                data: response.data.results || []
            };
        } catch (error) {
            console.error('Error fetching user organs:', error);
            throw error;
        }
    },
    requestOrgan: async (id: number, message: string) => {
        try {
            console.log('Requesting organ:', id, message);
            const response = await api.post<OrganRequest>(`/api/donations/organs/${id}/request_organ/`, {
                organ: id,
                message: message,
                status: 'pending'
            });
            console.log('Request response:', response.data);
            return response;
        } catch (error: unknown) {
            console.error('Error requesting organ:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: any } };
                console.error('Error response data:', axiosError.response?.data);
            }
            throw error;
        }
    },
    getMyRequests: () => api.get<OrganRequest[]>('/api/donations/donation-requests/'),
    acceptRequest: async (id: number) => {
        try {
            console.log('Accepting request:', id);
            const response = await api.post<OrganRequest>(`/api/donations/donation-requests/${id}/accept/`);
            console.log('Accept response:', response.data);
            return response;
        } catch (error) {
            console.error('Error accepting request:', error);
            throw error;
        }
    },
    rejectRequest: async (id: number) => {
        try {
            console.log('Rejecting request:', id);
            const response = await api.post<OrganRequest>(`/api/donations/donation-requests/${id}/reject/`);
            console.log('Reject response:', response.data);
            return response;
        } catch (error) {
            console.error('Error rejecting request:', error);
            throw error;
        }
    },
    cancelRequest: async (id: number) => {
        try {
            console.log('Cancelling request:', id);
            const response = await api.delete(`/api/donations/donation-requests/${id}/`);
            console.log('Cancel response:', response.data);
            return response;
        } catch (error: unknown) {
            console.error('Error cancelling request:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: any } };
                console.error('Error response data:', axiosError.response?.data);
            }
            throw error;
        }
    },
    createRequest: async (data: FormData | Partial<OrganRequest>): Promise<AxiosResponse<OrganRequest>> => {
        try {
            console.log('Creating organ request with data:', data);
            return await api.post('/api/donations/recipient-requests/', data);
        } catch (error) {
            console.error('Error creating organ request:', error);
            throw error;
        }
    },
    findMatches: () => api.get<MatchResponse>('/api/donations/organs/find_matches/'),
    getRecipientRequestsForMyOrgans: () => api.get<OrganRequest[]>('/api/donations/organs/my_requests/'),
    getAll: () => api.get<Organ[]>(`/api/donations/organs/`),
    getOne: (id: number) => api.get<Organ>(`/api/donations/organs/${id}/`),
    getMatches: () => api.get<MatchResponse>('/api/donations/organs/find_matches/'),
    getMyListings: () => api.get<Organ[]>(`/api/donations/organs/my_listings/`),
};

export const activityAPI = {
    getHistory: async () => {
        try {
            const response = await api.get<Activity[]>('/api/activity/');
            return response.data;
        } catch (error) {
            console.error('Error fetching activity history:', error);
            throw error;
        }
    }
};

export const messagesAPI = {
    getConversations: async () => {
        try {
            const response = await api.get<Conversation[]>('/api/messages/conversations/');
            return response.data;
        } catch (error) {
            console.error('Error fetching conversations:', error);
            throw error;
        }
    },
    getMessages: async (conversationId: number) => {
        try {
            const response = await api.get<Message[]>(`/api/messages/conversations/${conversationId}/messages/`);
            return response.data;
        } catch (error) {
            console.error('Error fetching messages:', error);
            throw error;
        }
    },
    sendMessage: async (conversationId: number, content: string) => {
        try {
            const response = await api.post<Message>(`/api/messages/conversations/${conversationId}/messages/`, {
                content
            });
            return response.data;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
};

export const notificationsAPI = {
    getAll: () => api.get('/notifications/'),
    markAsRead: (id: number) => api.put(`/notifications/${id}/read/`),
    markAllAsRead: () => api.put('/notifications/mark_all_read/'),
};

export const chatAPI = {
    getRooms: () => api.get('/chat/rooms/'),
    getMessages: (roomId: number) => api.get(`/chat/rooms/${roomId}/messages/`),
    sendMessage: (roomId: number, content: string) =>
        api.post(`/chat/rooms/${roomId}/messages/`, { content }),
};

export default api; 