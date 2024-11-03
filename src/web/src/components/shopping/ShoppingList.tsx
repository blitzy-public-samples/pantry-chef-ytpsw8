/**
 * HUMAN TASKS:
 * 1. Verify Material Design theme configuration is properly set up
 * 2. Ensure proper error tracking integration for shopping list operations
 * 3. Review accessibility requirements for shopping list interactions
 */

// External dependencies
// @version: react ^18.2.0
import React, { useEffect, useMemo } from 'react';
// @version: classnames ^2.3.0
import classnames from 'classnames';

// Internal dependencies
import { ShoppingList as ShoppingListInterface, ShoppingListItem } from '../../interfaces/shopping.interface';
import { useShoppingList } from '../../hooks/useShoppingList';
import Table from '../common/Table';

// Props interface for the ShoppingList component
interface ShoppingListProps {
  className?: string;
  showChecked: boolean;
  listId: string;
  onItemCheck: (itemId: string) => Promise<void>;
}

/**
 * A React component for displaying and managing shopping lists with Material Design styling
 * Implements requirements:
 * - Shopping List Generation (1.2 Scope/Core Capabilities)
 * - Shopping List Management (8.1 User Interface Design/Screen Components)
 * - Simplified Grocery Shopping (1.2 Scope/Key Benefits)
 */
export const ShoppingList: React.FC<ShoppingListProps> = ({
  className,
  showChecked,
  listId,
  onItemCheck,
}) => {
  // Initialize shopping list hook
  const {
    shoppingLists,
    loading,
    error,
    toggleItemCheck,
    updateItem,
    filterItems
  } = useShoppingList();

  // Get current shopping list
  const currentList = useMemo(() => 
    shoppingLists.find(list => list.id === listId),
    [shoppingLists, listId]
  );

  // Filter items based on showChecked prop
  const filteredItems = useMemo(() => 
    currentList?.items.filter(item => showChecked || !item.checked) || [],
    [currentList, showChecked]
  );

  // Handle item check/uncheck
  const handleItemCheck = async (itemId: string) => {
    try {
      await toggleItemCheck(listId, itemId);
      await onItemCheck(itemId);
    } catch (error) {
      console.error('Failed to toggle item check:', error);
    }
  };

  // Define table columns with item properties
  const columns = useMemo(() => [
    {
      key: 'name',
      title: 'Item',
      sortable: true,
      render: (value: string, item: ShoppingListItem) => (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => handleItemCheck(item.id)}
            className="checkbox mr-3"
            aria-label={`Mark ${item.name} as ${item.checked ? 'unchecked' : 'checked'}`}
          />
          <span className={classnames('item-name', { 'item-checked': item.checked })}>
            {value}
          </span>
        </div>
      ),
    },
    {
      key: 'quantity',
      title: 'Quantity',
      sortable: true,
      render: (value: number, item: ShoppingListItem) => (
        <span className="item-quantity">
          {`${value} ${item.unit}`}
        </span>
      ),
    },
    {
      key: 'category',
      title: 'Category',
      sortable: true,
      render: (value: string) => (
        <span className="item-category">
          {value}
        </span>
      ),
    },
    {
      key: 'recipeName',
      title: 'Recipe',
      render: (value: string, item: ShoppingListItem) => (
        value ? (
          <span className="text-primary-600">
            {value}
          </span>
        ) : null
      ),
    },
    {
      key: 'notes',
      title: 'Notes',
      render: (value: string) => (
        <span className="text-secondary-500 text-sm">
          {value}
        </span>
      ),
    },
  ], [handleItemCheck]);

  // Handle error state
  if (error) {
    return (
      <div className="text-error-600 p-4 rounded-lg bg-error-50">
        Failed to load shopping list: {error}
      </div>
    );
  }

  // Handle empty list state
  if (!loading && (!currentList || !filteredItems.length)) {
    return (
      <div className="text-secondary-500 p-4 text-center">
        No items in this shopping list
      </div>
    );
  }

  return (
    <div className={classnames('shopping-list', className)}>
      <Table
        columns={columns}
        data={filteredItems}
        loading={loading}
        onSort={async (key, direction) => {
          try {
            await filterItems(listId, {
              categories: [],
              searchTerm: '',
              showCheckedItems: showChecked,
              recipeId: '',
              sortBy: key,
              sortDirection: direction,
            });
          } catch (error) {
            console.error('Failed to sort items:', error);
          }
        }}
        className="w-full"
      />
    </div>
  );
};

export default ShoppingList;