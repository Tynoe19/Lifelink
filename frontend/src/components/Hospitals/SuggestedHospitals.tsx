import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import donationsAPI from '../../services/donationsAPI';
import { toast } from 'react-toastify';

interface Hospital {
    id: number;
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
    specialties: string;
    specialties_list: string[];
    latitude: number;
    longitude: number;
    distance: number;
}

interface SuggestedHospitalsResponse {
    hospitals: Hospital[];
    midpoint: {
        latitude: number;
        longitude: number;
    } | null;
    location_type: 'coordinates' | 'city';
}

interface SuggestedHospitalsProps {
    connectionId: number;
}

const SuggestedHospitals: React.FC<SuggestedHospitalsProps> = ({ connectionId }) => {
    const { user } = useAuth();
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [midpoint, setMidpoint] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locationType, setLocationType] = useState<'coordinates' | 'city'>('city');

    useEffect(() => {
        loadSuggestedHospitals();
    }, [connectionId]);

    const loadSuggestedHospitals = async () => {
        setIsLoading(true);
        try {
            const response = await donationsAPI.getSuggestedHospitals(connectionId);
            const data: SuggestedHospitalsResponse = response.data;
            setHospitals(data.hospitals);
            setMidpoint(data.midpoint);
            setLocationType(data.location_type);
        } catch (error) {
            toast.error('Failed to load suggested hospitals');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDistance = (distance: number) => {
        return `${distance.toFixed(1)} km`;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Suggested Hospitals</h2>
                <p className="text-gray-600">
                    {locationType === 'coordinates' 
                        ? 'Hospitals near the midpoint between donor and recipient'
                        : 'Hospitals in donor and recipient cities'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hospitals.map(hospital => (
                    <div key={hospital.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-semibold">{hospital.name}</h3>
                                <p className="text-gray-600">{hospital.address}</p>
                                <p className="text-gray-600">{hospital.city}</p>
                            </div>
                            {hospital.distance && (
                                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm">
                                    {formatDistance(hospital.distance)}
                                </span>
                            )}
                        </div>
                        
                        <div className="mt-4">
                            <div className="flex items-center text-gray-600 mb-2">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {hospital.phone}
                            </div>
                            <div className="flex items-center text-gray-600 mb-2">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {hospital.email}
                            </div>
                        </div>

                        <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Specialties:</h4>
                            <div className="flex flex-wrap gap-2">
                                {hospital.specialties_list.map((specialty, index) => (
                                    <span
                                        key={index}
                                        className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs"
                                    >
                                        {specialty}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {hospitals.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-gray-600">No hospitals found in the area.</p>
                </div>
            )}
        </div>
    );
};

export default SuggestedHospitals; 