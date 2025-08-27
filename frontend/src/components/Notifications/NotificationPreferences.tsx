import React, { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { useNotifications } from '../../context/NotificationsContext';

interface NotificationPreferences {
    email_notifications: boolean;
    push_notifications: boolean;
    in_app_notifications: boolean;
    notification_types: Record<string, boolean>;
}

const defaultPreferences: NotificationPreferences = {
    email_notifications: true,
    push_notifications: true,
    in_app_notifications: true,
    notification_types: {
        request: true,
        status_update: true,
        message: true,
        connection: true,
        news: true
    }
};

const NotificationPreferences: React.FC = () => {
    const { preferences, updatePreferences } = useNotifications();
    const [localPreferences, setLocalPreferences] = useState<NotificationPreferences>(defaultPreferences);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (preferences) {
            // Ensure notification_types is properly initialized
            const updatedPreferences: NotificationPreferences = {
                ...defaultPreferences,
                ...preferences,
                notification_types: {
                    ...defaultPreferences.notification_types,
                    ...(preferences.notification_types || {})
                }
            };
            setLocalPreferences(updatedPreferences);
            setDirty(false);
        }
    }, [preferences]);

    const handleToggle = (type: string) => {
        let newPreferences: NotificationPreferences;
        if (type.startsWith('notification_types.')) {
            const key = type.split('.')[1];
            newPreferences = {
                ...localPreferences,
                notification_types: {
                    ...localPreferences.notification_types,
                    [key]: !localPreferences.notification_types[key]
                }
            };
        } else {
            const key = type as keyof Omit<NotificationPreferences, 'notification_types'>;
            newPreferences = {
                ...localPreferences,
                [key]: !localPreferences[key]
            };
        }
        setLocalPreferences(newPreferences);
        setDirty(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updatePreferences(localPreferences);
            setSuccess(true);
            setDirty(false);
            setTimeout(() => setSuccess(false), 2000);
        } catch (error) {
            console.error('Error saving preferences:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <Card.Header>
                <h4>Notification Preferences</h4>
            </Card.Header>
            <Card.Body>
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label>Email Notifications</Form.Label>
                        <Form.Check
                            type="switch"
                            id="email-switch"
                            label="Receive email notifications"
                            checked={localPreferences.email_notifications}
                            onChange={() => handleToggle('email_notifications')}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Push Notifications</Form.Label>
                        <Form.Check
                            type="switch"
                            id="push-switch"
                            label="Receive push notifications"
                            checked={localPreferences.push_notifications}
                            onChange={() => handleToggle('push_notifications')}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>In-App Notifications</Form.Label>
                        <Form.Check
                            type="switch"
                            id="in-app-switch"
                            label="Receive in-app notifications"
                            checked={localPreferences.in_app_notifications}
                            onChange={() => handleToggle('in_app_notifications')}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Notification Types</Form.Label>
                        <Form.Check
                            type="switch"
                            id="request-switch"
                            label="Donation Requests"
                            checked={localPreferences.notification_types.request}
                            onChange={() => handleToggle('notification_types.request')}
                        />
                        <Form.Check
                            type="switch"
                            id="status-switch"
                            label="Status Updates"
                            checked={localPreferences.notification_types.status_update}
                            onChange={() => handleToggle('notification_types.status_update')}
                        />
                        <Form.Check
                            type="switch"
                            id="message-switch"
                            label="Messages"
                            checked={localPreferences.notification_types.message}
                            onChange={() => handleToggle('notification_types.message')}
                        />
                    </Form.Group>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={!dirty || saving}
                        style={{ marginTop: '1rem' }}
                    >
                        {saving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                    {success && <div style={{ color: 'green', marginTop: 10 }}>Preferences saved!</div>}
                </Form>
            </Card.Body>
        </Card>
    );
};

export default NotificationPreferences; 