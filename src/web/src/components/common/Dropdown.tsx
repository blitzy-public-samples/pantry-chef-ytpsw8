/**
 * HUMAN TASKS:
 * 1. Ensure Tailwind CSS is properly configured in the project
 * 2. Verify that classnames package is installed (npm install classnames@^2.3.1)
 */

import React, { useState, useEffect } from 'react';
import classNames from 'classnames'; // v2.3.1
import { theme } from '../../config/theme';

// Requirement: Common UI components for consistent user interaction patterns (8.1.2)
export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps {
  id: string;
  name: string;
  label: string;
  options: DropdownOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
}

// Requirement: Support for recipe categorization and filtering (1.2)
// Requirement: Ingredient categorization and filtering capabilities (1.2)
export const Dropdown: React.FC<DropdownProps> = ({
  id,
  name,
  label,
  options,
  value,
  onChange,
  multiple = false,
  disabled = false,
  required = false,
  error,
  placeholder,
  className,
}) => {
  const [internalValue, setInternalValue] = useState<string | string[]>(value);

  // Sync internal state with external value
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    event.preventDefault();
    
    let newValue: string | string[];
    if (multiple) {
      // Extract all selected values for multi-select
      newValue = Array.from(event.target.selectedOptions).map(option => option.value);
    } else {
      // Single value for regular select
      newValue = event.target.value;
    }

    setInternalValue(newValue);
    onChange(newValue);
  };

  // Container classes using theme tokens
  const containerClasses = classNames(
    'relative w-full',
    className
  );

  // Label classes using theme typography
  const labelClasses = classNames(
    'block mb-1',
    theme.typography.fontSize.sm,
    theme.typography.fontWeight.medium,
    {
      [theme.palette.text.primary]: !disabled,
      [theme.palette.text.disabled]: disabled
    }
  );

  // Select element classes
  const selectClasses = classNames(
    'block w-full',
    'border rounded-md',
    'focus:outline-none focus:ring-2',
    'transition duration-150 ease-in-out',
    {
      // Base styles
      'py-2 px-3': true,
      [theme.typography.fontSize.base]: true,
      
      // Border radius
      [theme.borderRadius.md]: true,
      
      // Disabled state
      'bg-gray-100 cursor-not-allowed opacity-75': disabled,
      
      // Error state
      'border-error-500 focus:border-error-500 focus:ring-error-500': error,
      
      // Default state
      'border-gray-300 focus:border-primary-500 focus:ring-primary-500': !error && !disabled,
      
      // Text colors
      [theme.palette.text.primary]: !disabled,
      [theme.palette.text.disabled]: disabled
    }
  );

  // Error message classes
  const errorClasses = classNames(
    'mt-1',
    theme.typography.fontSize.sm,
    theme.palette.error.main
  );

  return (
    <div className={containerClasses}>
      {label && (
        <label 
          htmlFor={id}
          className={labelClasses}
        >
          {label}
          {required && <span className={theme.palette.error.main}>*</span>}
        </label>
      )}
      
      <select
        id={id}
        name={name}
        value={internalValue}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        multiple={multiple}
        className={selectClasses}
        aria-invalid={!!error}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p className={errorClasses} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};