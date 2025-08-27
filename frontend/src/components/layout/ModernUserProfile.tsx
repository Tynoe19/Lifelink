import React from 'react';
import { LogOut, User } from 'lucide-react';
import { cn } from '../utils/cn';

interface UserProfileProps {
  name: string;
  avatar?: string;
  isCollapsed: boolean;
  onLogout?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ 
  name, 
  avatar, 
  isCollapsed,
  onLogout 
}) => {
  return (
    <div className="mt-auto border-t border-white/10">
      <div className={cn(
        "flex items-center px-3 py-3",
        isCollapsed ? "justify-center" : "gap-3"
      )}>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            <User size={16} className="text-white" />
          )}
        </div>
        
        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{name}</p>
            </div>
            {onLogout && (
              <button 
                onClick={onLogout}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                aria-label="Logout"
              >
                <LogOut size={16} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 