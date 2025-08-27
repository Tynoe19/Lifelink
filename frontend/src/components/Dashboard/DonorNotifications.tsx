import { useState } from 'react';
import { Card, Badge, ListGroup, Button, Alert } from 'react-bootstrap';
import { FaCheckCircle, FaTimesCircle, FaTimes } from 'react-icons/fa';

interface BaseNotification {
    id: number;
    type: 'request' | 'match' | 'message';
    date: string;
    message: string;
}

interface OrganNotification extends BaseNotification {
    type: 'request' | 'match';
    organ: string;
    bloodType: string;
    location: string;
    status: 'pending' | 'accepted' | 'declined';
}

interface MessageNotification extends BaseNotification {
    type: 'message';
    sender: string;
    subject: string;
}

type Notification = OrganNotification | MessageNotification;

const DonorNotifications: React.FC = () => {
    // In a real implementation, this would be fetched from an API
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: 1,
            type: 'request',
            organ: 'Kidney',
            bloodType: 'O+',
            location: 'New York Medical Center',
            status: 'pending',
            date: '2023-11-12T14:30:00',
            message: 'A potential recipient with chronic kidney disease requires a kidney transplant. Your donation would be life-saving.'
        },
        {
            id: 2,
            type: 'match',
            organ: 'Liver',
            bloodType: 'A+',
            location: 'Memorial Hospital',
            status: 'pending',
            date: '2023-11-10T09:15:00',
            message: 'Our system has identified you as a potential match for a liver transplant. The recipient has been on the waiting list for 8 months.'
        },
        {
            id: 3, 
            type: 'message',
            sender: 'Medical Staff',
            subject: 'Follow-up on your donation interest',
            date: '2023-11-08T11:20:00',
            message: 'Thank you for registering as a donor. Please schedule an appointment for initial screening at your convenience.'
        }
    ]);
    
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    // This would be a real API call in production
    const handleAcceptRequest = (notificationId: number) => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setNotifications(prev => 
                prev.map(notification => 
                    notification.id === notificationId && (notification.type === 'request' || notification.type === 'match')
                        ? {...notification, status: 'accepted'} 
                        : notification
                )
            );
            setLoading(false);
        }, 1000);
    };

    // This would be a real API call in production
    const handleDeclineRequest = (notificationId: number) => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setNotifications(prev => 
                prev.map(notification => 
                    notification.id === notificationId && (notification.type === 'request' || notification.type === 'match')
                        ? {...notification, status: 'declined'} 
                        : notification
                )
            );
            setLoading(false);
        }, 1000);
    };

    // This would be a real API call in production
    const handleDismissNotification = (notificationId: number) => {
        setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
    };

    const renderNotificationItem = (notification: Notification) => {
        const date = new Date(notification.date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        switch (notification.type) {
            case 'request':
            case 'match':
                return (
                    <ListGroup.Item key={notification.id} className="border-bottom">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 className="mb-1">
                                    {notification.type === 'request' ? 'Organ Request' : 'Potential Match'}: {notification.organ}
                                    {' '}
                                    {notification.status === 'pending' && (
                                        <Badge bg="warning" pill>New</Badge>
                                    )}
                                    {notification.status === 'accepted' && (
                                        <Badge bg="success" pill>Accepted</Badge>
                                    )}
                                    {notification.status === 'declined' && (
                                        <Badge bg="danger" pill>Declined</Badge>
                                    )}
                                </h6>
                                <p className="text-muted small mb-2">
                                    <strong>Blood Type:</strong> {notification.bloodType} • 
                                    <strong> Location:</strong> {notification.location} •
                                    <strong> Date:</strong> {date}
                                </p>
                                <p className="mb-3">{notification.message}</p>
                                
                                {notification.status === 'pending' && (
                                    <div className="d-flex">
                                        <Button 
                                            variant="outline-success" 
                                            size="sm" 
                                            className="me-2"
                                            onClick={() => handleAcceptRequest(notification.id)}
                                            disabled={loading}
                                        >
                                            <FaCheckCircle className="me-1" /> Accept
                                        </Button>
                                        <Button 
                                            variant="outline-danger" 
                                            size="sm"
                                            onClick={() => handleDeclineRequest(notification.id)}
                                            disabled={loading}
                                        >
                                            <FaTimesCircle className="me-1" /> Decline
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <Button 
                                variant="link" 
                                className="text-muted p-0" 
                                onClick={() => handleDismissNotification(notification.id)}
                            >
                                <FaTimes />
                            </Button>
                        </div>
                    </ListGroup.Item>
                );
            
            case 'message':
                return (
                    <ListGroup.Item key={notification.id} className="border-bottom">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 className="mb-1">{notification.subject}</h6>
                                <p className="text-muted small mb-2">From {notification.sender} • {date}</p>
                                <p className="mb-1">{notification.message}</p>
                            </div>
                            <Button 
                                variant="link" 
                                className="text-muted p-0" 
                                onClick={() => handleDismissNotification(notification.id)}
                            >
                                <FaTimes />
                            </Button>
                        </div>
                    </ListGroup.Item>
                );
            
            default:
                return null;
        }
    };

    return (
        <Card className="notifications-card border-0 h-100">
            {error && <Alert variant="danger">{error}</Alert>}
            <ListGroup variant="flush">
                {notifications.length > 0 ? (
                    notifications.map(notification => renderNotificationItem(notification))
                ) : (
                    <ListGroup.Item>
                        <p className="text-muted text-center mb-0">No notifications to display</p>
                    </ListGroup.Item>
                )}
            </ListGroup>
        </Card>
    );
};

export default DonorNotifications; 