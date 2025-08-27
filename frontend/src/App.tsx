import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DonationProvider } from './context/DonationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Login from './components/Auth/Login';
import Dashboard from './pages/Dashboard';
import Register from './components/Auth/Register';
import About from './components/About';
import ConnectionRequest from './components/ConnectionRequest';
import './styles/main.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';
import Notifications from './components/Notifications/Notifications';
import Profile from './components/Dashboard/Profile';
import DashboardHome from './components/Dashboard/DashboardHome';
import OrganListings from './components/Donations/OrganListings';
import Messages from './components/Messages/Messages';
import ActivityHistory from './components/ActivityHistory/ActivityHistory';
import { NotificationsProvider } from './context/NotificationsContext';
import { UnreadMessagesProvider } from './context/UnreadMessagesContext';
import SuggestedHospitalsPage from './components/Hospitals/SuggestedHospitalsPage';
import { SuggestedHospitalsProvider } from './context/SuggestedHospitalsContext';
import RequestPasswordReset from './components/Auth/RequestPasswordReset';
import ResetPassword from './components/Auth/ResetPassword';
import Announcements from './components/Announcements/Announcements';

// Wrapper component to handle navbar visibility
const AppContent = () => {
    const location = useLocation();
    const showNavbar = location.pathname === '/';

    const handleSelectHospital = (hospital: any) => {
        console.log('Selected hospital:', hospital);
        // Add your hospital selection logic here
    };

    return (
        <div className="app-container">
            {showNavbar && <Navbar />}
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/reset-password" element={<RequestPasswordReset />} />
                    <Route path="/reset-password/confirm" element={<ResetPassword />} />
                    
                    {/* Protected Routes */}
                    <Route path="/organs" element={<ProtectedRoute><OrganListings /></ProtectedRoute>} />
                    <Route path="/organ-listings/:id" element={<ProtectedRoute><OrganListings /></ProtectedRoute>} />
                    <Route path="/donation-requests/:id" element={<ProtectedRoute><OrganListings /></ProtectedRoute>} />
                    <Route path="/messages/:id" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                    
                    <Route path="/dashboard/*" element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }>
                        <Route index element={<DashboardHome />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="list-organ" element={<OrganListings />} />
                        <Route path="notifications" element={<Notifications />} />
                        <Route path="messages" element={<Messages />} />
                        <Route path="activity" element={<ActivityHistory />} />
                        <Route path="suggested-hospitals" element={<SuggestedHospitalsPage />} />
                        <Route path="announcements" element={<Announcements />} />
                        <Route path="announcements/:id" element={<Announcements />} />
                    </Route>
                    
                    <Route path="/organs/:organId/connection-requests" element={
                        <ProtectedRoute>
                            <ConnectionRequest />
                        </ProtectedRoute>
                    } />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>
        </div>
    );
};

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <NotificationsProvider>
                    <DonationProvider>
                        <UnreadMessagesProvider>
                            <SuggestedHospitalsProvider>
                                <Router>
                                    <AppContent />
                                </Router>
                            </SuggestedHospitalsProvider>
                        </UnreadMessagesProvider>
                    </DonationProvider>
                </NotificationsProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
