/**
 * HUMAN TASKS:
 * 1. Verify Material UI theme configuration in theme.ts
 * 2. Ensure proper environment variables are set for inventory service endpoints
 * 3. Configure Tailwind CSS for custom component styling
 * 4. Set up proper error tracking service integration
 */

import React, { useCallback } from 'react'; // ^18.0.0
import { NextPage } from 'next'; // ^13.0.0
import InventoryList from '../../components/pantry/InventoryList';
import { CategoryFilter } from '../../components/pantry/CategoryFilter';
import ExpirationTracker from '../../components/pantry/ExpirationTracker';
import useInventory from '../../hooks/useInventory';
import { InventoryItem } from '../../interfaces/inventory.interface';

/**
 * Props interface for the Inventory page component
 * Requirement: Digital Pantry Management - Comprehensive inventory management
 */
interface InventoryPageProps { }

/**
 * Main inventory dashboard page component
 * Implements requirements:
 * - Digital pantry management with expiration tracking (1.2 Scope/Core Capabilities)
 * - Inventory management with category-based organization (8.1 User Interface Design/Screen Components)
 * - Food waste reduction through inventory tracking (1.2 Scope/Key Benefits)
 */
const InventoryPage: NextPage<InventoryPageProps> = () => {
  // Initialize inventory management hook with default filter
  const {
    items,
    loading,
    filter,
    setFilter,
    updateItem,
    deleteItem
  } = useInventory({
    categories: [],
    locations: [],
    searchTerm: '',
    expiringWithinDays: 7
  });

  /**
   * Handle category filter changes
   * Requirement: Inventory Management - Category-based organization
   */
  const handleCategoryChange = useCallback((categories: string[]) => {
    setFilter({
      ...filter,
      categories
    });
  }, [filter, setFilter]);

  /**
   * Handle inventory item updates
   * Requirement: Digital Pantry Management - Real-time inventory updates
   */
  const handleItemUpdate = useCallback(async (item: InventoryItem) => {
    try {
      await updateItem(item.id, item);
    } catch (error) {
      console.error('Failed to update inventory item:', error);
      throw error;
    }
  }, [updateItem]);

  /**
   * Handle inventory item deletion
   * Requirement: Digital Pantry Management - Item removal
   */
  const handleItemDelete = useCallback(async (itemId: string) => {
    try {
      await deleteItem(itemId);
    } catch (error) {
      console.error('Failed to delete inventory item:', error);
      throw error;
    }
  }, [deleteItem]);

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Pantry Inventory
          </h1>

          {/* Category Filter Section */}
          <div className="w-full md:w-64">
            <CategoryFilter
              selectedCategories={filter.categories}
              onCategoryChange={handleCategoryChange}
              disabled={loading}
              className="w-full"
              availableCategories={[]}
            />
          </div>
        </div>

        {/* Expiration Tracking Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <ExpirationTracker
            daysThreshold={7}
            className="mb-6"
          />
        </div>

        {/* Main Inventory List Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <InventoryList
            filter={filter}
            onItemUpdate={handleItemUpdate}
            onItemDelete={handleItemDelete}
          />
        </div>
      </div>
    </>
  );
};

export default InventoryPage;