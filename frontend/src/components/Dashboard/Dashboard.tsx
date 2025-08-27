import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDonation } from '../../context/DonationContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import api from '../../services/api';
import { donationsAPI } from '../../services/api';
import Notifications from '../Notifications/Notifications';
import './Dashboard.css';
import '../Notifications/Notifications.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, updateUser, token } = useAuth();
    const { matchingDonations, searchDonations, loading: donationLoading, error: donationError, fetchMatchingDonations, searchForDonations } = useDonation();
    const { unreadCount } = useNotifications();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [activeTab, setActiveTab] = useState('search');
    const [searchParams, setSearchParams] = useState({
        blood_type: user?.blood_type || '',
        organ_type: '',
        location: '',
        min_age: '',
        max_age: '',
        urgency_level: '',
        sort_by: 'date_created'
    });
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [profileData, setProfileData] = useState({
        fullname: '',
        email: '',
        gender: 'male',
        date_of_birth: '',
        blood_type: '',
        country: '',
        city: '',
        phone_number: '',
        urgency_level: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        hospital_letter: null,
        recipient_image: null,
        user_type: ''
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState(null);
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [myRequests, setMyRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [requestsError, setRequestsError] = useState(null);
    const [donationHistory, setDonationHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(null);
    const [myOrgans, setMyOrgans] = useState([]);
    const [organsLoading, setOrgansLoading] = useState(false);
    const [organsError, setOrgansError] = useState(null);
    const [donorRequests, setDonorRequests] = useState([]);
    const [donorRequestsLoading, setDonorRequestsLoading] = useState(false);
    const [donorRequestsError, setDonorRequestsError] = useState(null);

    useEffect(() => {
        if (user?.user_type === 'recipient' && activeTab === 'requests') {
            console.log('Fetching requests for recipient:', user.id);
            fetchMyRequests();
        }
    }, [user, activeTab]);

    useEffect(() => {
        if (!user || !token) {
            navigate('/login');
        } else {
            fetchUserData();
            if (user.user_type === 'recipient') {
                fetchMatchingDonations();
            }
        }
        if (user?.blood_type) {
            setSearchParams(prev => ({ ...prev, blood_type: user.blood_type }));
        }
    }, [user, token, navigate]);

    useEffect(() => {
        if (user?.user_type === 'recipient' && activeTab === 'history') {
            fetchDonationHistory();
        }
    }, [user, activeTab]);

    useEffect(() => {
        if (user?.user_type === 'donor' && activeTab === 'my-organs') {
            fetchMyOrgans();
        }
    }, [user, activeTab]);

    useEffect(() => {
        if (user?.user_type === 'donor' && activeTab === 'requests') {
            fetchDonorRequests();
        }
    }, [user, activeTab]);

    const fetchUserData = async () => {
        try {
            setProfileLoading(true);
            const response = await fetch('/api/accounts/user/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 401) {
                logout();
                navigate('/login');
                return;
            }

            const data = await response.json();
            if (response.ok) {
                setProfileData({
                    fullname: data.fullname || '',
                    email: data.email || '',
                    gender: data.gender || 'male',
                    date_of_birth: data.date_of_birth || '',
                    blood_type: data.blood_type || '',
                    country: data.country || '',
                    city: data.city || '',
                    phone_number: data.phone_number || '',
                    urgency_level: data.urgency_level || '',
                    emergency_contact_name: data.emergency_contact_name || '',
                    emergency_contact_phone: data.emergency_contact_phone || '',
                    hospital_letter: data.hospital_letter || null,
                    recipient_image: data.recipient_image || null,
                    user_type: data.user_type || ''
                });
            } else {
                throw new Error(data.message || 'Failed to fetch user data');
            }
        } catch (err) {
            setProfileError(err.message);
            if (err.message.includes('401')) {
                logout();
                navigate('/login');
            }
        } finally {
            setProfileLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileError(null);
        setProfileSuccess(false);

        try {
            const formData = new FormData();
            Object.keys(profileData).forEach(key => {
                if (profileData[key] !== null) {
                    formData.append(key, profileData[key]);
                }
            });

            const response = await fetch('/api/accounts/user/', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.status === 401) {
                logout();
                navigate('/login');
                return;
            }

            const data = await response.json();
            if (response.ok) {
                setProfileSuccess(true);
                await updateUser(data);
            } else {
                throw new Error(data.message || 'Failed to update profile');
            }
        } catch (err) {
            setProfileError(err.message);
            if (err.message.includes('401')) {
                logout();
                navigate('/login');
            }
        } finally {
            setProfileLoading(false);
        }
    };

    const handleProfileChange = (e) => {
        const { name, value, files } = e.target;
        if (files) {
            setProfileData(prev => ({
                ...prev,
                [name]: files[0]
            }));
        } else {
            setProfileData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            // Build search parameters
            const params = {
                blood_type: searchParams.blood_type || '',
                organ_type: searchParams.organ_type || '',
                location: searchParams.location || '',
                min_age: searchParams.min_age || '',
                max_age: searchParams.max_age || '',
                urgency_level: searchParams.urgency_level || '',
                sort_by: searchParams.sort_by || 'date_created'
            };

            // Remove empty parameters
            Object.keys(params).forEach(key => {
                if (!params[key]) {
                    delete params[key];
                }
            });

            console.log('Searching with params:', params);
            const results = await searchForDonations(params);
            console.log('Search results:', results);
            
            if (results && Array.isArray(results)) {
                setSearchResults(results);
                if (results.length === 0) {
                    setError('No matching donations found. Try adjusting your search criteria.');
                }
            } else {
                console.error('Invalid search results format:', results);
                setSearchResults([]);
                setError('Invalid response from server. Please try again.');
            }
        } catch (err) {
            console.error('Search error:', err);
            const errorMessage = err.response?.data?.error || 'Error searching for donations';
            setError(errorMessage);
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setSearchParams(prev => ({ ...prev, [field]: value }));
    };

    const handleRequestDonation = async (donationId) => {
        try {
            setLoading(true);
            // Find the donation in matchingDonations to get the organ name
            const donation = matchingDonations.find(d => d.id === donationId);
            const organName = donation?.organ_name || 'organ';
            const message = `I would like to connect with you regarding your ${organName} donation.`;
            
            const response = await donationsAPI.requestOrgan(donationId, message);
            
            if (response.status === 201) {
                alert('Connection request sent successfully! The donor will be notified and can respond to your request.');
                // Switch to the requests tab
                setActiveTab('requests');
                // Refresh the matching donations and requests
                await fetchMatchingDonations();
                await fetchMyRequests();
            }
        } catch (err) {
            console.error('Error requesting donation:', err);
            const errorMessage = err.response?.data?.error || 'Failed to send connection request';
            
            if (errorMessage.includes('already requested')) {
                // If the request already exists, fetch the requests to show the current status
                await fetchMyRequests();
                // Switch to the requests tab
                setActiveTab('requests');
            } else {
                alert(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'available':
                return 'badge bg-success';
            case 'pending':
                return 'badge bg-warning';
            case 'matched':
                return 'badge bg-info';
            default:
                return 'badge bg-secondary';
        }
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => !prev);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const fetchMyRequests = async () => {
        try {
            setRequestsLoading(true);
            setRequestsError(null);
            console.log('Fetching requests for user:', user.id, 'type:', user.user_type);
            
            const response = await donationsAPI.getMyRequests();
            console.log('Raw response:', response);
            
            if (response?.data) {
                console.log('Setting requests:', response.data);
                setMyRequests(response.data);
                
                response.data.forEach((request, index) => {
                    console.log(`Request ${index + 1}:`, {
                        id: request.id,
                        organ: request.organ?.organ_name,
                        status: request.status,
                        created_at: request.created_at
                    });
                });
            } else {
                console.warn('No data in response:', response);
                setMyRequests([]);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response,
                status: error.response?.status,
                data: error.response?.data
            });
            setRequestsError('Failed to fetch requests. Please try again later.');
            setMyRequests([]);
        } finally {
            setRequestsLoading(false);
        }
    };

    const handleCancelRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to cancel this request?')) {
            return;
        }

        try {
            setRequestsLoading(true);
            await donationsAPI.cancelRequest(requestId);
            // Refresh requests list
            await fetchMyRequests();
            alert('Request cancelled successfully');
        } catch (err) {
            console.error('Error cancelling request:', err);
            console.error('Error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            alert(err.response?.data?.error || 'Failed to cancel request');
        } finally {
            setRequestsLoading(false);
        }
    };

    const renderMyRequests = () => {
        if (requestsLoading) {
            return (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading your requests...</p>
                </div>
            );
        }

        if (requestsError) {
            return (
                <div className="error-message">
                    <p>{requestsError}</p>
                    <button 
                        className="btn-primary retry-button" 
                        onClick={fetchMyRequests}
                        disabled={requestsLoading}
                    >
                        Retry
                    </button>
                </div>
            );
        }

        // Ensure myRequests is an array before mapping
        const requests = Array.isArray(myRequests) ? myRequests : [];
        console.log('Rendering requests:', requests);

        if (requests.length === 0) {
            return (
                <div className="empty-state">
                    <i className="fas fa-inbox"></i>
                    <p>You haven't made any requests yet.</p>
                    <p>Go to the Search tab to find and request organ donations.</p>
                </div>
            );
        }

        return (
            <div className="requests-grid">
                {requests.map((request) => (
                    <div key={request.id} className="request-card">
                        <div className="card-header">
                            <h3>{request.organ?.organ_name || 'Unknown Organ'}</h3>
                            <span className={`status-badge ${request.status?.toLowerCase() || 'pending'}`}>
                                {request.status_display || request.status || 'Pending'}
                            </span>
                        </div>
                        <div className="card-body">
                            <div className="request-details">
                                <p><strong>Blood Type:</strong> {request.organ?.blood_type || 'N/A'}</p>
                                <p><strong>Location:</strong> {request.organ?.location || 'N/A'}</p>
                                <p><strong>Donor:</strong> {request.organ?.donor?.fullname || 'N/A'}</p>
                                <p><strong>Requested:</strong> {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}</p>
                                {request.message && (
                                    <p><strong>Your Message:</strong> {request.message}</p>
                                )}
                            </div>
                            <div className="card-actions">
                                {request.status === 'pending' && (
                                    <button 
                                        className="btn-danger"
                                        onClick={() => handleCancelRequest(request.id)}
                                        disabled={requestsLoading}
                                    >
                                        Cancel Request
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderDonations = (donations) => {
        console.log('Rendering donations:', donations);
        if (!donations || !Array.isArray(donations)) {
            console.log('No valid donations to render');
            return null;
        }

        if (donations.length === 0) {
            console.log('Empty donations array');
            return (
                <div className="empty-state">
                    <i className="fas fa-search"></i>
                    <p>No results found. Try adjusting your search criteria.</p>
                </div>
            );
        }

        return (
            <div className="search-results">
                <div className="dashboard-grid">
                    {donations.map((donation) => {
                        console.log('Rendering donation:', donation);
                        return (
                            <div key={donation.id} className="dashboard-card">
                                <div className="card-header">
                                    <h3 className="card-title">{donation.organ_name}</h3>
                                    <span className={getStatusBadgeClass(donation.status)}>
                                        {donation.status}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <div className="donation-details">
                                        <p><strong>Blood Type:</strong> {donation.blood_type}</p>
                                        <p><strong>Location:</strong> {donation.location}</p>
                                        <p><strong>Age:</strong> {donation.donor?.age || 'N/A'}</p>
                                        <p><strong>Match Score:</strong> {donation.match_score || 0}%</p>
                                    </div>
                                    <div className="card-actions">
                                        <button 
                                            className="btn-primary"
                                            onClick={() => handleRequestDonation(donation.id)}
                                            disabled={loading}
                                        >
                                            {loading ? 'Connecting...' : 'Connect'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const fetchDonationHistory = async () => {
        try {
            setHistoryLoading(true);
            setHistoryError(null);
            const response = await donationsAPI.getMyRequests();
            if (response.data) {
                setDonationHistory(response.data);
            }
        } catch (err) {
            console.error('Error fetching donation history:', err);
            setHistoryError('Failed to load donation history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchMyOrgans = async () => {
        try {
            setOrgansLoading(true);
            setOrgansError(null);
            const response = await donationsAPI.getOrgans();
            if (response.data) {
                // Filter organs to show only those belonging to the current donor
                const myOrgans = response.data.filter(organ => organ.donor.id === user.id);
                setMyOrgans(myOrgans);
            }
        } catch (err) {
            console.error('Error fetching organs:', err);
            setOrgansError('Failed to load your organs');
        } finally {
            setOrgansLoading(false);
        }
    };

    const fetchDonorRequests = async () => {
        try {
            setDonorRequestsLoading(true);
            setDonorRequestsError(null);
            const response = await donationsAPI.getMyRequests();
            if (response.data) {
                setDonorRequests(response.data);
            }
        } catch (err) {
            console.error('Error fetching donor requests:', err);
            setDonorRequestsError('Failed to load donation requests');
        } finally {
            setDonorRequestsLoading(false);
        }
    };

    const handleMarkUnavailable = async (organId) => {
        if (!window.confirm('Are you sure you want to mark this organ as unavailable?')) {
            return;
        }

        try {
            setLoading(true);
            await donationsAPI.markUnavailable(organId);
            // Refresh the organs list
            await fetchMyOrgans();
            alert('Organ marked as unavailable successfully');
        } catch (err) {
            console.error('Error marking organ as unavailable:', err);
            alert(err.response?.data?.error || 'Failed to mark organ as unavailable');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to accept this donation request?')) {
            return;
        }

        try {
            setLoading(true);
            await donationsAPI.acceptRequest(requestId);
            // Refresh the requests list
            await fetchDonorRequests();
            alert('Request accepted successfully');
        } catch (err) {
            console.error('Error accepting request:', err);
            alert(err.response?.data?.error || 'Failed to accept request');
        } finally {
            setLoading(false);
        }
    };

    const handleRejectRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to reject this donation request?')) {
            return;
        }

        try {
            setLoading(true);
            await donationsAPI.rejectRequest(requestId);
            // Refresh the requests list
            await fetchDonorRequests();
            alert('Request rejected successfully');
        } catch (err) {
            console.error('Error rejecting request:', err);
            alert(err.response?.data?.error || 'Failed to reject request');
        } finally {
            setLoading(false);
        }
    };

    const renderMyOrgans = () => {
        if (organsLoading) {
            return (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading your organs...</p>
                </div>
            );
        }

        if (organsError) {
            return (
                <div className="error-message">
                    <p>{organsError}</p>
                    <button 
                        className="btn-primary retry-button" 
                        onClick={fetchMyOrgans}
                        disabled={organsLoading}
                    >
                        Retry
                    </button>
                </div>
            );
        }

        if (myOrgans.length === 0) {
            return (
                <div className="empty-state">
                    <i className="fas fa-heart"></i>
                    <p>You haven't listed any organs for donation yet.</p>
                    <p>Click the "List New Organ" button to start.</p>
                </div>
            );
        }

        return (
            <div className="organs-grid">
                {myOrgans.map((organ) => (
                    <div key={organ.id} className="organ-card">
                        <div className="card-header">
                            <h3>{organ.organ_name}</h3>
                            <span className={`status-badge ${organ.is_available ? 'available' : 'unavailable'}`}>
                                {organ.is_available ? 'Available' : 'Unavailable'}
                            </span>
                        </div>
                        <div className="card-body">
                            <div className="organ-details">
                                <p><strong>Blood Type:</strong> {organ.blood_type}</p>
                                <p><strong>Location:</strong> {organ.location}</p>
                                <p><strong>Listed:</strong> {new Date(organ.date_created).toLocaleDateString()}</p>
                                {organ.medical_history && (
                                    <p><strong>Medical History:</strong> {organ.medical_history}</p>
                                )}
                            </div>
                            <div className="card-actions">
                                {organ.is_available && (
                                    <button 
                                        className="btn-danger"
                                        onClick={() => handleMarkUnavailable(organ.id)}
                                        disabled={loading}
                                    >
                                        Mark as Unavailable
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderDonorRequests = () => {
        if (donorRequestsLoading) {
            return (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading requests...</p>
                </div>
            );
        }

        if (donorRequestsError) {
            return (
                <div className="error-message">
                    <p>{donorRequestsError}</p>
                    <button 
                        className="btn-primary retry-button" 
                        onClick={fetchDonorRequests}
                        disabled={donorRequestsLoading}
                    >
                        Retry
                    </button>
                </div>
            );
        }

        if (donorRequests.length === 0) {
            return (
                <div className="empty-state">
                    <i className="fas fa-inbox"></i>
                    <p>No donation requests yet.</p>
                    <p>When recipients request your organs, they will appear here.</p>
                </div>
            );
        }

        return (
            <div className="requests-grid">
                {donorRequests.map((request) => (
                    <div key={request.id} className="request-card">
                        <div className="card-header">
                            <h3>{request.organ.organ_name}</h3>
                            <span className={`status-badge ${request.status.toLowerCase()}`}>
                                {request.status_display}
                            </span>
                        </div>
                        <div className="card-body">
                            <div className="request-details">
                                <p><strong>Recipient:</strong> {request.recipient.fullname}</p>
                                <p><strong>Blood Type:</strong> {request.recipient.blood_type}</p>
                                <p><strong>Location:</strong> {request.recipient.city}, {request.recipient.country}</p>
                                <p><strong>Requested:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
                                {request.message && (
                                    <p><strong>Message:</strong> {request.message}</p>
                                )}
                            </div>
                            <div className="card-actions">
                                {request.status === 'pending' && (
                                    <>
                                        <button 
                                            className="btn-success"
                                            onClick={() => handleAcceptRequest(request.id)}
                                            disabled={loading}
                                        >
                                            Accept
                                        </button>
                                        <button 
                                            className="btn-danger"
                                            onClick={() => handleRejectRequest(request.id)}
                                            disabled={loading}
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className={`dashboard-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <h5>
                        <i className="fa-solid fa-heartbeat heart-icon"></i>
                        {!isSidebarCollapsed && <span>Organ Donation</span>}
                    </h5>
                </div>
                <button 
                    className="sidebar-collapse-btn" 
                    onClick={toggleSidebar}
                    aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <i className={`fa-solid fa-chevron-${isSidebarCollapsed ? 'right' : 'left'}`}></i>
                </button>
                <nav className="sidebar-links">
                    <button 
                        className={`sidebar-link ${activeTab === 'search' ? 'active' : ''}`}
                        onClick={() => setActiveTab('search')}
                        title="Dashboard"
                    >
                        <i className="fa-solid fa-gauge-high sidebar-icon"></i>
                        {!isSidebarCollapsed && <span>Dashboard</span>}
                    </button>
                    <button 
                        className={`sidebar-link ${activeTab === 'notifications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('notifications')}
                        title="Notifications"
                    >
                        <i className="fa-solid fa-bell sidebar-icon"></i>
                        {!isSidebarCollapsed && <span>Notifications</span>}
                        {unreadCount > 0 && (
                            <span className="notification-badge">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    <button 
                        className={`sidebar-link ${activeTab === 'messages' ? 'active' : ''}`}
                        onClick={() => setActiveTab('messages')}
                        title="Messages"
                    >
                        <i className="fa-solid fa-envelope sidebar-icon"></i>
                        {!isSidebarCollapsed && <span>Messages</span>}
                    </button>
                    <button 
                        className={`sidebar-link ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                        title="Profile"
                    >
                        <i className="fa-solid fa-user-circle sidebar-icon"></i>
                        {!isSidebarCollapsed && <span>Profile</span>}
                    </button>
                    <button 
                        className="sidebar-link logout-button" 
                        onClick={handleLogout}
                        title="Logout"
                    >
                        <i className="fa-solid fa-right-from-bracket sidebar-icon"></i>
                        {!isSidebarCollapsed && <span>Logout</span>}
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className={`dashboard-content ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                {activeTab === 'notifications' ? (
                    <div className="notifications-page">
                        <Notifications />
                    </div>
                ) : activeTab === 'profile' ? (
                    <div className="profile-section">
                        <Card className="profile-card">
                            <Card.Header>
                                <h2>Profile Settings</h2>
                            </Card.Header>
                        <Card.Body>
                                {profileError && <Alert variant="danger">{profileError}</Alert>}
                                {profileSuccess && <Alert variant="success">Profile updated successfully!</Alert>}
                                
                                <Form onSubmit={handleProfileUpdate}>
                                    <div className="form-row">
                                        <Form.Group className="mb-3">
                                            <Form.Label>Full Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="fullname"
                                                value={profileData.fullname}
                                                readOnly
                                                className="read-only-field"
                                            />
                                            <Form.Text className="text-muted">
                                                Name cannot be changed for security reasons
                                            </Form.Text>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Account Type</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={profileData.user_type ? profileData.user_type.charAt(0).toUpperCase() + profileData.user_type.slice(1) : ''}
                                                readOnly
                                                className="read-only-field"
                                            />
                                            <Form.Text className="text-muted">
                                                Your account type cannot be changed
                                            </Form.Text>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Email</Form.Label>
                                            <Form.Control
                                                type="email"
                                                name="email"
                                                value={profileData.email}
                                                readOnly
                                                className="read-only-field"
                                            />
                                            <Form.Text className="text-muted">
                                                Email cannot be changed for security reasons
                                            </Form.Text>
                                        </Form.Group>
                                    </div>

                                    <div className="form-row">
                                        <Form.Group className="mb-3">
                                            <Form.Label>Gender</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={profileData.gender}
                                                readOnly
                                                className="read-only-field"
                                            />
                                            <Form.Text className="text-muted">
                                                Gender cannot be changed for medical records
                                            </Form.Text>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Date of Birth</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={profileData.date_of_birth}
                                                readOnly
                                                className="read-only-field"
                                            />
                                            <Form.Text className="text-muted">
                                                Date of birth cannot be changed for medical records
                                            </Form.Text>
                                        </Form.Group>
                                    </div>

                                    <div className="form-row">
                                        <Form.Group className="mb-3">
                                            <Form.Label>Blood Type</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={profileData.blood_type}
                                                readOnly
                                                className="read-only-field"
                                            />
                                            <Form.Text className="text-muted">
                                                Blood type cannot be changed for medical records
                                            </Form.Text>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Urgency Level</Form.Label>
                                            <Form.Select
                                                name="urgency_level"
                                                value={profileData.urgency_level}
                                                onChange={handleProfileChange}
                                            >
                                                <option value="">Select Urgency Level</option>
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                                <option value="critical">Critical</option>
                                            </Form.Select>
                                            <Form.Text className="text-muted">
                                                Update your current urgency level
                                            </Form.Text>
                                        </Form.Group>
                                    </div>

                                    <div className="form-row">
                                        <Form.Group className="mb-3">
                                            <Form.Label>Country</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="country"
                                                value={profileData.country}
                                                onChange={handleProfileChange}
                                                required
                                            />
                                            <Form.Text className="text-muted">
                                                Your current country of residence
                                            </Form.Text>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>City</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="city"
                                                value={profileData.city}
                                                onChange={handleProfileChange}
                                                required
                                            />
                                            <Form.Text className="text-muted">
                                                Your current city of residence
                                            </Form.Text>
                                        </Form.Group>
                                    </div>

                                    <div className="form-row">
                                        <Form.Group className="mb-3">
                                            <Form.Label>Phone Number</Form.Label>
                                            <Form.Control
                                                type="tel"
                                                name="phone_number"
                                                value={profileData.phone_number}
                                                onChange={handleProfileChange}
                                            />
                                            <Form.Text className="text-muted">
                                                Your current contact number
                                            </Form.Text>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Emergency Contact Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="emergency_contact_name"
                                                value={profileData.emergency_contact_name}
                                                onChange={handleProfileChange}
                                            />
                                            <Form.Text className="text-muted">
                                                Name of your emergency contact
                                            </Form.Text>
                                        </Form.Group>
                                    </div>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Emergency Contact Phone</Form.Label>
                                        <Form.Control
                                            type="tel"
                                            name="emergency_contact_phone"
                                            value={profileData.emergency_contact_phone}
                                            onChange={handleProfileChange}
                                        />
                                        <Form.Text className="text-muted">
                                            Phone number of your emergency contact
                                        </Form.Text>
                                    </Form.Group>

                                    <div className="form-row">
                                        <Form.Group className="mb-3">
                                            <Form.Label>Hospital Letter</Form.Label>
                                            <Form.Control
                                                type="file"
                                                name="hospital_letter"
                                                onChange={handleProfileChange}
                                                accept=".pdf,.doc,.docx"
                                            />
                                            <Form.Text className="text-muted">
                                                Upload your latest hospital letter (PDF, DOC, DOCX)
                                            </Form.Text>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Recipient Image</Form.Label>
                                            <Form.Control
                                                type="file"
                                                name="recipient_image"
                                                onChange={handleProfileChange}
                                                accept="image/*"
                                            />
                                            <Form.Text className="text-muted">
                                                Upload your recent photo
                                            </Form.Text>
                                        </Form.Group>
                                    </div>

                                    <Button
                                        type="submit"
                                        variant="primary"
                                        disabled={profileLoading}
                                        className="update-button"
                                    >
                                        {profileLoading ? 'Updating...' : 'Update Profile'}
                                    </Button>
                                </Form>
                        </Card.Body>
                    </Card>
                    </div>
                ) : (
                    <div className="recipient-dashboard">
                        {/* Navigation Section */}
                        <div className="tab-navigation">
                            <ul className="tab-list">
                                <li 
                                    className={`tab-item ${activeTab === 'search' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('search')}
                                >
                                    <i className="fas fa-search"></i>
                                    <span>Find Organs</span>
                                </li>
                                <li 
                                    className={`tab-item ${activeTab === 'matches' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('matches')}
                                >
                                    <i className="fas fa-heart"></i>
                                    <span>Matching Donations</span>
                                </li>
                                <li 
                                    className={`tab-item ${activeTab === 'requests' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('requests')}
                                >
                                    <i className="fas fa-clock"></i>
                                    <span>My Requests</span>
                                </li>
                                <li 
                                    className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('history')}
                                >
                                    <i className="fas fa-history"></i>
                                    <span>History</span>
                                </li>
                            </ul>
                        </div>

                        {/* Tab Content */}
                        <div className="tab-content">
                            {/* Search Tab */}
                            <div className={`tab-pane ${activeTab === 'search' ? 'active' : ''}`}>
                                <div className="search-section">
                                    <h2 className="section-title">Search for Organs</h2>
                                    <div className="search-container">
                                        <Form onSubmit={handleSearch}>
                                            <div className="search-bar-container">
                                                <div className="search-input-group">
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Search for organs..."
                                                        value={searchParams.organ_type}
                                                        onChange={(e) => handleInputChange('organ_type', e.target.value)}
                                                        className="search-input"
                                                    />
                                                    <Button 
                                                        variant="link" 
                                                        className="filter-toggle"
                                                        onClick={() => setShowFilters(!showFilters)}
                                                    >
                                                        <i className="fas fa-filter"></i>
                                                    </Button>
                                                    <Button type="submit" className="search-button">
                                                        <i className="fas fa-search"></i>
                                                    </Button>
                                                </div>
                                            </div>

                                            {showFilters && (
                                                <div className="search-filters">
                                                    <div className="filter-row">
                                                        <Form.Group>
                                                            <Form.Label>Blood Type</Form.Label>
                                                            <Form.Select
                                                                value={searchParams.blood_type}
                                                                onChange={(e) => handleInputChange('blood_type', e.target.value)}
                                                            >
                                                                <option value="">Any</option>
                                                                <option value="A+">A+</option>
                                                                <option value="A-">A-</option>
                                                                <option value="B+">B+</option>
                                                                <option value="B-">B-</option>
                                                                <option value="AB+">AB+</option>
                                                                <option value="AB-">AB-</option>
                                                                <option value="O+">O+</option>
                                                                <option value="O-">O-</option>
                                                            </Form.Select>
                                                        </Form.Group>

                                                        <Form.Group>
                                                            <Form.Label>Location</Form.Label>
                                                            <Form.Control
                                                                type="text"
                                                                value={searchParams.location}
                                                                onChange={(e) => handleInputChange('location', e.target.value)}
                                                                placeholder="Enter location"
                                                            />
                                                        </Form.Group>

                                                        <Form.Group>
                                                            <Form.Label>Urgency Level</Form.Label>
                                                            <Form.Select
                                                                value={searchParams.urgency_level}
                                                                onChange={(e) => handleInputChange('urgency_level', e.target.value)}
                                                            >
                                                                <option value="">Any</option>
                                                                <option value="high">High</option>
                                                                <option value="medium">Medium</option>
                                                                <option value="low">Low</option>
                                                            </Form.Select>
                                                        </Form.Group>
                                                    </div>

                                                    <div className="filter-row">
                                                        <Form.Group>
                                                            <Form.Label>Age Range</Form.Label>
                                                            <div className="age-range">
                                                                <Form.Control
                                                                    type="number"
                                                                    placeholder="Min"
                                                                    value={searchParams.min_age}
                                                                    onChange={(e) => handleInputChange('min_age', e.target.value)}
                                                                />
                                                                <span>to</span>
                                                                <Form.Control
                                                                    type="number"
                                                                    placeholder="Max"
                                                                    value={searchParams.max_age}
                                                                    onChange={(e) => handleInputChange('max_age', e.target.value)}
                                                                />
                                                            </div>
                                                        </Form.Group>

                                                        <Form.Group>
                                                            <Form.Label>Sort By</Form.Label>
                                                            <Form.Select
                                                                value={searchParams.sort_by}
                                                                onChange={(e) => handleInputChange('sort_by', e.target.value)}
                                                            >
                                                                <option value="date_created">Most Recent</option>
                                                                <option value="match_score">Match Score</option>
                                                                <option value="urgency">Urgency</option>
                                                            </Form.Select>
                                                        </Form.Group>
                                                    </div>
                                                </div>
                                            )}
                                        </Form>
                                    </div>

                                    {/* Search Results */}
                                    {loading ? (
                                        <div className="loading-container">
                                            <div className="spinner"></div>
                                            <p>Loading...</p>
                                        </div>
                                    ) : error ? (
                                        <div className="error-message">
                                            <p>{error}</p>
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        renderDonations(searchResults)
                                    ) : (
                                        <div className="empty-state">
                                            <i className="fas fa-search"></i>
                                            <p>No results found. Try adjusting your search criteria.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Matches Tab */}
                            <div className={`tab-pane ${activeTab === 'matches' ? 'active' : ''}`}>
                                <div className="matching-donations-section">
                                    <h2 className="section-title">Matching Donations</h2>
                                    {loading ? (
                                        <div className="loading-container">
                                            <div className="spinner"></div>
                                            <p>Loading...</p>
                                        </div>
                                    ) : error ? (
                                        <div className="error-message">
                                            <p>{error}</p>
                                        </div>
                                    ) : matchingDonations.length > 0 ? (
                                        renderDonations(matchingDonations)
                                    ) : (
                                        <div className="empty-state">
                                            <i className="fas fa-heartbeat"></i>
                                            <p>No matching donations found at the moment.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Requests Tab */}
                            <div className={`tab-pane ${activeTab === 'requests' ? 'active' : ''}`}>
                                <div className="requests-section">
                                    <h2 className="section-title">My Requests</h2>
                                    {renderMyRequests()}
                                </div>
                            </div>

                            {/* History Tab */}
                            <div className={`tab-pane ${activeTab === 'history' ? 'active' : ''}`}>
                                <div className="history-section">
                                    <h2 className="section-title">Donation History</h2>
                                    {historyLoading ? (
                                        <div className="loading-container">
                                            <div className="spinner"></div>
                                            <p>Loading history...</p>
                                        </div>
                                    ) : historyError ? (
                                        <div className="error-message">
                                            <p>{historyError}</p>
                                            <button 
                                                className="btn-primary retry-button" 
                                                onClick={fetchDonationHistory}
                                                disabled={historyLoading}
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    ) : donationHistory.length === 0 ? (
                                        <div className="empty-state">
                                            <i className="fas fa-history"></i>
                                            <p>No donation history available yet.</p>
                                            <p>Your donation requests and their status will appear here.</p>
                                        </div>
                                    ) : (
                                        <div className="history-list">
                                            {donationHistory.map((request) => (
                                                <div key={request.id} className="history-item">
                                                    <div className="history-header">
                                                        <h3>{request.organ.organ_name}</h3>
                                                        <span className={`status-badge ${request.status.toLowerCase()}`}>
                                                            {request.status_display}
                                                        </span>
                                                    </div>
                                                    <div className="history-details">
                                                        <p><strong>Blood Type:</strong> {request.organ.blood_type}</p>
                                                        <p><strong>Location:</strong> {request.organ.location}</p>
                                                        <p><strong>Requested:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
                                                        {request.message && (
                                                            <p><strong>Your Message:</strong> {request.message}</p>
                                                        )}
                                                    </div>
                                                    <div className="history-timeline">
                                                        <div className="timeline-item">
                                                            <i className="fas fa-clock"></i>
                                                            <span>Request sent on {new Date(request.created_at).toLocaleString()}</span>
                                                        </div>
                                                        {request.status !== 'pending' && (
                                                            <div className="timeline-item">
                                                                <i className="fas fa-check-circle"></i>
                                                                <span>Status updated to {request.status_display} on {new Date(request.updated_at).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
