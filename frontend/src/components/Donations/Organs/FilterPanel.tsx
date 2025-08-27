
import { X } from 'lucide-react';

interface FilterPanelProps {
  activeFilters: {
    organType: string[];
    status: string[];
    bloodType: string[];
    ageRange: string[];
    location: string[];
  };
  onFilterChange: (category: keyof FilterPanelProps['activeFilters'], values: string[]) => void;
  onClearFilters: () => void;
}

const FilterPanel = ({ activeFilters, onFilterChange, onClearFilters }: FilterPanelProps) => {
  // Filter options
  const filterOptions: { [K in keyof FilterPanelProps['activeFilters']]: string[] } = {
    organType: ['Kidney', 'Liver', 'Heart', 'Lung', 'Pancreas', 'Cornea'],
    status: ['Available', 'Pending', 'Matched', 'Completed'],
    bloodType: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    ageRange: ['18-25', '20-30', '25-35', '30-40', '40-50', '50+'],
    location: ['Kyrenia (Girne)', 'Nicosia', 'Famagusta', 'Limassol', 'Paphos']
  };

  // Filter display names
  const categoryDisplayNames: { [K in keyof FilterPanelProps['activeFilters']]: string } = {
    organType: 'Organ Type',
    status: 'Status',
    bloodType: 'Blood Type',
    ageRange: 'Age Range',
    location: 'Location'
  };

  const handleCheckboxChange = (category: keyof FilterPanelProps['activeFilters'], value: string) => {
    const currentValues = [...activeFilters[category]];
    
    if (currentValues.includes(value)) {
      // Remove value if already selected
      onFilterChange(
        category,
        currentValues.filter(v => v !== value)
      );
    } else {
      // Add value if not already selected
      onFilterChange(category, [...currentValues, value]);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(activeFilters).some(category => category.length > 0);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 animate-slideDown">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-gray-700">Filter Results</h4>
        {hasActiveFilters && (
          <button 
            onClick={onClearFilters}
            className="text-sm text-blue-500 hover:text-blue-700 flex items-center"
          >
            <X size={16} className="mr-1" />
            Clear all filters
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(filterOptions).map(([category, options]) => (
          <div key={category} className="space-y-2">
            <h5 className="font-medium text-gray-700">
              {categoryDisplayNames[category as keyof FilterPanelProps['activeFilters']]}
            </h5>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
              {options.map(option => (
                <label 
                  key={option} 
                  className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={activeFilters[category as keyof FilterPanelProps['activeFilters']].includes(option)}
                    onChange={() => handleCheckboxChange(category as keyof FilterPanelProps['activeFilters'], option)}
                    className="rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
        <button 
          onClick={() => onClearFilters()}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors mr-2"
        >
          Reset
        </button>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default FilterPanel; 