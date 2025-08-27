import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarHeaderProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({ 
  isCollapsed, 
  toggleCollapse 
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-white/10">
      {!isCollapsed && (
        <div className="text-white font-semibold text-lg tracking-wide">LifeLink</div>
      )}
      <button
        onClick={toggleCollapse}
        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all duration-200"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  );
};

export default SidebarHeader; 