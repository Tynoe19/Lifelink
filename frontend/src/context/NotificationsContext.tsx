import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { websocketService } from '../services/websocketService';
import api from '../services/api';

interface Notification {
    id: number;
    type: string;
    message: string;
    created_at: string;
    is_read: boolean;
    sender?: {
        fullname: string;
        user_type?: string;
    };
    data?: {
        navigation_path?: string;
        related_object_id?: number;
    };
}

interface WebSocketNotification {
    type: string;
    notification: Notification;
}

interface NotificationPreferences {
    email_notifications: boolean;
    push_notifications: boolean;
    in_app_notifications: boolean;
    notification_types: Record<string, boolean>;
}

interface NotificationsContextType {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    preferences: NotificationPreferences;
    markAsRead: (notificationId: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    acceptRequest: (notificationId: number) => Promise<void>;
    updatePreferences: (newPreferences: NotificationPreferences) => Promise<void>;
    handleNotificationClick: (notification: Notification) => void;
    addNotification: (notification: Notification) => void;
    markNotificationAsRead: (chatRoomId: number) => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export const useNotifications = () => {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
};

interface NotificationsProviderProps {
    children: ReactNode;
}

// Separate component for handling navigation
const NotificationHandler: React.FC<{ notification: Notification }> = ({ notification }) => {
    const navigate = useNavigate();
    const { markAsRead } = useNotifications();

    useEffect(() => {
        console.log('Notification clicked:', notification);
        console.log('Notification type:', notification.type);
        console.log('Notification data:', notification.data);

        // Mark as read
        markAsRead(notification.id);

        // Navigate to the appropriate page
        if (notification.data?.navigation_path) {
            console.log('Using navigation_path:', notification.data.navigation_path);
            navigate(notification.data.navigation_path);
        } else {
            // Fallback to default paths based on notification type
            console.log('Using fallback navigation for type:', notification.type);
            switch (notification.type) {
                case 'organ_request':
                    navigate(`/dashboard/list-organ`);
                    break;
                case 'request_accepted':
                case 'request_rejected':
                    navigate(`/dashboard/list-organ`);
                    break;
                case 'connection':
                case 'connection_accepted':
                    navigate(`/dashboard/connections`);
                    break;
                case 'message':
                    navigate(`/dashboard/messages`);
                    break;
                default:
                    navigate('/dashboard/notifications');
            }
        }
    }, [notification, navigate, markAsRead]);

    return null;
};

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        email_notifications: true,
        push_notifications: true,
        in_app_notifications: true,
        notification_types: {}
    });
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

    // Initialize WebSocket connection
    useEffect(() => {
        if (!user) {
            console.log('No user found, skipping notifications setup');
            return;
        }

        // Connect to WebSocket
        websocketService.connect();

        // Add message handler for notifications
        websocketService.addMessageHandler('notification', (data: WebSocketNotification) => {
            try {
                console.log('Received notification:', data);
                addNotification(data.notification);
            } catch (error) {
                console.error('Error handling notification:', error);
            }
        });

        return () => {
            websocketService.removeMessageHandler('notification');
        };
    }, [user]);

    const addNotification = useCallback((notification: Notification) => {
        // Anonymize donor information if the current user is a recipient
        const isRecipientUser = user?.user_type === 'recipient';
        const isDonorMessage = notification.sender?.user_type === 'donor';
        
        if (isRecipientUser && isDonorMessage) {
            notification = {
                ...notification,
                message: notification.message,  // Keep the original message without sender info
                sender: {
                    ...notification.sender,
                    fullname: 'Anonymous Donor'
                }
            };
        }

        setNotifications(prev => {
            // Check if notification with this ID already exists
            const existingIndex = prev.findIndex(n => n.id === notification.id);
            
            if (existingIndex !== -1) {
                // If it exists, update it only if it's not read
                if (!prev[existingIndex].is_read) {
                    const updated = [...prev];
                    updated[existingIndex] = { ...notification };
                    return updated;
                }
                return prev;
            }
            
            // If it's a new notification, add it to the beginning
            return [notification, ...prev];
        });

        // Only increment unread count for new unread notifications
        if (!notifications.some(n => n.id === notification.id) && !notification.is_read) {
            setUnreadCount(prev => prev + 1);
        }
    }, [notifications, user]);

    // Fetch initial notifications and preferences
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!isAuthenticated || !user) {
                setNotifications([]);
                setUnreadCount(0);
                setIsLoading(false);
                return;
            }

            try {
                const token = localStorage.getItem('access_token');
                if (!token) return;

                const [notificationsRes, preferencesRes] = await Promise.all([
                    axios.get<Notification[]>('/api/notifications/notifications/', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    axios.get<NotificationPreferences>('/api/notifications/preferences/', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                let notificationsData: any[] = [];
                if (Array.isArray(notificationsRes.data)) {
                    notificationsData = notificationsRes.data;
                } else if (notificationsRes.data && Array.isArray((notificationsRes.data as any).results)) {
                    notificationsData = (notificationsRes.data as any).results;
                }

                // Sort notifications by created_at in descending order
                notificationsData.sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );

                // Set notifications and calculate unread count
                setNotifications(notificationsData);
                setUnreadCount(notificationsData.filter(n => !n.is_read).length);
                setPreferences(preferencesRes.data);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
    }, [isAuthenticated, user]);

    const markAsRead = async (notificationId: number): Promise<void> => {
        // Only proceed if the ID is a likely backend ID (e.g., not a timestamp or fake)
        if (!notificationId || notificationId > 10000000000) {
            console.warn('Skipping markAsRead for invalid notification ID:', notificationId);
            return;
        }
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No access token found');
            }

            await axios.post(`/api/notifications/notifications/${notificationId}/mark_as_read/`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            setNotifications(prev => prev.map(n => 
                n.id === notificationId ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    };

    const markAllAsRead = async (): Promise<void> => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No access token found');
            }

            await axios.post('/api/notifications/notifications/mark_all_read/', {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    };

    const acceptRequest = async (notificationId: number): Promise<void> => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No access token found');
            }

            await axios.post(`/api/notifications/notifications/${notificationId}/accept/`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Update the notification in the list
            setNotifications(prev => prev.map(n => 
                n.id === notificationId ? { ...n, type: 'request_accepted' } : n
            ));
        } catch (error) {
            console.error('Error accepting request:', error);
            throw error;
        }
    };

    const updatePreferences = async (newPreferences: NotificationPreferences): Promise<void> => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No access token found');
            }

            await axios.put('/api/notifications/preferences/', newPreferences, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            setPreferences(newPreferences);
        } catch (error) {
            console.error('Error updating preferences:', error);
            throw error;
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        setSelectedNotification(notification);
    };

    const markNotificationAsRead = useCallback((chatRoomId: number) => {
        setNotifications(prev => prev.map(n => {
            if (n.type === 'message' && n.data?.related_object_id === chatRoomId) {
                return { ...n, is_read: true };
            }
            return n;
        }));
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    const value = {
        notifications,
        unreadCount,
        isLoading,
        preferences,
        markAsRead,
        markAllAsRead,
        acceptRequest,
        updatePreferences,
        handleNotificationClick,
        addNotification,
        markNotificationAsRead
    };

    return (
        <NotificationsContext.Provider value={value}>
            {children}
            {selectedNotification && (
                <NotificationHandler notification={selectedNotification} />
            )}
        </NotificationsContext.Provider>
    );
}; 