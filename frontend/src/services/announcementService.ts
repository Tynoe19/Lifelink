import api from './api';

export interface Announcement {
    id: number;
    title: string;
    message: string;
    created_at: string;
    created_by: {
        id: number;
        fullname: string;
    };
    is_active: boolean;
    target_audience: 'all' | 'donors' | 'recipients';
    image?: string;
    video?: string;
    media_type: 'none' | 'image' | 'video';
    image_url?: string;
    video_url?: string;
}

const announcementService = {
    getAnnouncements: async (): Promise<Announcement[]> => {
        const response = await api.get('/api/notifications/announcements/');
        // Handle both array and paginated responses
        return Array.isArray(response.data) ? response.data : (response.data?.results || []);
    },

    getAnnouncement: async (id: number): Promise<Announcement> => {
        const response = await api.get(`/api/notifications/announcements/${id}/`);
        return response.data;
    }
};

export default announcementService; 