import React, { useState, useEffect } from 'react';
import './SharedDashboard.css';
import { useAuth } from '../../context/AuthContext';
import { useUnreadMessages } from '../../context/UnreadMessagesContext';
import { useNotifications } from '../../context/NotificationsContext';
import { FaHeart, FaLink, FaComments, FaBell, FaClipboardList, FaRegBell, FaRegComments, FaRegHeart, FaRegListAlt, FaHospital } from 'react-icons/fa';
import { organsAPI } from '../../services/api';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';
import { useSuggestedHospitals } from '../../context/SuggestedHospitalsContext';
import { Hospital } from '../../types';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button } from 'react-bootstrap';
import announcementService, { Announcement } from '../../services/announcementService';

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
  color: string;
  tooltipContent?: React.ReactNode;
}

interface Organ {
  is_available: boolean;
  [key: string]: any;
}

interface Request {
  id: number;
  organ: {
    organ_name: string;
    blood_type: string;
  };
  recipient: {
    first_name: string;
    last_name: string;
  };
  status: string;
  created_at: string;
  [key: string]: any;
}

interface ChatRoom {
  id: number;
  donor?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  recipient?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  organ?: {
    organ_name: string;
    alias?: string;
  };
  last_activity?: string;
}

interface Message {
  id: number;
  content: string;
  sender: {
    id: number;
    fullname: string;
  };
  timestamp: string;
}

const iconStyles = {
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 12,
    marginBottom: 8,
    fontSize: 22,
  },
};

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, label, value, bg, color, tooltipContent }) => {
  const card = (
    <div className="summary-card" style={{ borderColor: bg }}>
      <div style={{ ...iconStyles.card, background: bg + '22', color: color }}>{icon}</div>
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  );

  if (tooltipContent) {
    return (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id={`tooltip-${label}`}>
            {tooltipContent}
          </Tooltip>
        }
      >
        {card}
      </OverlayTrigger>
    );
  }

  return card;
};

const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const { totalUnreadCount } = useUnreadMessages();
  const { unreadCount: unreadNotifications } = useNotifications();
  const { suggestedHospitals, updateSuggestedHospitals } = useSuggestedHospitals();
  const [activeDonations, setActiveDonations] = useState(0);
  const [pendingMatches, setPendingMatches] = useState<Request[]>([]);
  const [availableOrgans, setAvailableOrgans] = useState(0);
  const [myRequests, setMyRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Initialize suggested hospitals
        await updateSuggestedHospitals();
        
        if (user?.user_type === 'donor') {
          // Fetch donor's organs
          const organsRes = await organsAPI.getMyOrgans();
          const organs = Array.isArray(organsRes.data) ? organsRes.data : ((organsRes.data as any)?.results ?? []);
          
          // Count active donations (organs that are available)
          const activeCount = organs.filter((organ: Organ) => organ.is_available).length;
          setActiveDonations(activeCount);

          // Fetch and store pending matches (organs with pending requests)
          const requestsRes = await organsAPI.getRecipientRequestsForMyOrgans();
          const requests = Array.isArray(requestsRes.data) ? requestsRes.data : ((requestsRes.data as any)?.results ?? []);
          const pendingRequests = requests.filter((req: Request) => req.status === 'pending');
          setPendingMatches(pendingRequests);
        } else if (user?.user_type === 'recipient') {
          // Fetch available organs
          const organsRes = await organsAPI.search({ is_available: true });
          const organs = Array.isArray(organsRes.data) ? organsRes.data : ((organsRes.data as any)?.results ?? []);
          setAvailableOrgans(organs.length);

          // Fetch recipient's requests
          try {
            const requestsRes = await api.get('/api/donations/donation-requests/');
            const requests = Array.isArray(requestsRes.data) ? requestsRes.data : ((requestsRes.data as any)?.results ?? []);
            setMyRequests(requests.length);
          } catch (err) {
            console.error('Error fetching recipient requests:', err);
            setMyRequests(0);
          }
        }

        // Fetch chat rooms and recent messages
        try {
          const chatRoomsRes = await api.get('/api/chat/rooms/');
          const rooms = Array.isArray(chatRoomsRes.data) ? chatRoomsRes.data : ((chatRoomsRes.data as any)?.results ?? []);
          setChatRooms(rooms);

          // Get messages for each chat room
          const allMessages: Message[] = [];
          for (const room of rooms) {
            if (!room.id) continue; // Skip if room has no ID
            try {
              // Use the correct endpoint for messages
              const messagesRes = await api.get(`/api/chat/messages/?room=${room.id}`);
              const messages = Array.isArray(messagesRes.data) ? messagesRes.data : ((messagesRes.data as any)?.results ?? []);
              allMessages.push(...messages);
            } catch (err) {
              // Log warning but continue with other rooms
              console.warn(`Could not fetch messages for room ${room.id}:`, err);
              continue;
            }
          }

          // Sort messages by timestamp and get the 5 most recent
          const sortedMessages = allMessages.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setRecentMessages(sortedMessages.slice(0, 5));
        } catch (err) {
          console.error('Error fetching chat data:', err);
          setRecentMessages([]);
        }

        // Fetch announcements
        try {
          const announcementsData = await announcementService.getAnnouncements();
          // Ensure we're working with an array
          const announcementsArray = Array.isArray(announcementsData) ? announcementsData : 
            (announcementsData?.results || []);
          setAnnouncements(announcementsArray);
        } catch (err) {
          console.error('Error fetching announcements:', err);
          setAnnouncements([]);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const renderPendingMatchesTooltip = () => {
    if (pendingMatches.length === 0) {
      return <div>No pending matches</div>;
    }

    return (
      <div className="pending-matches-tooltip">
        <div className="tooltip-header">Pending Requests:</div>
        {pendingMatches.map((request) => (
          <div key={request.id} className="tooltip-item">
            <div className="tooltip-organ">{request.organ.organ_name}</div>
            <div className="tooltip-recipient">
              From: {request.recipient.first_name} {request.recipient.last_name}
            </div>
            <div className="tooltip-date">
              Requested: {new Date(request.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRecentMessages = () => {
    if (recentMessages.length === 0) {
      return <div className="text-gray-500">No recent messages</div>;
    }

    // Get unique chat rooms from recent messages
    const uniqueChatRooms = Array.from(new Set(recentMessages.map(msg => {
      const chatRoom = chatRooms.find(room => 
        room.donor?.id === msg.sender.id || room.recipient?.id === msg.sender.id
      );
      return chatRoom?.id;
    }))).filter(Boolean);

    // Take only the first two chat rooms
    const firstTwoChatRooms = uniqueChatRooms.slice(0, 2);

    return (
      <div className="recent-messages">
        {firstTwoChatRooms.map(chatRoomId => {
          const chatRoom = chatRooms.find(room => room.id === chatRoomId);
          if (!chatRoom) return null;

          // Get messages for this chat room
          const roomMessages = recentMessages.filter(msg => {
            const msgChatRoom = chatRooms.find(room => 
              room.donor?.id === msg.sender.id || room.recipient?.id === msg.sender.id
            );
            return msgChatRoom?.id === chatRoomId;
          });

          // Determine the other user's name
          let otherUserName = 'Unknown';
          if (user?.user_type === 'recipient' && chatRoom.donor) {
            otherUserName = chatRoom.organ?.alias || 'Anonymous Donor';
          } else if (chatRoom.donor && roomMessages[0]?.sender.id === chatRoom.donor.id) {
            otherUserName = `${chatRoom.donor.first_name} ${chatRoom.donor.last_name}`;
          } else if (chatRoom.recipient) {
            otherUserName = `${chatRoom.recipient.first_name} ${chatRoom.recipient.last_name}`;
          }

          return (
            <div key={chatRoomId} className="mb-4">
              <h3 className="text-lg font-semibold mb-2">{otherUserName}</h3>
              {roomMessages.slice(0, 3).map((message) => (
                <div key={message.id} className="message-item mb-2">
                  <div className="message-header">
                    <span className="message-time">
                      {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="message-content">{message.content}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderNearbyHospitals = () => {
    if (!suggestedHospitals || suggestedHospitals.length === 0) {
      return <div className="text-gray-500">No nearby hospitals available</div>;
    }

    // Take only the first two hospitals
    const firstTwoHospitals = suggestedHospitals.slice(0, 2);

    return (
      <div className="nearby-hospitals">
        {firstTwoHospitals.map((hospital) => (
          <div key={hospital.id} className="hospital-item mb-2">
            <h3 className="text-lg font-semibold">{hospital.name}</h3>
            <p className="text-gray-600">{hospital.address}, {hospital.city}</p>
            {hospital.distance !== undefined && (
              <p className="text-sm text-blue-600">{hospital.distance.toFixed(1)} km away</p>
            )}
            {hospital.specialties && hospital.specialties.length > 0 && (
              <div className="mt-2">
                <span className="text-sm text-gray-500">Specialties:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {hospital.specialties.map((specialty: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderAnnouncements = () => {
    if (!Array.isArray(announcements) || announcements.length === 0) {
      return (
        <div className="text-center p-4">
          <p className="text-muted">No announcements at this time.</p>
        </div>
      );
    }

    return (
      <div className="announcements-list">
        {announcements.slice(0, 3).map((announcement) => (
          <div key={announcement.id} className="announcement-item mb-3">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h6 className="mb-1">{announcement.title}</h6>
                <p className="text-muted small mb-1">
                  {new Date(announcement.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate(`/dashboard/announcements/${announcement.id}`)}
                className="p-0"
              >
                View Details
              </Button>
            </div>
            <p className="mb-0 text-truncate" style={{ maxWidth: '100%' }}>
              {announcement.message}
            </p>
          </div>
        ))}
        {announcements.length > 3 && (
          <div className="text-center mt-3">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => navigate('/dashboard/announcements')}
            >
              View All Announcements
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center p-4">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-danger">{error}</div>;
  }

  return (
    <>
      <header className="dashboard-header">
        <h2>Welcome back, {user ? `${user.first_name} ${user.last_name}` : 'User'}</h2>
        <p>Here's an overview of your organ donation activities and updates.</p>
      </header>
      <div className="dashboard-summary-cards">
        {user?.user_type === 'donor' && (
          <>
            <SummaryCard icon={<FaRegHeart />} label="Active Donations" value={activeDonations} bg="#3B82F6" color="#3B82F6" />
            <SummaryCard 
              icon={<FaHeart />} 
              label="Pending Matches" 
              value={pendingMatches.length} 
              bg="#F59E0B" 
              color="#F59E0B"
              tooltipContent={renderPendingMatchesTooltip()}
            />
            <SummaryCard 
              icon={<FaRegComments />} 
              label="Unread Messages" 
              value={totalUnreadCount} 
              bg="#10B981" 
              color="#10B981"
            />
            <SummaryCard 
              icon={<FaRegBell />} 
              label="Unread Notifications" 
              value={unreadNotifications} 
              bg="#EF4444" 
              color="#EF4444"
            />
          </>
        )}
        {user?.user_type === 'recipient' && (
          <>
            <SummaryCard icon={<FaClipboardList />} label="Available Organs" value={availableOrgans} bg="#3B82F6" color="#3B82F6" />
            <SummaryCard icon={<FaLink />} label="My Requests" value={myRequests} bg="#F59E0B" color="#F59E0B" />
            <SummaryCard 
              icon={<FaRegComments />} 
              label="Unread Messages" 
              value={totalUnreadCount} 
              bg="#10B981" 
              color="#10B981"
            />
            <SummaryCard 
              icon={<FaRegBell />} 
              label="Unread Notifications" 
              value={unreadNotifications} 
              bg="#EF4444" 
              color="#EF4444"
            />
          </>
        )}
      </div>
      
      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h3>Recent Messages</h3>
          <div className="dashboard-card">
            {renderRecentMessages()}
          </div>
        </section>
        <section className="dashboard-section">
          <h3>Nearby Hospitals</h3>
          <div className="dashboard-card">
            {renderNearbyHospitals()}
          </div>
        </section>
        <section className="dashboard-section">
          <h3>Announcements</h3>
          <div className="dashboard-card dashboard-announcement">
            {renderAnnouncements()}
          </div>
        </section>
      </div>
    </>
  );
};

export default DashboardHome; 