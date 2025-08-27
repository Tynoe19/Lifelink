import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationsContext';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
    id: number;
    message: string;
    created_at: string;
    is_read: boolean;
    type: string;
    sender?: {
        fullname: string;
    };
}

interface NotificationsContextType {
    notifications: Notification[];
    markAsRead: (id: number) => Promise<void>;
    acceptRequest: (id: number) => Promise<void>;
}

const Notifications: React.FC = () => {
    const { notifications, markAsRead, acceptRequest } = useNotifications() as NotificationsContextType;
    const [acceptingId, setAcceptingId] = useState<number | null>(null);

    const handleAccept = async (notification: Notification): Promise<void> => {
        try {
            setAcceptingId(notification.id);
            await acceptRequest(notification.id);
            // The notification will be updated via WebSocket
        } catch (error) {
            console.error('Error accepting request:', error);
            alert('Failed to accept request. Please try again.');
        } finally {
            setAcceptingId(null);
        }
    };

    return (
        <div className="notifications-container">
            <h2>Notifications</h2>
            {notifications.length === 0 ? (
                <p>No notifications</p>
            ) : (
                <ul className="notifications-list">
                    {notifications.map(notification => (
                        <li 
                            key={notification.id} 
                            className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                        >
                            <div className="notification-content">
                                <p>{notification.message}</p>
                                <small>
                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </small>
                            </div>
                            <div className="notification-actions">
                                {!notification.is_read && (
                                    <button 
                                        onClick={() => markAsRead(notification.id)}
                                        className="mark-read-btn"
                                    >
                                        Mark as Read
                                    </button>
                                )}
                                {notification.type === 'connection' && !notification.is_read && (
                                    <button 
                                        onClick={() => handleAccept(notification)}
                                        className="accept-btn"
                                        disabled={acceptingId === notification.id}
                                    >
                                        {acceptingId === notification.id ? 'Accepting...' : 'Accept'}
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Notifications; 