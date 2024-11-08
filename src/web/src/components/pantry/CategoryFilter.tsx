/**
 * HUMAN TASKS:
 * 1. Verify that classnames package is installed (npm install classnames@^2.3.1)
 * 2. Ensure that the component styling aligns with the application's Material Design theme
 */

import React, { useCallback } from 'react';
import classNames from 'classnames'; // v2.3.1
import { Dropdown, DropdownProps } from '../common/Dropdown';
import { InventoryCategory, InventoryFilter } from '../../interfaces/inventory.interface';

// Requirement: Category-based inventory management with search and filtering capabilities (8.1 User Interface Design/Screen Components)
export interface CategoryFilterProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  availableCategories: InventoryCategory[];
  disabled?: boolean;
  className?: string;
}

// Requirement: Digital pantry management with expiration tracking (1.2 Scope/Core Capabilities)
export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategories,
  onCategoryChange,
  availableCategories,
  disabled = false,
  className,
}) => {
  // Transform available categories into dropdown options format
  const categoryOptions = availableCategories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  // Memoized category change handler to prevent unnecessary re-renders
  const handleCategoryChange = useCallback(
    (selectedValues: string | string[]) => {
      // Ensure we have an array of values
      const categories = Array.isArray(selectedValues) ? selectedValues : [];
      onCategoryChange(categories);
    },
    [onCategoryChange]
  );

  // Container classes for the filter component
  const containerClasses = classNames(
    'category-filter',
    {
      'opacity-50 cursor-not-allowed': disabled,
    },
    className
  );

  return (
    <div className={containerClasses}>
      <Dropdown
        id="category-filter"
        name="categories"
        label="Categories"
        options={categoryOptions}
        value={selectedCategories}
        onChange={handleCategoryChange}
        multiple={true}
        disabled={disabled}
        placeholder="Select categories"
        className="w-full"
        required={false}
      />
    </div>
  );
};

