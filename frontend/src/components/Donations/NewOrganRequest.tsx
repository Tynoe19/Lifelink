import React, { useState, useEffect, ChangeEvent } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { organsAPI } from '../../services/api';
import { AxiosError } from 'axios';

interface User {
    id: number;
    blood_type: string;
    fullname?: string;
    gender?: string;
    age?: number;
}

interface OrganType {
    value: string;
    label: string;
    description: string;
}

interface NewOrganRequestProps {
    show: boolean;
    onHide: () => void;
    onSuccess: () => void;
    user: User;
    request?: any; // Add proper type if needed
}

interface FormData {
    organ_type: string;
    blood_type: string;
    urgency_level: string;
    location: string;
    medical_notes: string;
    hospital_letter?: File | null;
}

const NewOrganRequest: React.FC<NewOrganRequestProps> = ({ show, onHide, onSuccess, user, request }) => {
    const [formData, setFormData] = useState<FormData>({
        organ_type: '',
        blood_type: user.blood_type,
        urgency_level: '',
        location: '',
        medical_notes: '',
        hospital_letter: null
    });
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [fileName, setFileName] = useState<string>('');

    useEffect(() => {
        if (request) {
            setFormData({
                organ_type: request.organ_type,
                blood_type: request.blood_type,
                urgency_level: request.urgency_level,
                location: request.location,
                medical_notes: request.message || '',
                hospital_letter: null
            });
            setFileName(request.hospital_letter_name || '');
        } else {
            setFormData({
                organ_type: '',
                blood_type: user.blood_type,
                urgency_level: '',
                location: '',
                medical_notes: '',
                hospital_letter: null
            });
            setFileName('');
        }
    }, [request, user.blood_type]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (file) {
            // Check if file is PDF or DOC/DOCX
            if (file.type === 'application/pdf' || 
                file.type === 'application/msword' || 
                file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                setFormData(prev => ({
                    ...prev,
                    hospital_letter: file
                }));
                setFileName(file.name);
            } else {
                setError('Please upload a PDF or Word document');
                e.target.value = ''; // Clear the file input
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Create FormData object to handle file upload
            const submitData = new FormData();
            
            // Add all form fields to FormData
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== null) {
                    if (key === 'hospital_letter' && value instanceof File) {
                        submitData.append(key, value);
                    } else if (key === 'medical_notes') {
                        // Map medical_notes to message field for the API
                        submitData.append('message', value as string);
                    } else {
                        submitData.append(key, value as string);
                    }
                }
            });

            console.log('Submitting form data:', Object.fromEntries(submitData));
            const response = await organsAPI.createRequest(submitData);
            
            if (response.status === 200 || response.status === 201) {
                onSuccess();
                onHide();
            } else {
                throw new Error('Failed to create organ request');
            }
        } catch (err) {
            console.error('Error with organ request:', err);
            if (err instanceof AxiosError && err.response?.data) {
                const errorMessages = Object.entries(err.response.data)
                    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                    .join('\n');
                setError(errorMessages || 'Failed to create organ request');
            } else {
                setError('Failed to create organ request. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const organTypes: OrganType[] = [
        { value: 'kidney', label: 'Kidney', description: 'Kidney transplant is one of the most common organ transplants.' },
        { value: 'liver', label: 'Liver', description: 'Liver transplant is needed when the liver is severely damaged.' },
        { value: 'lung', label: 'Lung', description: 'Lung transplant is required for severe lung diseases.' },
        { value: 'pancreas', label: 'Pancreas', description: 'Pancreas transplant is needed for severe diabetes cases.' },
        { value: 'intestine', label: 'Intestine', description: 'Intestine transplant is needed for severe intestinal failure.' }
    ];

    const urgencyLevels = [
        { value: 'low', label: 'Low - Can wait for a suitable match' },
        { value: 'medium', label: 'Medium - Need transplant within months' },
        { value: 'high', label: 'High - Need transplant within weeks' },
        { value: 'critical', label: 'Critical - Need immediate transplant' }
    ];

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>{request ? 'Edit Organ Request' : 'New Organ Request'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Organ Type Needed</Form.Label>
                        <Form.Select
                            name="organ_type"
                            value={formData.organ_type}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select an organ</option>
                            {organTypes.map(organType => (
                                <option key={organType.value} value={organType.value}>
                                    {organType.label}
                                </option>
                            ))}
                        </Form.Select>
                        {formData.organ_type && (
                            <Form.Text className="text-muted">
                                {organTypes.find(o => o.value === formData.organ_type)?.description}
                            </Form.Text>
                        )}
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Blood Type</Form.Label>
                        <Form.Control
                            type="text"
                            name="blood_type"
                            value={formData.blood_type}
                            onChange={handleChange}
                            required
                        />
                        <Form.Text className="text-muted">
                            Your blood type for matching purposes
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Urgency Level</Form.Label>
                        <Form.Select
                            name="urgency_level"
                            value={formData.urgency_level}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select urgency level</option>
                            {urgencyLevels.map(level => (
                                <option key={level.value} value={level.value}>
                                    {level.label}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Location</Form.Label>
                        <Form.Control
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="Enter your location"
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Medical Notes</Form.Label>
                        <Form.Control
                            as="textarea"
                            name="medical_notes"
                            value={formData.medical_notes}
                            onChange={handleChange}
                            placeholder="Please provide relevant medical information and history"
                            rows={3}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Hospital Letter (Optional)</Form.Label>
                        <Form.Control
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="mb-2"
                        />
                        {fileName && (
                            <div className="text-muted small">
                                Selected file: {fileName}
                            </div>
                        )}
                        <Form.Text className="text-muted">
                            Upload a PDF or Word document from your hospital confirming the need for organ transplant
                        </Form.Text>
                    </Form.Group>

                    <div className="d-flex justify-content-end gap-2">
                        <Button variant="secondary" onClick={onHide}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Submitting...' : request ? 'Update Request' : 'Submit Request'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default NewOrganRequest; 