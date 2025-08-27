import React, { useState, useEffect, ChangeEvent } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { organsAPI } from '../../services/api';
import axios, { AxiosError } from 'axios';

interface Organ {
    id: number;
    organ_name: string;
    additional_notes: string;
    is_available: boolean;
    donor?: {
        id: number;
    };
}

interface User {
    id: number;
    blood_type: string;
}

interface OrganType {
    value: string;
    label: string;
    description: string;
}

interface EditOrganListingProps {
    show: boolean;
    onHide: () => void;
    onSuccess: () => void;
    organ: Organ;
    user: User;
}

interface FormData {
    organ_name: string;
    additional_notes: string;
    is_available: boolean;
}

const EditOrganListing: React.FC<EditOrganListingProps> = ({ show, onHide, onSuccess, organ, user }) => {
    const [formData, setFormData] = useState<FormData>({
        organ_name: '',
        additional_notes: '',
        is_available: true
    });
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [existingOrgans, setExistingOrgans] = useState<Organ[]>([]);

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
                        (o: Organ) => o.donor?.id === user.id && o.id !== organ?.id
                    );
                    setExistingOrgans(filteredOrgans);
                }
            } catch (err) {
                console.error('Error fetching user organs:', err);
            }
        };

        if (show && organ) {
            fetchUserOrgans();
            setFormData({
                organ_name: organ.organ_name,
                additional_notes: organ.additional_notes || '',
                is_available: organ.is_available
            });
        }
    }, [show, organ, user.id]);

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

        try {
            const formattedData = {
                organ_name: formData.organ_name,
                blood_type: user.blood_type,
                additional_notes: formData.additional_notes,
                is_available: formData.is_available,
                donor: user.id
            };

            console.log('Updating organ data:', formattedData);

            const response = await organsAPI.update(organ.id, formattedData);

            if (response.status === 200) {
                console.log('Organ listing updated successfully:', response.data);
                onSuccess();
                onHide();
            } else {
                throw new Error('Failed to update organ listing');
            }
        } catch (err: unknown) {
            console.error('Error updating organ listing:', err);
            if (err instanceof AxiosError && err.response?.data) {
                const errorMessages = Object.entries(err.response.data)
                    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                    .join('\n');
                setError(errorMessages || 'Failed to update organ listing');
            } else {
                setError('Failed to update organ listing. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!organ) return null;

    // Define available organ types with descriptions
    const organTypes: OrganType[] = [
        { value: 'kidney', label: 'Kidney', description: 'You can donate one kidney and live a normal life with the remaining kidney.' },
        { value: 'liver', label: 'Liver', description: 'Liver can regenerate, allowing living donors to donate a portion.' },
        { value: 'lung', label: 'Lung', description: 'You can donate one lung and live with the remaining lung.' },
        { value: 'pancreas', label: 'Pancreas', description: 'Partial pancreas donation is possible in some cases.' },
        { value: 'intestine', label: 'Intestine', description: 'Partial intestine donation is possible.' }
    ];

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Edit Organ Listing</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="organ_name">Organ Type</Form.Label>
                        <Form.Select
                            id="organ_name"
                            name="organ_name"
                            value={formData.organ_name}
                            onChange={handleChange}
                            required
                            disabled
                            aria-label="Select organ type"
                        >
                            <option value="">Select an organ</option>
                            {organTypes.map(organType => (
                                <option 
                                    key={organType.value} 
                                    value={organType.value}
                                    disabled={existingOrgans.some(o => o.organ_name === organType.value)}
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
                        <Form.Label htmlFor="additional_notes">Additional Notes</Form.Label>
                        <Form.Control
                            id="additional_notes"
                            name="additional_notes"
                            as="textarea"
                            rows={3}
                            value={formData.additional_notes}
                            onChange={handleChange}
                            placeholder="Any additional information about the organ or donation process"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Check
                            type="checkbox"
                            id="is_available"
                            name="is_available"
                            label="This organ is available for donation"
                            checked={formData.is_available}
                            onChange={handleChange}
                        />
                    </Form.Group>

                    <div className="d-flex justify-content-end gap-2">
                        <Button variant="secondary" onClick={onHide}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Update Listing'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default EditOrganListing; 