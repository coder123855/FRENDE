import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

const MultiSelect = ({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select options...',
  disabled = false,
  allowCustom = false,
  customPlaceholder = 'Type custom value...',
  maxSelections = 10,
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

  // Filter options based on search term and exclude already selected
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !value.includes(option)
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
    if (value.length < maxSelections) {
      onChange([...value, option]);
      setSearchTerm('');
    }
  };

  const handleCustomSubmit = () => {
    if (customValue.trim() && value.length < maxSelections) {
      onChange([...value, customValue.trim()]);
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

  const removeOption = (optionToRemove) => {
    onChange(value.filter(option => option !== optionToRemove));
  };

  const clearAll = () => {
    onChange([]);
    setSearchTerm('');
  };

  const isAtMaxSelections = value.length >= maxSelections;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main MultiSelect Button */}
              <div
          className={`
            relative w-full min-h-[42px] px-3 py-2 text-left border rounded-md shadow-sm cursor-pointer
            ${disabled || loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}
            ${error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          `}
          onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          tabIndex={disabled || loading ? -1 : 0}
        >
        {/* Selected Options Display */}
        <div className="flex flex-wrap gap-1 min-h-[20px]">
          {value.length > 0 ? (
            value.map((option, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {option}
                <button
                  type="button"
                  className="ml-1 text-blue-600 hover:text-blue-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(option);
                  }}
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-gray-500">{loading ? 'Loading...' : placeholder}</span>
          )}
        </div>
        
        <span className="absolute inset-y-0 right-0 flex items-center pr-2">
          {value.length > 0 && (
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 mr-1"
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
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
              disabled={isAtMaxSelections}
            />
            {isAtMaxSelections && (
              <p className="text-xs text-red-600 mt-1">
                Maximum {maxSelections} selections reached
              </p>
            )}
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
            ) : searchTerm && !isAtMaxSelections ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No options found
              </div>
            ) : null}

            {/* Custom Option */}
            {allowCustom && searchTerm && !filteredOptions.includes(searchTerm) && !isAtMaxSelections && (
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

export default MultiSelect; 