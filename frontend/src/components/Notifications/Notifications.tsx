import React, { useState } from 'react';
import { Bell, Mail, Heart, CheckCircle, AlertTriangle, UserPlus, RefreshCcw, Megaphone } from 'lucide-react';
import NotificationPreferences from './NotificationPreferences';
import { useNotifications } from '../../context/NotificationsContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

// Notification type definition
interface Notification {
  id: number;
  type: string;
  message: string;
  created_at: string;
  is_read: boolean;
  data?: {
    related_object_id?: number;
    navigation_path?: string;
    urgency_level?: string;
  };
  sender?: {
    fullname: string;
  };
}

const typeIcon = {
  request_accepted: <UserPlus className="text-blue-500 w-5 h-5" />,
  request: <UserPlus className="text-blue-500 w-5 h-5" />,
  status_update: <RefreshCcw className="text-yellow-500 w-5 h-5" />,
  message: <Mail className="text-green-500 w-5 h-5" />,
  system: <AlertTriangle className="text-orange-500 w-5 h-5" />,
  connection: <Heart className="text-pink-500 w-5 h-5" />,
  news: <Megaphone className="text-indigo-500 w-5 h-5" />,
};

const typeBadge = {
  Request: 'bg-blue-100 text-blue-700',
  Update: 'bg-yellow-100 text-yellow-700',
  Message: 'bg-green-100 text-green-700',
  System: 'bg-orange-100 text-orange-700',
};

const getCategory = (type: string) => {
  if (type.includes('request')) return 'Request';
  if (type.includes('update')) return 'Update';
  if (type.includes('message')) return 'Message';
  if (type.includes('system')) return 'System';
  return 'Other';
};

const Notifications: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();

  const filteredNotifications =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => !n.is_read);

  const handleNotificationClick = (notification: Notification) => {
    console.log('Notification clicked:', notification);
    console.log('Notification type:', notification.type);
    console.log('Notification data:', notification.data);

    // Mark as read if not already read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Check if it's a match notification first
    const isMatchNotification = notification.type === 'match' || 
                              notification.message.toLowerCase().includes('match score') ||
                              notification.message.toLowerCase().includes('found with a');

    // Check if it's an organ-related notification
    const isOrganRelated = notification.type === 'organ_request' ||
                          notification.type === 'request' ||
                          notification.type === 'request_accepted' ||
                          notification.type === 'request_rejected' ||
                          notification.type === 'status_update' ||
                          notification.type === 'connection' ||
                          notification.type === 'connection_accepted' ||
                          notification.message.toLowerCase().includes('donation request') ||
                          notification.message.toLowerCase().includes('organ request');

    if (isMatchNotification || isOrganRelated) {
      console.log('Detected organ-related notification, navigating to list-organ');
      navigate('/dashboard/list-organ');
      return;
    }

    // Then check for explicit navigation path
    if (notification.data?.navigation_path) {
      console.log('Using navigation_path:', notification.data.navigation_path);
      navigate(notification.data.navigation_path);
      return;
    }

    // Then handle based on notification type
    console.log('Using type-based navigation for:', notification.type);
    
    switch (notification.type) {
      case 'message':
        console.log('Navigating to messages');
        navigate('/dashboard/messages');
        break;
      default:
        console.log('Navigating to notifications (default)');
        navigate('/dashboard/notifications');
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl mx-auto py-8">
      {/* Main Notifications Card */}
      <div className="flex-1 bg-white rounded-xl shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="ml-2 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <button
              className={`px-3 py-1 rounded text-sm font-medium border ${filter === 'all' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200'}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`px-3 py-1 rounded text-sm font-medium border ${filter === 'unread' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200'}`}
              onClick={() => setFilter('unread')}
            >
              Unread
            </button>
            <button
              className="ml-2 px-3 py-1 rounded text-sm font-medium border border-blue-500 text-blue-600 hover:bg-blue-50"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>
        </div>
        <div className="divide-y">
          {isLoading ? (
            <div className="py-8 text-center text-gray-400">Loading...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No notifications</div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-center justify-between py-4 gap-4 ${
                  !n.is_read ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                } cursor-pointer transition-colors duration-200 rounded-lg px-4`}
                onClick={() => handleNotificationClick(n)}
              >
                <div className="flex items-center gap-4">
                  <div>{typeIcon[n.type as keyof typeof typeIcon] || <Bell className="w-5 h-5 text-gray-400" />}</div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm mb-1">{n.message}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded ${typeBadge[getCategory(n.type) as keyof typeof typeBadge] || 'bg-gray-100 text-gray-500'}`}>{getCategory(n.type)}</span>
                      <span className="text-gray-400">{n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}</span>
                    </div>
                  </div>
                </div>
                {!n.is_read && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-600">Click to mark as read</span>
                    <button
                      className="text-xs px-3 py-1 rounded border border-blue-500 text-blue-600 hover:bg-blue-50"
                      onClick={e => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                    >
                      Mark as read
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      {/* Preferences Card */}
      <div className="w-full md:w-80 flex-shrink-0">
        <div className="bg-white rounded-xl shadow p-6">
          <NotificationPreferences />
        </div>
      </div>
    </div>
  );
};

export default Notifications;