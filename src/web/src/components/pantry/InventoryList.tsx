/**
 * HUMAN TASKS:
 * 1. Verify that date-fns is installed (npm install date-fns@^2.30.0)
 * 2. Ensure Material Design theme configuration is properly set up
 * 3. Confirm that the inventory service endpoints are correctly configured
 */

import React, { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns'; // ^2.30.0
import Table from '../common/Table';
import useInventory from '../../hooks/useInventory';
import { InventoryItem, StorageLocation, InventoryFilter } from '../../interfaces/inventory.interface';

/**
 * Props interface for the InventoryList component
 */
interface InventoryListProps {
  filter: InventoryFilter;
  onItemUpdate: (item: InventoryItem) => Promise<void>;
  onItemDelete: (itemId: string) => Promise<void>;
}

/**
 * Helper function to format dates consistently
 * Requirement: Digital Pantry Management - Expiration tracking
 */
const formatDate = (date: Date): string => {
  return format(new Date(date), 'MMM dd, yyyy');
};

/**
 * A component that displays and manages the user's pantry inventory items
 * Implements requirements:
 * - Digital Pantry Management with expiration tracking (1.2 Scope/Core Capabilities)
 * - Category-based inventory management with search and filtering (8.1 User Interface Design/Screen Components)
 */
export const InventoryList: React.FC<InventoryListProps> = ({
  filter,
  onItemUpdate,
  onItemDelete
}) => {
  // State for sorting
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Initialize inventory hook with filter
  const {
    items,
    loading,
    updateItem,
    deleteItem
  } = useInventory(filter);

  /**
   * Handle sort changes
   * Requirement: Inventory Management - Advanced sorting capabilities
   */
  const handleSort = useCallback((key: string, direction: string) => {
    setSortKey(key);
    setSortDirection(direction as 'asc' | 'desc');
  }, []);

  /**
   * Handle item updates with optimistic updates
   * Requirement: Digital Pantry Management - Real-time inventory updates
   */
  const handleItemUpdate = useCallback(async (item: InventoryItem) => {
    try {
      await updateItem(item.id, item);
      await onItemUpdate(item);
    } catch (error) {
      console.error('Failed to update item:', error);
      throw error;
    }
  }, [updateItem, onItemUpdate]);

  /**
   * Handle item deletion with confirmation
   * Requirement: Digital Pantry Management - Item removal
   */
  const handleItemDelete = useCallback(async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItem(itemId);
        await onItemDelete(itemId);
      } catch (error) {
        console.error('Failed to delete item:', error);
        throw error;
      }
    }
  }, [deleteItem, onItemDelete]);

  /**
   * Table column definitions with custom renderers
   * Requirement: Inventory Management - Comprehensive item tracking
   */
  const columns = useMemo(() => [
    {
      key: 'name',
      title: 'Item Name',
      sortable: true,
      render: (value: string, row: InventoryItem) => (
        <div className="flex items-center">
          {row.imageUrl && (
            <img
              src={row.imageUrl}
              alt={value}
              className="w-8 h-8 rounded-full mr-2 object-cover"
            />
          )}
          <span>{value}</span>
        </div>
      )
    },
    {
      key: 'quantity',
      title: 'Quantity',
      sortable: true,
      render: (value: number, row: InventoryItem) => (
        <div className="flex items-center">
          <span>{value}</span>
          <span className="ml-1 text-gray-500">{row.unit}</span>
        </div>
      )
    },
    {
      key: 'category',
      title: 'Category',
      sortable: true
    },
    {
      key: 'storageLocation',
      title: 'Location',
      sortable: true,
      render: (value: StorageLocation) => (
        <span className="px-2 py-1 rounded-full text-sm font-medium" style={{
          backgroundColor: value === StorageLocation.REFRIGERATOR ? '#e3f2fd' :
                          value === StorageLocation.FREEZER ? '#e8f5e9' :
                          '#fff3e0',
          color: value === StorageLocation.REFRIGERATOR ? '#1976d2' :
                 value === StorageLocation.FREEZER ? '#388e3c' :
                 '#f57c00'
        }}>
          {value.toLowerCase()}
        </span>
      )
    },
    {
      key: 'expirationDate',
      title: 'Expires',
      sortable: true,
      render: (value: Date) => {
        const date = new Date(value);
        const today = new Date();
        const daysUntilExpiration = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          <span className={`font-medium ${
            daysUntilExpiration <= 0 ? 'text-red-600' :
            daysUntilExpiration <= 7 ? 'text-orange-600' :
            'text-gray-600'
          }`}>
            {formatDate(date)}
          </span>
        );
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, row: InventoryItem) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleItemUpdate(row)}
            className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => handleItemDelete(row.id)}
            className="p-2 text-red-600 hover:text-red-800 transition-colors"
          >
            Delete
          </button>
        </div>
      )
    }
  ], [handleItemUpdate, handleItemDelete]);

  /**
   * Sort items based on current sort key and direction
   * Requirement: Inventory Management - Flexible sorting options
   */
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortKey, sortDirection]);

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <Table
        columns={columns}
        data={sortedItems}
        loading={loading}
        onSort={handleSort}
        className="w-full"
      />
    </div>
  );
};

export default InventoryList;