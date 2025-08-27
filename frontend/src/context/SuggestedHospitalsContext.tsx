import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Hospital } from '../types';
import { useAuth } from './AuthContext';
import { fetchTRNCHospitals } from '../services/openStreetMapService';

interface SuggestedHospitalsContextType {
  suggestedHospitals: Hospital[];
  allHospitals: Hospital[];
  setSuggestedHospitals: (hospitals: Hospital[]) => void;
  updateSuggestedHospitals: (connectionId?: string) => Promise<void>;
  fetchAllHospitals: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const SuggestedHospitalsContext = createContext<SuggestedHospitalsContextType | undefined>(undefined);

export const SuggestedHospitalsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [suggestedHospitals, setSuggestedHospitals] = useState<Hospital[]>([]);
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch hospitals near the donor (or user) location
  const updateSuggestedHospitals = async (connectionId?: string) => {
    setLoading(true);
    setError(null);
    try {
      let latitude, longitude;
      if (connectionId) {
        // Fetch the connection details
        const connectionResponse = await fetch(`/api/connections/${connectionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (!connectionResponse.ok) {
          throw new Error('Failed to fetch connection details');
        }
        const connectionData = await connectionResponse.json();
        // Get the donor's location from the connection
        const donorResponse = await fetch(`/api/users/${connectionData.donor_id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (!donorResponse.ok) {
          throw new Error('Failed to fetch donor details');
        }
        const donorData = await donorResponse.json();
        latitude = donorData.latitude;
        longitude = donorData.longitude;
      } else if (user && user.latitude && user.longitude) {
        latitude = user.latitude;
        longitude = user.longitude;
      }
      if (latitude && longitude) {
        const hospitals = await fetchTRNCHospitals({ latitude, longitude, radius: 30 });
        setSuggestedHospitals(hospitals);
      } else {
        setSuggestedHospitals([]);
      }
    } catch (err) {
      setError('Failed to fetch suggested hospitals');
      setSuggestedHospitals([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all hospitals (no location filter)
  const fetchAllHospitals = async () => {
    setLoading(true);
    setError(null);
    try {
      const hospitals = await fetchTRNCHospitals();
      setAllHospitals(hospitals);
    } catch (err) {
      setError('Failed to fetch all hospitals');
      setAllHospitals([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SuggestedHospitalsContext.Provider 
      value={{ 
        suggestedHospitals, 
        allHospitals,
        setSuggestedHospitals, 
        updateSuggestedHospitals,
        fetchAllHospitals,
        loading,
        error
      }}
    >
      {children}
    </SuggestedHospitalsContext.Provider>
  );
};

export const useSuggestedHospitals = () => {
  const context = useContext(SuggestedHospitalsContext);
  if (!context) {
    throw new Error('useSuggestedHospitals must be used within a SuggestedHospitalsProvider');
  }
  return context;
}; 