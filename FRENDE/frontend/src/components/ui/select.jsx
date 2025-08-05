import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

const Select = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  allowCustom = false,
  customPlaceholder = 'Type custom value...',
  className = '',
  error = null,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setShowCustomInput(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
      setShowCustomInput(false);
    }
  };

  const handleOptionClick = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
    setShowCustomInput(false);
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setIsOpen(false);
      setSearchTerm('');
      setCustomValue('');
      setShowCustomInput(false);
    }
  };

  const handleCustomKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      setShowCustomInput(false);
      setCustomValue('');
    }
  };

  const clearSelection = () => {
    onChange('');
    setSearchTerm('');
  };

  const displayValue = value || '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Select Button */}
              <div
          className={`
            relative w-full px-3 py-2 text-left border rounded-md shadow-sm cursor-pointer
            ${disabled || loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}
            ${error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          `}
          onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          tabIndex={disabled || loading ? -1 : 0}
        >
                  <span className={`block truncate ${!displayValue ? 'text-gray-500' : 'text-gray-900'}`}>
            {loading ? 'Loading...' : (displayValue || placeholder)}
          </span>
        
        <span className="absolute inset-y-0 right-0 flex items-center pr-2">
          {value && (
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 mr-1"
              onClick={(e) => {
                e.stopPropagation();
                clearSelection();
              }}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
          <ChevronDownIcon 
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </span>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <input
              ref={inputRef}
              type="text"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search options..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Options List */}
          <div className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-900"
                  onClick={() => handleOptionClick(option)}
                >
                  {option}
                </div>
              ))
            ) : searchTerm && (
              <div className="px-3 py-2 text-sm text-gray-500">
                No options found
              </div>
            )}

            {/* Custom Option */}
            {allowCustom && searchTerm && !filteredOptions.includes(searchTerm) && (
              <div
                className="px-3 py-2 text-sm cursor-pointer hover:bg-green-50 hover:text-green-900 border-t border-gray-200"
                onClick={() => setShowCustomInput(true)}
              >
                Add "{searchTerm}" as custom option
              </div>
            )}

            {/* Custom Input */}
            {showCustomInput && (
              <div className="p-2 border-t border-gray-200">
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={customPlaceholder}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={handleCustomKeyDown}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={handleCustomSubmit}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomValue('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Select; 