import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import ModernSidebar from '../layout/ModernSidebar';
import ModernNavbar from '../layout/ModernNavbar';

const SharedDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userName = user ? `${user.first_name} ${user.last_name}` : 'User';

  return (
    <div className="flex h-screen">
      <ModernSidebar
        userName={userName}
        userAvatar={user?.avatar}
        notificationCount={unreadCount}
        currentPath={location.pathname}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col">
        <ModernNavbar
          userName={userName}
          notificationCount={unreadCount}
          userAvatar={user?.avatar}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SharedDashboard; 