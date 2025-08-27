import api from './api';
import { Organ, OrganRequest } from './api';

interface Hospital {
    id: number;
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
    specialties: string;
    specialties_list: string[];
    latitude: number;
    longitude: number;
    distance: number;
}

interface SearchParams {
    organ_type?: string;
    blood_type?: string;
    city?: string;
    country?: string;
    [key: string]: any;
}

const donationsAPI = {
    // Get all available organs
    getAvailableOrgans: async () => {
        console.log('Calling getAvailableOrgans');
        try {
            const response = await api.get<Organ[]>('/api/donations/organs/');
            console.log('Get available organs response:', response);
            return response;
        } catch (error: unknown) {
            console.error('Get available organs error:', error);
            throw error;
        }
    },

    // Request an organ
    requestOrgan: async (organId: number, message = '') => {
        console.log('Calling requestOrgan with organId:', organId);
        try {
            const response = await api.post<OrganRequest>(`/api/donations/organs/${organId}/request_organ/`, {
                message
            });
            console.log('Request organ response:', response);
            return response;
        } catch (error: unknown) {
            console.error('Request organ error:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { 
                    response?: { 
                        data?: any;
                        status?: number;
                        headers?: any;
                    };
                    request?: any;
                    message?: string;
                };
                
                if (axiosError.response) {
                    console.error('Error response data:', axiosError.response.data);
                    console.error('Error response status:', axiosError.response.status);
                    console.error('Error response headers:', axiosError.response.headers);
                } else if (axiosError.request) {
                    console.error('Error request:', axiosError.request);
                } else {
                    console.error('Error message:', axiosError.message);
                }
            }
            throw error;
        }
    },

    // Get my requests
    getMyRequests: async () => {
        console.log('Calling getMyRequests');
        try {
            const response = await api.get<OrganRequest[]>('/api/donations/donation-requests/');
            console.log('Get my requests response:', response);
            return response;
        } catch (error: unknown) {
            console.error('Get my requests error:', error);
            throw error;
        }
    },

    // Get organ details
    getOrganDetails: async (organId: number) => {
        console.log('Calling getOrganDetails with organId:', organId);
        try {
            const response = await api.get<Organ>(`/api/donations/organs/${organId}/`);
            console.log('Get organ details response:', response);
            return response;
        } catch (error: unknown) {
            console.error('Get organ details error:', error);
            throw error;
        }
    },

    // Get nearby hospitals
    getNearbyHospitals: async (latitude: number, longitude: number) => {
        console.log('Calling getNearbyHospitals with coordinates:', { latitude, longitude });
        try {
            const response = await api.get<Hospital[]>('/api/donations/hospitals/nearby/', {
                params: { latitude, longitude }
            });
            console.log('Get nearby hospitals response:', response);
            return response;
        } catch (error: unknown) {
            console.error('Get nearby hospitals error:', error);
            throw error;
        }
    },

    // Search organs with filters
    searchOrgans: async (params: SearchParams) => {
        console.log('Calling searchOrgans with params:', params);
        try {
            const response = await api.get<Organ[]>('/api/donations/organs/search/', {
                params: params
            });
            console.log('Search organs response:', response);
            return response;
        } catch (error: unknown) {
            console.error('Search organs error:', error);
            throw error;
        }
    },

    // Fetch potential matches for a recipient request
    getPotentialMatches: async (recipientRequestId: number) => {
        try {
            const response = await api.get(`/api/donations/recipient-requests/${recipientRequestId}/potential_matches/`);
            return response;
        } catch (error: unknown) {
            console.error('Get potential matches error:', error);
            throw error;
        }
    },

    // Get suggested hospitals for a connection
    getSuggestedHospitals: async (connectionId: number) => {
        console.log('Calling getSuggestedHospitals with connectionId:', connectionId);
        try {
            const response = await api.get<{
                hospitals: Hospital[];
                midpoint: { latitude: number; longitude: number };
                location_type: 'coordinates' | 'city';
            }>(`/api/donations/connections/${connectionId}/suggested_hospitals/`);
            console.log('Get suggested hospitals response:', response);
            return response;
        } catch (error: unknown) {
            console.error('Get suggested hospitals error:', error);
            throw error;
        }
    }
};

export default donationsAPI; 