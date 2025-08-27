import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  notificationCount?: number;
  isCollapsed?: boolean;
  onClick?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({
  href,
  icon,
  label,
  isActive = false,
  notificationCount,
  isCollapsed = false,
  onClick,
}) => {
  return (
    <Link
      to={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
        "hover:bg-white/10 relative group",
        isActive 
          ? "bg-white/10 text-white" 
          : "text-white/80 hover:text-white"
      )}
    >
      <div className={cn(
        "flex items-center justify-center transition-all duration-200",
        isCollapsed ? "w-8 h-8" : "w-6 h-6"
      )}>
        {icon}
      </div>
      
      {!isCollapsed && (
        <span className="transition-all duration-200">{label}</span>
      )}
      
      {notificationCount && notificationCount > 0 && (
        <div className={cn(
          "flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium rounded-full bg-red-500 text-white",
          isCollapsed ? "absolute -top-1 -right-1" : "ml-auto"
        )}>
          {notificationCount > 99 ? '99+' : notificationCount}
        </div>
      )}
      
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </Link>
  );
};

export default SidebarLink; 