import React, { useState, useEffect, ChangeEvent } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { organsAPI } from '../../services/api';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface Organ {
    id: number;
    organ_name: string;
    additional_notes: string;
    is_available: boolean;
    donor?: {
        id: number;
        city?: string;
        country?: string | {
            code: string;
            name: string;
        };
    };
}

interface User {
    id: number;
    blood_type: string;
    city: string;
    country: string | {
        code: string;
        name: string;
    };
    fullname?: string;
    gender?: string;
    age?: number;
    user_type: string;
    profile_complete: boolean;
}

interface OrganType {
    value: string;
    label: string;
    description: string;
}

interface NewOrganListingProps {
    show: boolean;
    onHide: () => void;
    onSuccess: () => void;
    user: User;
    organ?: Organ;
    readOnly?: boolean;
}

interface FormData {
    organ_name: string;
    additional_notes: string;
    is_available: boolean;
    location: string;
}

const NewOrganListing: React.FC<NewOrganListingProps> = ({ show, onHide, onSuccess, user, organ, readOnly }) => {
    const navigate = useNavigate();
    const { updateUser } = useAuth();
    const [formData, setFormData] = useState<FormData>({
        organ_name: '',
        additional_notes: '',
        is_available: true,
        location: `${user.city}, ${typeof user.country === 'object' ? user.country.name : user.country}`
    });
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [existingOrgans, setExistingOrgans] = useState<Organ[]>([]);
    const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

    // Update form data when organ prop changes (for editing)
    useEffect(() => {
        if (organ) {
            setFormData({
                organ_name: organ.organ_name,
                additional_notes: organ.additional_notes || '',
                is_available: organ.is_available,
                location: organ.donor ? 
                    `${organ.donor.city || ''}, ${typeof organ.donor.country === 'object' ? organ.donor.country.name : organ.donor.country || ''}` : 
                    `${user.city}, ${typeof user.country === 'object' ? user.country.name : user.country}`
            });
        } else {
            setFormData({
                organ_name: '',
                additional_notes: '',
                is_available: true,
                location: `${user.city}, ${typeof user.country === 'object' ? user.country.name : user.country}`
            });
        }
    }, [organ, user.city, user.country]);

    // Fetch user's existing organ listings
    useEffect(() => {
        const fetchUserOrgans = async (): Promise<void> => {
            try {
                const response = await organsAPI.search();
                if (response.data) {
                    const userOrgans = Array.isArray(response.data) 
                        ? response.data 
                        : (response.data as any).results || [];
                    
                    const filteredOrgans = userOrgans.filter(
                        (organ: Organ) => organ.donor && typeof organ.donor === 'object' && organ.donor.id === user.id
                    );
                    setExistingOrgans(filteredOrgans);
                }
            } catch (err) {
                console.error('Error fetching user organs:', err);
            }
        };

        if (show) {
            fetchUserOrgans();
        }
    }, [show, user.id]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
        const { name, value, type } = e.target;
        const target = e.target as HTMLInputElement;
        const checked = target.type === 'checkbox' ? target.checked : undefined;
        
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (user?.user_type === 'donor' && !user?.profile_complete) {
            setShowProfileModal(true);
            setLoading(false);
            return;
        }

        try {
            const formattedData = {
                organ_name: formData.organ_name,
                blood_type: user.blood_type,
                additional_notes: formData.additional_notes,
                is_available: formData.is_available,
                donor: user.id,
                location: formData.location
            };

            console.log('Submitting organ data:', formattedData);

            let response;
            if (organ) {
                // Update existing organ
                response = await organsAPI.update(organ.id, formattedData);
                console.log('Organ listing updated successfully:', response.data);
            } else {
                // Create new organ
                response = await organsAPI.create(formattedData);
                console.log('Organ listing created successfully:', response.data);
            }

            if (response.status === 200 || response.status === 201) {
                onSuccess();
                onHide();
            } else {
                throw new Error(organ ? 'Failed to update organ listing' : 'Failed to create organ listing');
            }
        } catch (err: unknown) {
            console.error('Error submitting organ listing:', err);
            if (err instanceof AxiosError && err.response?.data) {
                const errorMessages = Object.entries(err.response.data)
                    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                    .join('\n');
                setError(errorMessages || 'Failed to submit organ listing');
            } else {
                setError('Failed to submit organ listing. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteProfile = () => {
        setShowProfileModal(false);
        navigate('/dashboard/profile');
    };

    // Define available organ types with descriptions
    const organTypes: OrganType[] = [
        { value: 'kidney', label: 'Kidney', description: 'You can donate one kidney and live a normal life with the remaining kidney.' },
        { value: 'liver', label: 'Liver', description: 'Liver can regenerate, allowing living donors to donate a portion.' },
        { value: 'lung', label: 'Lung', description: 'You can donate one lung and live with the remaining lung.' },
        { value: 'pancreas', label: 'Pancreas', description: 'Partial pancreas donation is possible in some cases.' },
        { value: 'intestine', label: 'Intestine', description: 'Partial intestine donation is possible.' }
    ];

    return (
        <>
            <Modal show={show} onHide={onHide} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{organ ? 'Edit Organ Listing' : 'New Organ Listing'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    {!organ && (
                        <Alert variant="info" className="mb-3">
                            <strong>Important Note:</strong> You can only list each organ type once. Please ensure you understand the implications of organ donation before proceeding.
                        </Alert>
                    )}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label htmlFor="organ_name">Organ Type</Form.Label>
                            <Form.Select
                                id="organ_name"
                                name="organ_name"
                                value={formData.organ_name}
                                onChange={handleChange}
                                required
                                disabled={readOnly}
                                aria-label="Select organ type"
                            >
                                <option value="">Select an organ</option>
                                {organTypes.map(organType => (
                                    <option 
                                        key={organType.value} 
                                        value={organType.value}
                                        disabled={!organ && existingOrgans.some(o => o.organ_name === organType.value)}
                                    >
                                        {organType.label}
                                    </option>
                                ))}
                            </Form.Select>
                            {formData.organ_name && (
                                <Form.Text className="text-muted">
                                    {organTypes.find(o => o.value === formData.organ_name)?.description}
                                </Form.Text>
                            )}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label htmlFor="blood_type">Blood Type</Form.Label>
                            <Form.Control
                                id="blood_type"
                                name="blood_type"
                                type="text"
                                value={user.blood_type}
                                readOnly
                                disabled
                                className="bg-light"
                                aria-label="Blood type"
                            />
                            <Form.Text className="text-muted">
                                Your blood type from registration
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Additional Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                name="additional_notes"
                                value={formData.additional_notes}
                                onChange={handleChange}
                                placeholder="Please provide any additional information about the organ"
                                rows={3}
                                disabled={readOnly}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Location</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.location}
                                disabled
                                className="mb-2"
                            />
                            <Form.Text className="text-muted">
                                Location is based on your profile. To update your location, please visit your{' '}
                                <Button 
                                    variant="link" 
                                    className="p-0 align-baseline" 
                                    onClick={() => navigate('/dashboard/profile')}
                                >
                                    profile settings
                                </Button>
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                id="is_available"
                                name="is_available"
                                label="This organ is available for donation"
                                checked={formData.is_available}
                                onChange={handleChange}
                                disabled={readOnly}
                            />
                        </Form.Group>

                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={onHide}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" disabled={loading || readOnly}>
                                {loading ? 'Saving...' : organ ? 'Update Listing' : 'Create Listing'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            <Modal show={showProfileModal} onHide={() => setShowProfileModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Complete Your Profile</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Please complete your profile before listing an organ for donation.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowProfileModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleCompleteProfile}>
                        Complete Profile
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default NewOrganListing; 