import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { FaArrowLeft, FaCalendarAlt } from 'react-icons/fa';
import announcementService, { Announcement } from '../../services/announcementService';

const Announcements = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id) {
          const announcement = await announcementService.getAnnouncement(parseInt(id));
          setSelectedAnnouncement(announcement);
        } else {
          const announcementsData = await announcementService.getAnnouncements();
          setAnnouncements(announcementsData);
        }
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setError('Failed to load announcements');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const renderMedia = (announcement: Announcement) => {
    if (announcement.media_type === 'image' && announcement.image_url) {
      return (
        <div className="announcement-media mb-3">
          <img 
            src={announcement.image_url} 
            alt={announcement.title}
            className="img-fluid rounded"
            style={{ maxHeight: '600px', width: '100%', objectFit: 'contain' }}
          />
        </div>
      );
    } else if (announcement.media_type === 'video' && announcement.video_url) {
      return (
        <div className="announcement-media mb-3">
          <video 
            controls 
            className="w-100 rounded"
            style={{ maxHeight: '600px' }}
          >
            <source src={announcement.video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">Loading...</div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <div className="alert alert-danger">{error}</div>
      </Container>
    );
  }

  if (id && selectedAnnouncement) {
    return (
      <Container className="py-4">
        <Button
          variant="link"
          className="mb-3 p-0"
          onClick={() => navigate('/dashboard/announcements')}
        >
          <FaArrowLeft className="me-2" />
          Back to Announcements
        </Button>
        <Card>
          <Card.Body>
            <h2 className="mb-3">{selectedAnnouncement.title}</h2>
            <div className="text-muted mb-4">
              <FaCalendarAlt className="me-2" />
              {new Date(selectedAnnouncement.created_at).toLocaleDateString()}
            </div>
            {renderMedia(selectedAnnouncement)}
            <div className="announcement-content">
              {selectedAnnouncement.message}
            </div>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">Announcements</h2>
      {announcements.length === 0 ? (
        <div className="text-center p-4">
          <p className="text-muted">No announcements at this time.</p>
        </div>
      ) : (
        <Row className="g-4">
          {announcements.map((announcement) => (
            <Col key={announcement.id} xs={12} md={6} lg={4}>
              <Card className="h-100">
                <Card.Body>
                  {announcement.media_type === 'image' && announcement.image_url && (
                    <div className="mb-3">
                      <img 
                        src={announcement.image_url} 
                        alt={announcement.title}
                        className="img-fluid rounded"
                        style={{ maxHeight: '300px', width: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  <Card.Title>{announcement.title}</Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">
                    <FaCalendarAlt className="me-2" />
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </Card.Subtitle>
                  <Card.Text className="text-truncate">
                    {announcement.message}
                  </Card.Text>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => navigate(`/dashboard/announcements/${announcement.id}`)}
                  >
                    Read More
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default Announcements; 