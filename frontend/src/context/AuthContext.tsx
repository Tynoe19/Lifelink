import React, { createContext, useState, useContext, useEffect } from 'react';
import api, { authAPI } from '../services/api';
import { User } from '../services/api';

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    checkAuth: () => Promise<boolean>;
    fetchUserDetails: () => Promise<User | null>;
    updateUser: (userData: User) => Promise<User>;
    authError: string | null;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    loading: true,
    isAuthenticated: false,
    login: async () => false,
    logout: () => {},
    checkAuth: async () => false,
    fetchUserDetails: async () => null,
    updateUser: async (userData: User) => userData,
    authError: null
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const clearAuthState = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
    };

    const login = async (email: string, password: string) => {
        try {
            setLoading(true);
            setAuthError(null);
            clearAuthState();
            
            const response = await authAPI.login({ email, password });
            const { access, refresh } = response;

            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            setToken(access);

            const userResponse = await authAPI.getUserDetails();
            const userData = userResponse.data;

            if (!userData?.id) {
                throw new Error('Failed to fetch user details after login');
            }

            setUser(userData);
            setIsAuthenticated(true);
            setLoading(false);
            return true;
        } catch (error: any) {
            console.error('Login error:', error);
            clearAuthState();
            setLoading(false);
            
            if (error.response?.data?.detail) {
                setAuthError(error.response.data.detail);
            } else if (error.response?.data?.non_field_errors) {
                setAuthError(error.response.data.non_field_errors[0]);
            } else {
                setAuthError(error.message || 'Login failed');
            }
            throw error;
        }
    };

    const logout = () => {
        clearAuthState();
    };

    const fetchUserDetails = async (): Promise<User | null> => {
        try {
            const response = await authAPI.getUserDetails();
            const userData = response.data;
            
            if (!userData.id) {
                throw new Error('No user ID in response');
            }

            setUser(userData);
            setIsAuthenticated(true);
            setAuthError(null);
            return userData;
        } catch (error: any) {
            console.error('Error fetching user details:', error);
            if (error.response?.status === 401) {
                clearAuthState();
            }
            throw error;
        }
    };

    const checkAuth = async (): Promise<boolean> => {
        try {
            const storedToken = localStorage.getItem('access_token');
            if (!storedToken) {
                clearAuthState();
                setLoading(false);
                return false;
            }

            setToken(storedToken);
            const userData = await fetchUserDetails();
            setLoading(false);
            return !!userData;
        } catch (error) {
            console.error('Authentication check failed:', error);
            clearAuthState();
            setLoading(false);
            return false;
        }
    };

    useEffect(() => {
        const initializeAuth = async () => {
            await checkAuth();
        };
        initializeAuth();
    }, []);

    const value = {
        user,
        token,
        login,
        logout,
        loading,
        checkAuth,
        fetchUserDetails,
        updateUser: async (userData: User) => {
            // Ensure we have a complete user object
            const updatedUser = {
                ...user,
                ...userData,
                profile_complete: userData.profile_complete ?? user?.profile_complete ?? false
            };
            
            // If there's recipient profile data, ensure it's properly merged
            if (userData.recipient_profile) {
                updatedUser.recipient_profile = {
                    ...user?.recipient_profile,
                    ...userData.recipient_profile
                };
            }
            
            setUser(updatedUser);
            return updatedUser;
        },
        isAuthenticated,
        authError
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext; 