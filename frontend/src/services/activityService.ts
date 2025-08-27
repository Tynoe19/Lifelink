import api from './api';

export interface Activity {
    id: number;
    activity_type: string;
    activity_type_display: string;
    description: string;
    ip_address?: string;
    device_info?: string;
    location?: string;
    created_at: string;
    metadata?: any;
}

export const ACTIVITY_TYPES = {
    LOGIN: 'login',
    LOGOUT: 'logout',
    REQUEST_SENT: 'request_sent',
    REQUEST_ACCEPTED: 'request_accepted',
    REQUEST_REJECTED: 'request_rejected',
    ORGAN_LISTED: 'organ_listed',
    ORGAN_EDITED: 'organ_edited',
    ORGAN_DELETED: 'organ_deleted',
    PROFILE_EDITED: 'profile_edited',
    DEVICE_LOGIN: 'device_login',
    MESSAGE_SENT: 'message_sent',
    SEARCH_PERFORMED: 'search_performed',
    ORGAN_MARKED_UNAVAILABLE: 'organ_marked_unavailable',
    REQUEST_CANCELLED: 'request_cancelled',
    ORGAN_VIEWED: 'organ_viewed',
    MATCH_FOUND: 'match_found',
    HOSPITAL_VIEWED: 'hospital_viewed',
    CONNECTION_REQUESTED: 'connection_requested',
    CONNECTION_ACCEPTED: 'connection_accepted',
    CONNECTION_REJECTED: 'connection_rejected'
} as const;

const activityService = {
    getMyActivities: async (): Promise<Activity[]> => {
        const response = await api.get('/api/activity/activities/');
        return response.data.results || response.data;
    },

    createActivity: async (activityData: Partial<Activity>): Promise<Activity> => {
        const response = await api.post('/api/activity/activities/', activityData);
        return response.data;
    },

    // Helper functions for common activities
    trackOrganListing: async (organName: string) => {
        return activityService.createActivity({
            activity_type: ACTIVITY_TYPES.ORGAN_LISTED,
            description: `Listed ${organName} for donation`,
            metadata: { organ_name: organName }
        });
    },

    trackOrganEdit: async (organName: string) => {
        return activityService.createActivity({
            activity_type: ACTIVITY_TYPES.ORGAN_EDITED,
            description: `Updated listing for ${organName}`,
            metadata: { organ_name: organName }
        });
    },

    trackOrganDelete: async (organName: string) => {
        return activityService.createActivity({
            activity_type: ACTIVITY_TYPES.ORGAN_DELETED,
            description: `Deleted listing for ${organName}`,
            metadata: { organ_name: organName }
        });
    },

    trackOrganView: async (organName: string) => {
        return activityService.createActivity({
            activity_type: ACTIVITY_TYPES.ORGAN_VIEWED,
            description: `Viewed details for ${organName}`,
            metadata: { organ_name: organName }
        });
    },

    trackRequestSent: async (organName: string, recipientName: string) => {
        return activityService.createActivity({
            activity_type: ACTIVITY_TYPES.REQUEST_SENT,
            description: `Sent request for ${organName} to ${recipientName}`,
            metadata: { organ_name: organName, recipient_name: recipientName }
        });
    },

    trackRequestAccepted: async (organName: string, donorName: string) => {
        return activityService.createActivity({
            activity_type: ACTIVITY_TYPES.REQUEST_ACCEPTED,
            description: `Accepted request for ${organName} from ${donorName}`,
            metadata: { organ_name: organName, donor_name: donorName }
        });
    },

    trackRequestRejected: async (organName: string, donorName: string) => {
        return activityService.createActivity({
            activity_type: ACTIVITY_TYPES.REQUEST_REJECTED,
            description: `Rejected request for ${organName} from ${donorName}`,
            metadata: { organ_name: organName, donor_name: donorName }
        });
    },

    trackRequestCancelled: async (organName: string) => {
        return activityService.createActivity({
            activity_type: ACTIVITY_TYPES.REQUEST_CANCELLED,
            description: `Cancelled request for ${organName}`,
            metadata: { organ_name: organName }
        });
    },

    trackOrganUnavailable: async (organName: string) => {
        return activityService.createActivity({
            activity_type: ACTIVITY_TYPES.ORGAN_MARKED_UNAVAILABLE,
            description: `Marked ${organName} as unavailable`,
            metadata: { organ_name: organName }
        });
    },

    trackMatchFound: async (organName: string, matchScore: number) => {
        return activityService.createActivity({
            activity_type: ACTIVITY_TYPES.MATCH_FOUND,
            description: `Found match for ${organName} with score ${matchScore}%`,
            metadata: { organ_name: organName, match_score: matchScore }
        });
    },

    trackHospitalView: async (hospitalName: string) => {
        return activityService.createActivity({
            activity_type: ACTIVITY_TYPES.HOSPITAL_VIEWED,
            description: `Viewed details for ${hospitalName}`,
            metadata: { hospital_name: hospitalName }
        });
    },

    trackConnectionRequest: async (organName: string, recipientName: string) => {
        return activityService.createActivity({
            activity_type: ACTIVITY_TYPES.CONNECTION_REQUESTED,
            description: `Requested connection for ${organName} with ${recipientName}`,
            metadata: { organ_name: organName, recipient_name: recipientName }
        });
    },

    trackConnectionAccepted: async (organName: string, donorName: string) => {
        return activityService.createActivity({
            activity_type: ACTIVITY_TYPES.CONNECTION_ACCEPTED,
            description: `Accepted connection for ${organName} with ${donorName}`,
            metadata: { organ_name: organName, donor_name: donorName }
        });
    },

    trackConnectionRejected: async (organName: string, donorName: string) => {
        return activityService.createActivity({
            activity_type: ACTIVITY_TYPES.CONNECTION_REJECTED,
            description: `Rejected connection for ${organName} with ${donorName}`,
            metadata: { organ_name: organName, donor_name: donorName }
        });
    }
};

export default activityService; 