import React, { useState, useRef, useEffect } from 'react';
import { Search, Sliders, X } from 'lucide-react';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  activeFilterCount: number;
}

const SearchBar = ({ 
  searchTerm, 
  setSearchTerm, 
  showFilters, 
  setShowFilters,
  activeFilterCount
}: SearchBarProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="relative mb-6">
      <div 
        className={`flex items-center border ${
          isFocused ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300'
        } rounded-lg overflow-hidden transition-all duration-200 bg-white`}
      >
        <div className="pl-4 text-gray-400">
          <Search size={20} />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by organ type, location, or medical notes..."
          className="w-full px-3 py-3 focus:outline-none text-gray-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="px-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        )}
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 flex items-center ${
            showFilters ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'
          } transition-colors duration-200`}
        >
          <Sliders size={18} className="mr-2" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
              showFilters ? 'bg-white text-blue-500' : 'bg-blue-500 text-white'
            }`}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
      
      <div className="mt-2 text-sm text-gray-500 flex items-center">
        <span className="mr-1">Tip:</span> Try searching for "kidney" or "Type O"
      </div>
    </div>
  );
};

export default SearchBar; 