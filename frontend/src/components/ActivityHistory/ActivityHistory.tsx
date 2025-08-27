import React, { useState, useEffect } from 'react';
import { FaHeart, FaComments, FaPlusCircle, FaSignInAlt, FaSignOutAlt, 
         FaEdit, FaTrash, FaUserEdit, FaMobileAlt } from 'react-icons/fa';
import activityService, { Activity } from '../../services/activityService';
import { useAuth } from '../../context/AuthContext';
import './ActivityHistory.css';

const ActivityHistory = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await activityService.getMyActivities();
      setActivities(data);
      setError(null);
    } catch (err) {
      setError('Failed to load activity history');
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <FaSignInAlt />;
      case 'logout':
        return <FaSignOutAlt />;
      case 'request_sent':
      case 'request_accepted':
      case 'request_rejected':
        return <FaHeart />;
      case 'organ_listed':
        return <FaPlusCircle />;
      case 'organ_edited':
      case 'profile_edited':
        return <FaEdit />;
      case 'organ_deleted':
        return <FaTrash />;
      case 'device_login':
        return <FaMobileAlt />;
      default:
        return <FaComments />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login':
      case 'device_login':
        return '#3b82f6';
      case 'logout':
        return '#6b7280';
      case 'request_sent':
        return '#f59e0b';
      case 'request_accepted':
        return '#10b981';
      case 'request_rejected':
        return '#ef4444';
      case 'organ_listed':
        return '#8b5cf6';
      case 'organ_edited':
      case 'profile_edited':
        return '#3b82f6';
      case 'organ_deleted':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="activity-history-container">
        <div className="activity-history-card">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading activity history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="activity-history-container">
        <div className="activity-history-card">
          <div className="error-message">
            <p>{error}</p>
            <button 
              className="btn-primary retry-button" 
              onClick={fetchActivities}
              disabled={loading}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-history-container">
      <div className="activity-history-card">
        <h2 className="activity-history-title">Activity History</h2>
        <p className="activity-history-desc">A chronological record of your account activities and interactions.</p>
        <div className="activity-timeline">
          {activities.length === 0 ? (
            <div className="text-center text-muted py-4">
              No activities found
            </div>
          ) : (
            activities.map((activity, idx) => (
              <div className="timeline-item" key={activity.id}>
                <div className="timeline-icon" style={{ background: getActivityColor(activity.activity_type) }}>
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="timeline-content">
                  <div className="timeline-title">{activity.description}</div>
                  <div className="timeline-date">
                    {new Date(activity.created_at).toLocaleString()}
                    {activity.location && ` • ${activity.location}`}
                    {activity.device_info && ` • ${activity.device_info}`}
                  </div>
                </div>
                {idx !== activities.length - 1 && <div className="timeline-connector" />}
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="activity-stats-card">
        <h3 className="activity-stats-title">Activity Statistics</h3>
        <p className="activity-stats-desc">Summary of your account activities.</p>
        <div className="activity-stats-grid">
          {[
            { label: 'Total Logins', value: activities.filter(a => a.activity_type === 'login').length },
            { label: 'Organ Listings', value: activities.filter(a => a.activity_type === 'organ_listed').length },
            { label: 'Requests Made', value: activities.filter(a => a.activity_type === 'request_sent').length },
            { label: 'Profile Updates', value: activities.filter(a => a.activity_type === 'profile_edited').length },
          ].map((stat) => (
            <div className="activity-stat" key={stat.label}>
              <div className="activity-stat-value">{stat.value}</div>
              <div className="activity-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityHistory; 