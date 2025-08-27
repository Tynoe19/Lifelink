import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { organsAPI } from '../../services/api';
import { Organ as APIOrgan } from '../../services/api';
import { Organ as DonationOrgan } from '../../types/donations';
import NewOrganListing from '../Dashboard/NewOrganListing';
import { Button, Form, Table, Nav, TabContent, TabPane, Container, Row, Col, Card, Modal, Accordion } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaTint, FaMapMarkerAlt, FaHeartbeat, FaTimes, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import activityService from '../../services/activityService';

// Use the API Organ type for consistency
type Organ = APIOrgan;

interface MatchResponse {
  matches: Array<{
    organ: Organ;
    match_score: number;
    match_details: {
      blood_type_match: {
        score: number;
        compatible: boolean;
      };
      hla_match: {
        score: number;
        level: 'PERFECT' | 'GOOD' | 'FAIR' | 'POOR';
      };
      age_match: {
        score: number;
        difference: number;
      };
      height_match: {
        score: number;
        difference: number;
      };
      location_match: {
        score: number;
        distance: string;
      };
    };
  }>;
}

interface OrganRequest {
  id: number;
  organ: Organ;
  organ_details: Organ;
  recipient: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    blood_type: string;
    city: string;
    country: string;
    gender: string;
    date_of_birth: string;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    is_verified: boolean;
    is_active: boolean;
    user_type: string;
    urgency_level: string | null;
  };
  status: string;
  status_display: string;
  message: string;
  created_at: string;
  updated_at: string;
}

interface MatchDetails {
  blood_type_match: {
    score: number;
    compatible: boolean;
  };
  hla_match: {
    score: number;
    level: 'PERFECT' | 'GOOD' | 'FAIR' | 'POOR';
  };
  age_match: {
    score: number;
    difference: number;
  };
  height_match: {
    score: number;
    difference: number;
  };
  location_match: {
    score: number;
    distance: string;
  };
}

interface OrganMatch {
  id: number;
  organ: Organ;
  match_score: number;
  match_details: MatchDetails;
  is_notified: boolean;
  date_created: string;
  date_updated: string;
}

interface APIResponse<T> {
    data: T | { results: T[] };
}

// Add custom styles
const tabStyles = {
  '.nav-tabs .nav-link': {
    color: '#495057',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderBottom: 'none',
    marginRight: '2px',
    padding: '0.5rem 1rem',
    fontWeight: '500',
    '&:hover': {
      backgroundColor: '#e9ecef',
      borderColor: '#dee2e6',
      color: '#212529'
    }
  },
  '.nav-tabs .nav-link.active': {
    color: '#fff',
    backgroundColor: '#0d6efd',
    borderColor: '#dee2e6',
    fontWeight: '600'
  }
};

const OrganListings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [organs, setOrgans] = useState<Organ[]>([]);
  const [requests, setRequests] = useState<OrganRequest[]>([]);
  const [myRequests, setMyRequests] = useState<OrganRequest[]>([]);
  const [potentialMatches, setPotentialMatches] = useState<Organ[]>([]);
  const [activeTab, setActiveTab] = useState<'listings' | 'requests' | 'my-requests' | 'potential-matches' | 'available-organs'>(
    user?.user_type === 'recipient'
      ? (user?.profile_complete ? 'my-requests' : 'potential-matches')
      : 'listings'
  );
  const [selectedOrgan, setSelectedOrgan] = useState<Organ | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalMode, setModalMode] = useState<'edit' | 'view' | 'new'>('new');
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [matches, setMatches] = useState<MatchResponse['matches']>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestedOrgans, setRequestedOrgans] = useState<Set<number>>(new Set());

  // Fetch data for donors and recipients
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (user?.user_type === 'recipient') {
          console.log('Fetching recipient requests...');
          const reqRes = await organsAPI.getMyRequests();
          console.log('Recipient requests response:', reqRes.data);
          const requests = Array.isArray(reqRes.data) ? reqRes.data : ((reqRes.data as any)?.results ?? []);
          setMyRequests(requests);
          // Initialize requestedOrgans with existing requests
          setRequestedOrgans(new Set(requests.map((req: OrganRequest) => req.organ.id)));
          console.log('Set myRequests state:', requests);
          const matchesRes = await organsAPI.getMatches();
          console.log('Matches response:', matchesRes.data);
          if (matchesRes.data && matchesRes.data.matches) {
            setPotentialMatches(matchesRes.data.matches.map((match: MatchResponse['matches'][0]) => match.organ));
          } else {
            setPotentialMatches([]);
          }
        } else {
          console.log('Fetching donor organs and requests...');
          const organsRes = await organsAPI.getMyOrgans();
          console.log('Donor organs response:', organsRes.data);
          setOrgans(Array.isArray(organsRes.data) ? organsRes.data : ((organsRes.data as any)?.results ?? []));
          const reqRes = await organsAPI.getRecipientRequestsForMyOrgans();
          console.log('Donor requests response:', reqRes.data);
          console.log('First request recipient data:', reqRes.data?.[0]?.recipient);
          setRequests(Array.isArray(reqRes.data) ? reqRes.data : ((reqRes.data as any)?.results ?? []));
          console.log('Set requests state:', Array.isArray(reqRes.data) ? reqRes.data : ((reqRes.data as any)?.results ?? []));
        }
      } catch (err: any) {
        if (err.response?.status === 404 && user?.user_type === 'recipient') {
          // No requests found, just set empty state
          setMyRequests([]);
          setRequestedOrgans(new Set());
        } else {
          setError('Failed to fetch data');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (user?.user_type === 'recipient') {
      fetchMatches();
    }
  }, [user]);

  const fetchMatches = async () => {
    try {
      console.log('Fetching matches...');
      const response = await organsAPI.getMatches();
      console.log('Matches response:', response.data);
      if (response.data && response.data.matches) {
        setMatches(response.data.matches);
      } else {
        console.warn('No matches found in response:', response.data);
        setMatches([]);
      }
    } catch (error: any) {
      console.error('Error fetching matches:', error);
      if (error.response?.status === 404) {
        setError('No potential matches found at this time. Please check back later.');
      } else {
        setError('Failed to fetch matches. Please try again later.');
      }
      setMatches([]);
    }
  };

  // Add handlers for restricted feature access
  const handleRestrictedFeatureAccess = (feature: string) => {
    if (!user?.profile_complete) {
      const message = user?.user_type === 'recipient' 
        ? 'Please complete your profile and add an organ request before accessing this feature.'
        : 'Please complete your profile before accessing this feature.';
      toast.error(message);
      setShowProfileModal(true);
      return false;
    }
    return true;
  };

  // Update tab change handler
  const handleTabChange = (tab: 'listings' | 'requests' | 'my-requests' | 'potential-matches' | 'available-organs') => {
    if (tab === 'potential-matches' && !handleRestrictedFeatureAccess('potential-matches')) {
      return;
    }
    setActiveTab(tab);
  };

  // Update new listing button click handler
  const handleNewListingClick = () => {
    if (!handleRestrictedFeatureAccess('new-listing')) {
      return;
    }
    setModalMode('new');
    setSelectedOrgan(null);
    setShowEditModal(true);
  };

  // Filtered data
  const filteredOrgans = organs.filter(o =>
    o.organ_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.blood_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.additional_notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMyRequests = myRequests.filter(r => {
    if (!searchTerm) return true;
    return (
      (r.organ?.organ_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.organ?.blood_type?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.status?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const filteredPotentialMatches = matches.filter((match: MatchResponse['matches'][0]) =>
    match.organ.organ_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.organ.blood_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.organ.additional_notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.match_score.toString().includes(searchTerm.toLowerCase()) ||
    match.match_details.blood_type_match.compatible.toString().includes(searchTerm.toLowerCase())
  );

  // Action handlers
  const handleEdit = async (organ: Organ) => {
    setSelectedOrgan(organ);
    setModalMode('edit');
    setShowEditModal(true);
  };

  const handleDelete = async (organ: Organ) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      setLoading(true);
      try {
        await organsAPI.delete(organ.id);
        toast.success('Organ listing deleted successfully');
        // Refresh list
        const organsRes = await organsAPI.getMyOrgans();
        setOrgans(Array.isArray(organsRes.data) ? organsRes.data : ((organsRes.data as any)?.results ?? []));
        // Track activity
        await activityService.trackOrganDelete(organ.organ_name);
      } catch (err: any) {
        console.error('Error deleting organ:', err);
        if (err.response?.status === 403) {
          toast.error('You are not authorized to delete this organ listing. Only the original donor can delete their listings.');
        } else if (err.response?.status === 404) {
          toast.error('Organ listing not found. It may have already been deleted.');
        } else if (err.response?.status === 400) {
          toast.error('Cannot delete this listing because it has active requests. Please handle any pending requests first.');
        } else {
          toast.error('Failed to delete organ listing. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleView = (organ: Organ) => {
    setSelectedOrgan(organ);
    setModalMode('view');
    setShowEditModal(true);
    // Track activity
    activityService.trackOrganView(organ.organ_name);
  };

  // Connect handler for recipients
  const handleConnect = async (organId: number) => {
    try {
      await organsAPI.requestOrgan(organId, 'I would like to request this organ.');
      // Update the requested organs set
      setRequestedOrgans(prev => new Set([...prev, organId]));
      toast.success('Connection request sent successfully');
      // Refresh matches
      await fetchMatches();
      // Switch to my requests tab
      setActiveTab('my-requests');
    } catch (error: any) {
      console.error('Error sending connection request:', error);
      if (error.response?.data?.error === 'You have already requested this organ.') {
        // If already requested, add to the set and show message
        setRequestedOrgans(prev => new Set([...prev, organId]));
        setRequestError('You have already requested this organ. Please check your requests.');
        setTimeout(() => setRequestError(null), 5000);
        setActiveTab('my-requests');
      } else if (error.response?.data?.error) {
        setRequestError(error.response.data.error);
        setTimeout(() => setRequestError(null), 5000);
      } else {
        setRequestError('Failed to send connection request. Please try again.');
        setTimeout(() => setRequestError(null), 5000);
      }
      toast.error('Failed to send connection request');
    }
  };

  // Accept/Reject handlers for donors
  const handleRequestAccept = async (request: OrganRequest) => {
    try {
      await organsAPI.acceptRequest(request.id);
      // Refresh both organs and requests lists
      const [organsRes, reqRes] = await Promise.all([
        organsAPI.getMyOrgans(),
        organsAPI.getRecipientRequestsForMyOrgans()
      ]);
      
      const organsData = Array.isArray(organsRes.data) 
        ? organsRes.data 
        : ((organsRes.data as any)?.results ?? []);
      setOrgans(organsData);
      
      const requestsData = Array.isArray(reqRes.data)
        ? reqRes.data
        : ((reqRes.data as any)?.results ?? []);
      setRequests(requestsData);
      
      // Track activity
      await activityService.trackRequestAccepted(
        request.organ.organ_name,
        `${request.recipient.first_name} ${request.recipient.last_name}`
      );
    } catch (err: any) {
      console.error('Error accepting request:', err);
      setError('Failed to accept request');
    }
  };

  const handleRequestReject = async (request: OrganRequest) => {
    try {
      await organsAPI.rejectRequest(request.id);
      const reqRes = await organsAPI.getRecipientRequestsForMyOrgans();
      const requestsData = Array.isArray(reqRes.data)
        ? reqRes.data
        : ((reqRes.data as any)?.results ?? []);
      setRequests(requestsData);
      // Track activity
      await activityService.trackRequestRejected(
        request.organ.organ_name,
        `${request.recipient.first_name} ${request.recipient.last_name}`
      );
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      setError('Failed to reject request');
    }
  };

  // Table renderers
  const renderListingsTable = () => {
    if (filteredOrgans.length === 0) {
      return (
        <div className="text-center p-4">
          <p className="text-muted">You have no organ listings yet.</p>
        </div>
      );
    }
    return (
      <Row className="g-4">
        {filteredOrgans.map(organ => {
          const listedDate = organ.date_created ? new Date(organ.date_created).toLocaleDateString() : '-';
          return (
            <Col key={organ.id} xs={12} md={6} lg={4}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <Card.Title as="h5" className="mb-1">{organ.organ_name ? organ.organ_name.charAt(0).toUpperCase() + organ.organ_name.slice(1) : '-'}</Card.Title>
                      <div className="text-muted small mb-1">
                        <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Blood Type:</span> {organ.blood_type}
                      </div>
                      <div className="text-muted small mb-1">
                        <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Listed Date:</span> {listedDate}
                      </div>
                      <div className="text-muted small mb-1">
                        <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Status:</span> <span className={`badge ${organ.is_available ? 'bg-success' : 'bg-warning'}`}>{organ.is_available ? 'Available' : 'Unavailable'}</span>
                      </div>
                    </div>
                  </div>
                  <hr className="my-2" />
                  <div className="mb-2 small">
                    <div className="mb-1">
                      <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Medical Notes:</span> {organ.additional_notes || '-'}
                    </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <Button variant="link" size="sm" onClick={() => handleEdit(organ)} title="Edit"><i className="bi bi-pencil-square" /></Button>
                    <Button variant="link" size="sm" onClick={() => handleDelete(organ)} title="Delete"><i className="bi bi-trash" /></Button>
                    <Button variant="link" size="sm" onClick={() => handleView(organ)} title="View"><i className="bi bi-box-arrow-up-right" /></Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  // Recipient: My Requests Card Grid
  const renderMyRequestsCards = () => {
    if (filteredMyRequests.length === 0) {
      return (
        <div className="text-center p-4">
          <p className="text-muted">You haven't made any organ requests yet.</p>
          <p className="text-muted">Go to the "Potential Matches" tab to find and request available organs.</p>
        </div>
      );
    }

    // Create a map to track unique donor numbers
    const donorNumberMap = new Map();
    let donorCounter = 1;

    return (
      <Row className="g-4">
        {filteredMyRequests.map(req => {
          // Get or assign a number for this donor
          let donorNumber = donorNumberMap.get(req.organ?.donor?.id);
          if (!donorNumber) {
            donorNumber = donorCounter++;
            donorNumberMap.set(req.organ?.donor?.id, donorNumber);
          }

          const organType = req.organ?.organ_name ? req.organ.organ_name.charAt(0).toUpperCase() + req.organ.organ_name.slice(1) : 'Not specified';
          const bloodType = req.organ?.blood_type || 'Not specified';
          const location = req.organ?.location || 'Not specified';
          const status = req.status || 'Pending';
          const date = req.created_at ? new Date(req.created_at).toLocaleDateString() : '-';
          const donorName = `Anonymous Donor ${donorNumber}`;
          
          return (
            <Col key={req.id} xs={12} md={6} lg={4}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <Card.Title as="h5" className="mb-1">{organType}</Card.Title>
                      <div className="text-muted small mb-1">
                        <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Blood Type:</span> {bloodType}
                      </div>
                      <div className="text-muted small mb-1">
                        <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Location:</span> {location}
                      </div>
                      <div className="text-muted small mb-1">
                        <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Requested on:</span> {date}
                      </div>
                    </div>
                    <span className={`badge ${
                      status.toLowerCase() === 'pending' ? 'bg-warning' : 
                      status.toLowerCase() === 'accepted' ? 'bg-success' : 
                      'bg-danger'
                    }`} style={{fontSize: '1rem', padding: '0.5em 0.75em'}}>
                      {status}
                    </span>
                  </div>
                  <hr className="my-2" />
                  <div className="mb-2 small">
                    {req.message && (
                      <div className="mb-1">
                        <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Message:</span> {req.message}
                      </div>
                    )}
                    <div className="mb-1">
                      <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Donor:</span> {donorName}
                    </div>
                    {req.organ?.medical_history && (
                      <div className="mb-1">
                        <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Medical History:</span> {req.organ.medical_history}
                      </div>
                    )}
                    {req.organ?.additional_notes && (
                      <div className="mb-1">
                        <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Additional Notes:</span> {req.organ.additional_notes}
                      </div>
                    )}
                  </div>
                  {status.toLowerCase() === 'pending' && (
                    <div className="d-flex justify-content-end">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteRequest(req)}
                      >
                        <FaTimes className="me-1" /> Cancel Request
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  // Recipient: Potential Matches Card Grid
  const renderPotentialMatchesTable = () => {
    if (matches.length === 0) {
      return (
        <div className="text-center p-4">
          <p className="text-muted">No potential matches found at this time.</p>
          <p className="text-muted">We'll notify you when new matches become available.</p>
        </div>
      );
    }

    return (
      <>
        {requestError && (
          <div className="alert alert-danger text-center mb-3" role="alert">
            {requestError}
          </div>
        )}
        <Row className="g-4">
          {filteredPotentialMatches.map((match: MatchResponse['matches'][0]) => {
            // Fix for linter: ensure numbers for toFixed
            const bloodTypeScore = Number(
              typeof match.match_details.blood_type_match.score === 'number'
                ? match.match_details.blood_type_match.score
                : 0
            ).toFixed(2);
            const ageScore = Number(
              typeof match.match_details.age_match.score === 'number'
                ? match.match_details.age_match.score
                : 0
            ).toFixed(2);
            const ageDiff = Number(
              typeof match.match_details.age_match.difference === 'number'
                ? match.match_details.age_match.difference
                : 0
            ).toFixed(2);
            const heightScore = Number(
              typeof match.match_details.height_match.score === 'number'
                ? match.match_details.height_match.score
                : 0
            ).toFixed(2);
            const heightDiff = Number(
              typeof match.match_details.height_match.difference === 'number'
                ? match.match_details.height_match.difference
                : 0
            ).toFixed(2);
            const weightScore = Number(
              match.match_details.weight_match && typeof match.match_details.weight_match.score === 'number'
                ? match.match_details.weight_match.score
                : 0
            ).toFixed(2);
            const weightDiff = Number(
              match.match_details.weight_match && typeof match.match_details.weight_match.difference === 'number'
                ? match.match_details.weight_match.difference
                : 0
            ).toFixed(2);
            const locationScore = Number(
              typeof match.match_details.location_match.score === 'number'
                ? match.match_details.location_match.score
                : 0
            ).toFixed(2);
            const locationDistance =
              typeof match.match_details.location_match.distance === 'number'
                ? Number(match.match_details.location_match.distance).toFixed(2)
                : match.match_details.location_match.distance;

            // Check if this organ has been requested
            const isRequested = requestedOrgans.has(match.organ.id);
            
            return (
              <Col key={match.organ.id} xs={12} md={6} lg={4}>
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <Card.Title as="h5" className="mb-1">{match.organ.organ_name}</Card.Title>
                        <div className="text-muted small mb-1">
                          <strong>Blood Type:</strong> {match.organ.blood_type}
                        </div>
                        <div className="text-muted small mb-1">
                          <strong>Location:</strong> {match.organ.location}
                        </div>
                      </div>
                      <span className={`badge ${getScoreColor(match.match_score)}`} style={{fontSize: '1rem', padding: '0.5em 0.75em'}}>
                        {match.match_score}%
                      </span>
                    </div>
                    <hr className="my-2" />
                    <div className="mb-2 small">
                      <div className="mb-1">
                        <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Blood Type Match:</span> {bloodTypeScore}% {match.match_details.blood_type_match.compatible ? <span className="text-success">&#10003;</span> : <span className="text-danger">&#10007;</span>}
                      </div>
                      <div className="mb-1">
                        <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Age Difference:</span> {ageScore}% (Diff: {ageDiff} years)
                      </div>
                      <div className="mb-1">
                        <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Height Difference:</span> {heightScore}% (Diff: {heightDiff} cm)
                      </div>
                      <div className="mb-1">
                        <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Weight Difference:</span> {weightScore}% (Diff: {weightDiff} kg)
                      </div>
                      <div className="mb-1">
                        <span style={{fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 600, color: '#334155'}}>Location Distance:</span> {locationScore}% ({locationDistance})
                      </div>
                    </div>
                    <div className="d-flex justify-content-end">
                      {isRequested ? (
                        <Button 
                          variant="success" 
                          size="sm" 
                          disabled
                          className="d-flex align-items-center gap-1"
                          style={{
                            backgroundColor: '#198754',
                            borderColor: '#198754',
                            opacity: 0.8,
                            cursor: 'not-allowed'
                          }}
                        >
                          <i className="bi bi-check-circle-fill me-1" /> Requested
                          <span className="ms-1 small">(View in My Requests)</span>
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleConnect(match.organ.id)}
                          disabled={!match.match_details.blood_type_match.compatible}
                          className="d-flex align-items-center gap-1"
                        >
                          {!match.match_details.blood_type_match.compatible ? (
                            <>
                              <i className="bi bi-exclamation-circle me-1" />
                              Incompatible Blood Type
                            </>
                          ) : (
                            <>
                              <i className="bi bi-heart-fill me-1" />
                              Request Match
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      </>
    );
  };

  // Add delete request handler
  const handleDeleteRequest = async (request: OrganRequest) => {
    if (window.confirm('Are you sure you want to cancel this request?')) {
      try {
        setLoading(true);
        await organsAPI.cancelRequest(request.id);
        setSuccessMsg('Request cancelled successfully!');
        // Refresh recipient requests
        const reqRes = await organsAPI.getMyRequests();
        setMyRequests(Array.isArray(reqRes.data) ? reqRes.data : ((reqRes.data as any)?.results ?? []));
      } catch (err) {
        setError('Failed to cancel request. Please try again later.');
      } finally {
        setLoading(false);
        setTimeout(() => setSuccessMsg(''), 3000);
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleCompleteProfile = () => {
    setShowProfileModal(false);
    navigate('/dashboard/profile');
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const renderRequestsTable = () => {
    if (requests.length === 0) {
      return (
        <div className="text-center p-4">
          <p className="text-muted">No recipient requests for your organs yet.</p>
        </div>
      );
    }

    return (
      <Row className="g-4">
        {requests.map(request => {
          const organType = request.organ?.organ_name || 'Not specified';
          const location = request.organ?.location || 'Not specified';
          const status = request.status?.toLowerCase();
          const statusDisplay = request.status_display || status;
          const date = request.created_at ? new Date(request.created_at).toLocaleDateString() : '-';
          return (
            <Col key={request.id} xs={12} md={6} lg={4}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <div className="fw-bold mb-1">{request.recipient.first_name} {request.recipient.last_name}</div>
                      <div className="text-muted small mb-1">Requested on: {date}</div>
                    </div>
                    <span className={`badge ${status === 'accepted' ? 'bg-success' : status === 'pending' ? 'bg-warning' : 'bg-danger'}`} style={{fontSize: '1rem', padding: '0.5em 0.75em'}}>
                      {statusDisplay?.toUpperCase()}
                    </span>
                  </div>
                  <div className="mb-2">
                    <div><strong>Organ Type:</strong> {organType.charAt(0).toUpperCase() + organType.slice(1)}</div>
                    <div><strong>Location:</strong> {location}</div>
                  </div>
                  {request.message && (
                    <div className="mb-2">
                      <strong>Message:</strong> {request.message}
                    </div>
                  )}
                  {status === 'pending' && (
                    <div className="d-flex justify-content-end gap-2 mt-2">
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => handleRequestAccept(request as OrganRequest)}
                      >
                        <i className="bi bi-check-circle me-1" /> Accept
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRequestReject(request as OrganRequest)}
                      >
                        <i className="bi bi-x-circle me-1" /> Reject
                      </Button>
                    </div>
                  )}
                  {status === 'accepted' && (
                    <div className="mt-3 text-success d-flex align-items-center gap-2 fw-semibold">
                      <i className="bi bi-check-circle-fill me-1" /> Request Accepted
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  const handleCreate = async (formData: Partial<Organ>) => {
    try {
      const response = await organsAPI.create(formData);
      setOrgans([...organs, response.data]);
      setShowEditModal(false);
      // Track activity
      await activityService.trackOrganListing(response.data.organ_name);
    } catch (error) {
      console.error('Error creating organ listing:', error);
      setError('Failed to create organ listing');
    }
  };

  const handleUpdate = async (formData: Partial<Organ>) => {
    if (!selectedOrgan) return;
    
    try {
      const response = await organsAPI.update(selectedOrgan.id, formData);
      setOrgans(organs.map(organ => 
        organ.id === selectedOrgan.id ? response.data : organ
      ));
      setShowEditModal(false);
      // Track activity
      await activityService.trackOrganEdit(response.data.organ_name);
    } catch (error) {
      console.error('Error updating organ listing:', error);
      setError('Failed to update organ listing');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <>
      <Container fluid className="py-4">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h5 mb-0">Organ Matching Platform</h2>
              {user?.user_type === 'donor' && (
                <Button 
                  variant="primary" 
                  onClick={handleNewListingClick}
                >
                  <i className="bi bi-plus-lg me-1" /> New Listing
                </Button>
              )}
            </div>
            <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => handleTabChange(k as any)} className="mb-3">
              {user?.user_type === 'recipient' ? (
                <>
                  <Nav.Item>
                    <Nav.Link 
                      eventKey="my-requests" 
                      className={activeTab === 'my-requests' ? 'active' : ''}
                      style={{
                        color: activeTab === 'my-requests' ? '#fff' : '#fff',
                        backgroundColor: activeTab === 'my-requests' ? '#0d6efd' : '#6c757d',
                        borderColor: '#dee2e6',
                        borderBottom: 'none',
                        marginRight: '2px',
                        padding: '0.5rem 1rem',
                        fontWeight: activeTab === 'my-requests' ? '600' : '500'
                      }}
                    >
                      My Requests
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link 
                      eventKey="potential-matches" 
                      className={activeTab === 'potential-matches' ? 'active' : ''}
                      style={{
                        color: activeTab === 'potential-matches' ? '#fff' : '#fff',
                        backgroundColor: activeTab === 'potential-matches' ? '#0d6efd' : '#6c757d',
                        borderColor: '#dee2e6',
                        borderBottom: 'none',
                        marginRight: '2px',
                        padding: '0.5rem 1rem',
                        fontWeight: activeTab === 'potential-matches' ? '600' : '500'
                      }}
                    >
                      Potential Matches
                    </Nav.Link>
                  </Nav.Item>
                </>
              ) : (
                <>
                  <Nav.Item>
                    <Nav.Link 
                      eventKey="listings" 
                      className={activeTab === 'listings' ? 'active' : ''}
                      style={{
                        color: activeTab === 'listings' ? '#fff' : '#fff',
                        backgroundColor: activeTab === 'listings' ? '#0d6efd' : '#6c757d',
                        borderColor: '#dee2e6',
                        borderBottom: 'none',
                        marginRight: '2px',
                        padding: '0.5rem 1rem',
                        fontWeight: activeTab === 'listings' ? '600' : '500'
                      }}
                    >
                      My Listings
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link 
                      eventKey="requests" 
                      className={activeTab === 'requests' ? 'active' : ''}
                      style={{
                        color: activeTab === 'requests' ? '#fff' : '#fff',
                        backgroundColor: activeTab === 'requests' ? '#0d6efd' : '#6c757d',
                        borderColor: '#dee2e6',
                        borderBottom: 'none',
                        marginRight: '2px',
                        padding: '0.5rem 1rem',
                        fontWeight: activeTab === 'requests' ? '600' : '500'
                      }}
                    >
                      Recipient Requests
                    </Nav.Link>
                  </Nav.Item>
                </>
              )}
            </Nav>
            <Form.Control
              type="text"
              placeholder={user?.user_type === 'recipient'
                ? (activeTab === 'my-requests' ? 'Search your requests...' : 'Search potential matches...')
                : (activeTab === 'listings' ? 'Search available organ donations...' : 'Search recipient requests...')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="mb-3"
            />
            <TabContent>
              {user?.user_type === 'recipient' ? (
                <>
                  <TabPane active={activeTab === 'my-requests'}>
                    {renderMyRequestsCards()}
                  </TabPane>
                  <TabPane active={activeTab === 'potential-matches'}>
                    {renderPotentialMatchesTable()}
                  </TabPane>
                </>
              ) : (
                <>
                  <TabPane active={activeTab === 'listings'}>
                    {renderListingsTable()}
                  </TabPane>
                  <TabPane active={activeTab === 'requests'}>
                    {renderRequestsTable()}
                  </TabPane>
                </>
              )}
            </TabContent>
            {successMsg && <div className="alert alert-success">{successMsg}</div>}
            {error && filteredMyRequests.length > 0 && <div className="alert alert-danger">{error}</div>}
          </div>
          <div className="p-4">
            <Accordion>
              <Accordion.Item eventKey="0">
                <Accordion.Header>
                  <i className="bi bi-info-circle me-2"></i>
                  About Organ Donation
                </Accordion.Header>
                <Accordion.Body>
                  <div className="mb-4">
                    <h6 className="fw-bold">How the Matching System Works</h6>
                    <p>Our platform uses a simple matching algorithm that considers multiple factors to find potential organ matches:</p>
                    <ul>
                      <li>Blood type compatibility</li>
                      <li>Geographic location and distance</li>
                      <li>Medical urgency level</li>
                      <li>Size and age compatibility</li>
                      <li>Medical history and conditions</li>
                    </ul>
                  </div>

                  <div className="mb-4">
                    <h6 className="fw-bold">About Organ Donors</h6>
                    <p>Organ donors can be:</p>
                    <ul>
                      <li>Living donors - healthy individuals who can donate certain organs (like kidneys) or portions of organs (like liver)</li>
                      <li>Please comply to the rules and regulations of the platform. No fake profiles or information.</li>
                      <li>Report  any suspicious activity to the platform.</li>
                      <li>Donors have complete control over their donation process</li>
                    </ul>
                  </div>

                  <div className="mb-4">
                    <h6 className="fw-bold">Important Disclaimer</h6>
                    <div className="alert alert-warning">
                      <p className="mb-0"><strong>Please Note:</strong> This platform provides predictions for potential organ matches based on available medical data. All matches are preliminary and must be verified by medical professionals. We strongly recommend:</p>
                      <ul className="mb-0 mt-2">
                        <li>Consulting with your healthcare provider about any potential matches</li>
                        <li>Visiting a nearby hospital for comprehensive medical evaluation</li>
                        <li>Following official medical protocols for organ transplantation</li>
                        <li>Understanding that final compatibility is determined by medical professionals</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h6 className="fw-bold">Safety and Privacy</h6>
                    <ul>
                      <li>All user information is kept strictly confidential</li>
                      <li>Communication between donors and recipients is secure</li>
                      <li>See suggested hospotals and visit for more medical facilities</li>
                      <li>24/7 medical support available for both donors and recipients</li>
                    </ul>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </div>
          <NewOrganListing
            show={showEditModal}
            onHide={() => setShowEditModal(false)}
            onSuccess={async () => {
              setShowEditModal(false);
              // Refresh list
              const organsRes = await organsAPI.getMyOrgans();
              setOrgans(Array.isArray(organsRes.data) ? organsRes.data : ((organsRes.data as any)?.results ?? []));
            }}
            user={user as any}
            organ={modalMode === 'edit' || modalMode === 'view' ? (selectedOrgan ?? undefined) : undefined}
            readOnly={false}
          />
        </div>
      </Container>

      <Modal show={showProfileModal} onHide={() => setShowProfileModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Complete Your Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Please complete your profile to access this feature.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProfileModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleCompleteProfile}>
            Complete Profile
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default OrganListings;
