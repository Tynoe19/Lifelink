import React, { useState, useEffect } from 'react';
import { Form, InputGroup, ListGroup } from 'react-bootstrap';

interface LocationPickerProps {
    onLocationSelect: (location: {
        address: string;
        city: string;
        country: string;
        latitude: number;
        longitude: number;
        postal_code: string;
    }) => void;
    initialLocation?: {
        address: string;
        city: string;
        country: string;
        latitude: number;
        longitude: number;
        postal_code: string;
    };
    readOnly?: boolean;
}

// Predefined list of Northern Cyprus locations with their coordinates
const NORTHERN_CYPRUS_LOCATIONS = [
    { name: 'Nicosia (Lefkoşa)', latitude: 35.1856, longitude: 33.3823, postal_code: '9103' },
    { name: 'Kyrenia (Girne)', latitude: 35.3417, longitude: 33.3167, postal_code: '9102' },
    { name: 'Famagusta (Gazimağusa)', latitude: 35.1250, longitude: 33.9400, postal_code: '9104' },
    { name: 'Morphou (Güzelyurt)', latitude: 35.1989, longitude: 32.9944, postal_code: '9105' },
    { name: 'Iskele (Trikomo)', latitude: 35.2833, longitude: 33.9500, postal_code: '9106' },
    { name: 'Lefke', latitude: 35.1106, longitude: 32.8497, postal_code: '9100' },
    { name: 'Lapithos (Lapta)', latitude: 35.3333, longitude: 33.1667, postal_code: '9107' },
    { name: 'Karavas (Alsancak)', latitude: 35.3500, longitude: 33.2000, postal_code: '9108' },
    { name: 'Kythrea (Değirmenlik)', latitude: 35.2500, longitude: 33.4833, postal_code: '9109' },
    { name: 'Larnaca (Larnaka)', latitude: 34.9167, longitude: 33.6333, postal_code: '9110' },
    { name: 'Paphos (Baf)', latitude: 34.7667, longitude: 32.4167, postal_code: '9111' },
    { name: 'Limassol (Limasol)', latitude: 34.7071, longitude: 33.0226, postal_code: '9112' }
];

const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationSelect, initialLocation, readOnly = false }) => {
    const [searchValue, setSearchValue] = useState(initialLocation?.address || '');
    const [filteredLocations, setFilteredLocations] = useState<typeof NORTHERN_CYPRUS_LOCATIONS>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (initialLocation) {
            setSearchValue(initialLocation.address);
        }
    }, [initialLocation]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (readOnly) return;
        
        const value = e.target.value;
        setSearchValue(value);
        
        if (value.length > 0) {
            const filtered = NORTHERN_CYPRUS_LOCATIONS.filter(location =>
                location.name.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredLocations(filtered);
            setShowSuggestions(true);
        } else {
            setFilteredLocations([]);
            setShowSuggestions(false);
        }
    };

    const handleLocationSelect = (location: typeof NORTHERN_CYPRUS_LOCATIONS[0]) => {
        if (readOnly) return;

        onLocationSelect({
            address: location.name,
            city: location.name,
            country: 'CY',
            latitude: location.latitude,
            longitude: location.longitude,
            postal_code: location.postal_code
        });
        setSearchValue(location.name);
        setShowSuggestions(false);
    };

    return (
        <div className="mb-3">
            <Form.Label>Location <span className="text-danger">*</span></Form.Label>
            <InputGroup className="mb-2">
                <Form.Control
                    type="text"
                    placeholder="Search for a location in Northern Cyprus"
                    value={searchValue}
                    onChange={handleInputChange}
                    onFocus={() => !readOnly && setShowSuggestions(true)}
                    className="auth-input"
                    readOnly={readOnly}
                    disabled={readOnly}
                />
            </InputGroup>
            <Form.Text className="text-muted mb-2">
                {readOnly ? 'Location from registration' : 'Type to search for locations in Northern Cyprus'}
            </Form.Text>
            {!readOnly && showSuggestions && filteredLocations.length > 0 && (
                <ListGroup 
                    className="position-absolute w-100 shadow-sm" 
                    style={{ zIndex: 2000, maxHeight: 200, overflowY: 'auto' }}
                >
                    {filteredLocations.map((location) => (
                        <ListGroup.Item
                            key={location.name}
                            action
                            onClick={() => handleLocationSelect(location)}
                            className="cursor-pointer"
                        >
                            {location.name}
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            )}
        </div>
    );
};

export default LocationPicker; 