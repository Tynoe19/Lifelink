import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  User, 
  ListOrdered, 
  Mail, 
  Bell, 
  History, 
  Building, 
  Megaphone 
} from 'lucide-react';
import { cn } from '../utils/cn';
import SidebarLink from './ModernSidebarLink';
import UserProfile from './ModernUserProfile';
import SidebarHeader from './ModernSidebarHeader';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUnreadMessages } from '../../context/UnreadMessagesContext';

interface SidebarProps {
  userName: string;
  userAvatar?: string;
  notificationCount?: number;
  currentPath: string;
  onLogout?: () => void;
}

const ModernSidebar: React.FC<SidebarProps> = ({
  userName,
  userAvatar,
  notificationCount = 0,
  currentPath,
  onLogout
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();
  const { totalUnreadCount } = useUnreadMessages();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-screen bg-[#2563eb] transition-all duration-300",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <SidebarHeader isCollapsed={isCollapsed} toggleCollapse={toggleSidebar} />
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          <SidebarLink
            href="/dashboard"
            icon={<LayoutDashboard className="h-5 w-5" />}
            label="Dashboard"
            isActive={currentPath === '/dashboard'}
            isCollapsed={isCollapsed}
          />
          
          <SidebarLink
            href="/dashboard/profile"
            icon={<User className="h-5 w-5" />}
            label="Profile"
            isActive={currentPath === '/dashboard/profile'}
            isCollapsed={isCollapsed}
          />
          
          <SidebarLink
            href="/dashboard/list-organ"
            icon={<ListOrdered className="h-5 w-5" />}
            label="Donations"
            isActive={currentPath === '/dashboard/list-organ'}
            isCollapsed={isCollapsed}
          />
          
          <SidebarLink
            href="/dashboard/messages"
            icon={<Mail className="h-5 w-5" />}
            label="Messages"
            notificationCount={totalUnreadCount}
            isActive={currentPath === '/dashboard/messages'}
            isCollapsed={isCollapsed}
          />
          
          <SidebarLink
            href="/dashboard/notifications"
            icon={<Bell className="h-5 w-5" />}
            label="Notifications"
            notificationCount={notificationCount}
            isActive={currentPath === '/dashboard/notifications'}
            isCollapsed={isCollapsed}
          />
          
          <SidebarLink
            href="/dashboard/suggested-hospitals"
            icon={<Building className="h-5 w-5" />}
            label="Suggested Hospitals"
            isActive={currentPath === '/dashboard/suggested-hospitals'}
            isCollapsed={isCollapsed}
          />
          
          <SidebarLink
            href="/dashboard/activity"
            icon={<History className="h-5 w-5" />}
            label="Activity"
            isActive={currentPath === '/dashboard/activity'}
            isCollapsed={isCollapsed}
          />
          
          <SidebarLink
            href="/dashboard/announcements"
            icon={<Megaphone className="h-5 w-5" />}
            label="Announcements"
            isActive={currentPath === '/dashboard/announcements'}
            isCollapsed={isCollapsed}
          />
        </nav>
      </div>
      
      <div className="p-4 border-t border-white/10">
        <UserProfile
          name={userName}
          avatar={userAvatar}
          isCollapsed={isCollapsed}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
};

export default ModernSidebar; 