/**
 * HUMAN TASKS:
 * 1. Configure Material UI theme tokens in theme.ts
 * 2. Set up responsive breakpoints in Tailwind config
 * 3. Verify shopping list categories with backend team
 * 4. Configure error tracking for shopping list operations
 */

// External dependencies
// @version: react ^18.2.0
import React, { useState, useCallback } from 'react';
// @version: next ^13.0.0
import type { NextPage } from 'next';

// Internal dependencies
import MainLayout from '../../components/layout/MainLayout';
import ShoppingList from '../../components/shopping/ShoppingList';
import ListEditor from '../../components/shopping/ListEditor';
import { useShoppingList } from '../../hooks/useShoppingList';
import type { ShoppingListItem } from '../../interfaces/shopping.interface';

/**
 * Shopping dashboard page component that provides comprehensive shopping list management
 * Implements requirements:
 * - Shopping List Generation (1.2 Scope/Core Capabilities)
 * - Shopping List Management (8.1 User Interface Design/Screen Components)
 * - Simplified Grocery Shopping (1.2 Scope/Key Benefits)
 */
const ShoppingDashboard: NextPage = () => {
  // State for managing checked items visibility and item editing
  const [showCheckedItems, setShowCheckedItems] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [selectedListId, setSelectedListId] = useState<string>('');

  // Initialize shopping list hook for state and operations
  const {
    shoppingLists,
    loading,
    error,
    createList,
    updateList,
    toggleItemCheck,
    addItem,
    updateItem,
    deleteItem
  } = useShoppingList();

  /**
   * Handles toggling item check state
   * Requirement: Simplified Grocery Shopping - Easy item management
   */
  const handleItemCheck = useCallback(async (itemId: string) => {
    try {
      if (selectedListId) {
        await toggleItemCheck(selectedListId, itemId);
      }
    } catch (error) {
      console.error('Failed to toggle item check:', error);
    }
  }, [selectedListId, toggleItemCheck]);

  /**
   * Handles saving new or edited items
   * Requirement: Shopping List Management - Item editing
   */
  const handleSaveItem = useCallback(async (item: ShoppingListItem) => {
    try {
      if (editingItem) {
        await updateItem(selectedListId, item.id, item);
      } else {
        await addItem(selectedListId, item);
      }
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to save item:', error);
    }
  }, [selectedListId, editingItem, updateItem, addItem]);

  /**
   * Handles creating a new shopping list
   * Requirement: Shopping List Generation - List creation
   */
  const handleCreateList = useCallback(async () => {
    try {
      const newList = await createList({
        name: `Shopping List ${new Date().toLocaleDateString()}`,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setSelectedListId(newList.id);
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  }, [createList]);

  return (
    <MainLayout className="shopping-dashboard">
      <div className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">
            Shopping Lists
          </h1>
          <div className="flex gap-4">
            {/* Create List Button */}
            <button
              onClick={handleCreateList}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              disabled={loading}
            >
              Create New List
            </button>
            {/* Toggle Checked Items */}
            <button
              onClick={() => setShowCheckedItems(!showCheckedItems)}
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors"
            >
              {showCheckedItems ? 'Hide Checked' : 'Show Checked'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-error-50 text-error-600 rounded-lg" role="alert">
            {error}
          </div>
        )}

        {/* Shopping List Selection */}
        {shoppingLists.length > 0 && (
          <div className="mb-6">
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select a list</option>
              {shoppingLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Main Content Area */}
        <div className="grid gap-6">
          {/* Shopping List Component */}
          {selectedListId && (
            <ShoppingList
              className="bg-white rounded-lg shadow-md"
              showChecked={showCheckedItems}
              listId={selectedListId}
              onItemCheck={handleItemCheck}
            />
          )}

          {/* List Editor Component */}
          {editingItem !== undefined && (
            <ListEditor
              className="bg-white rounded-lg shadow-md"
              initialItem={editingItem}
              onSave={handleSaveItem}
              onCancel={() => setEditingItem(null)}
            />
          )}

          {/* Empty State */}
          {!loading && !selectedListId && shoppingLists.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                No Shopping Lists Yet
              </h3>
              <p className="text-gray-500 mb-4">
                Create your first shopping list to get started
              </p>
              <button
                onClick={handleCreateList}
                className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                Create Shopping List
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ShoppingDashboard;