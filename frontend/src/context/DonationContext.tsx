import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { donationsAPI, Organ } from '../services/api';

interface DonationContextType {
    organs: Organ[];
    loading: boolean;
    error: string | null;
    searchOrgans: (searchParams: Record<string, any>) => Promise<void>;
    getMyOrgans: () => Promise<void>;
}

const DonationContext = createContext<DonationContextType | undefined>(undefined);

interface DonationProviderProps {
    children: ReactNode;
}

export const DonationProvider: React.FC<DonationProviderProps> = ({ children }) => {
    const [organs, setOrgans] = useState<Organ[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchOrgans = async (searchParams: Record<string, any>) => {
        setLoading(true);
        setError(null);
        try {
            const response = await donationsAPI.searchOrgans(searchParams);
            setOrgans(response.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const getMyOrgans = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await donationsAPI.getOrgans();
            setOrgans(response.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getMyOrgans();
    }, []);

    return (
        <DonationContext.Provider value={{ organs, loading, error, searchOrgans, getMyOrgans }}>
            {children}
        </DonationContext.Provider>
    );
};

export const useDonation = () => {
    const context = useContext(DonationContext);
    if (context === undefined) {
        throw new Error('useDonation must be used within a DonationProvider');
    }
    return context;
}; 