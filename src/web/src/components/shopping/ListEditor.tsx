/**
 * HUMAN TASKS:
 * 1. Verify Material Design theme configuration
 * 2. Test form validation with screen readers
 * 3. Review shopping list categories with UX team
 * 4. Ensure proper error tracking integration
 */

import React, { useState, useCallback } from 'react';
// @version: react ^18.2.0
import classNames from 'classnames';
// @version: classnames ^2.3.1

// Internal dependencies
import Input from '../common/Input';
import { useShoppingList } from '../../hooks/useShoppingList';
import { ShoppingListItem } from '../../interfaces/shopping.interface';

interface ListEditorProps {
  className?: string;
  initialItem: ShoppingListItem | null;
  onSave: (item: ShoppingListItem) => void;
  onCancel: () => void;
}

/**
 * Component for editing shopping list items with form validation and error handling
 * Requirements addressed:
 * - Shopping List Management (8.1 User Interface Design/Screen Components)
 * - Shopping List Generation (1.2 Scope/Core Capabilities)
 * - Simplified Grocery Shopping (1.2 Scope/Key Benefits)
 */
export const ListEditor: React.FC<ListEditorProps> = ({
  className,
  initialItem,
  onSave,
  onCancel
}) => {
  // Initialize form state with initial item or empty values
  const [formData, setFormData] = useState<Partial<ShoppingListItem>>({
    name: initialItem?.name || '',
    quantity: initialItem?.quantity || 1,
    unit: initialItem?.unit || '',
    category: initialItem?.category || '',
    notes: initialItem?.notes || '',
    recipeId: initialItem?.recipeId || '',
    recipeName: initialItem?.recipeName || ''
  });

  // Form validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shopping list operations hook
  const { addItem, updateItem } = useShoppingList();

  /**
   * Validates form data before submission
   * Requirement: Shopping List Management - Data validation
   */
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Item name is required';
    }

    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (!formData.unit?.trim()) {
      newErrors.unit = 'Unit is required';
    }

    if (!formData.category?.trim()) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  /**
   * Handles form input changes
   * Requirement: Shopping List Management - Form handling
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  }, []);

  /**
   * Handles form submission
   * Requirements:
   * - Shopping List Management - Item creation/update
   * - Simplified Grocery Shopping - Streamlined item management
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!validateForm()) {
        setIsSubmitting(false);
        return;
      }

      const itemData: ShoppingListItem = {
        id: initialItem?.id || crypto.randomUUID(),
        name: formData.name!,
        quantity: formData.quantity!,
        unit: formData.unit!,
        category: formData.category!,
        notes: formData.notes || '',
        recipeId: formData.recipeId || '',
        recipeName: formData.recipeName || '',
        checked: initialItem?.checked || false
      };

      if (initialItem) {
        await updateItem(initialItem.id, itemData);
      } else {
        await addItem(itemData.id, itemData);
      }

      onSave(itemData);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        submit: 'Failed to save item. Please try again.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, initialItem, validateForm, addItem, updateItem, onSave]);

  return (
    <form
      onSubmit={handleSubmit}
      className={classNames(
        'list-editor-container p-4 bg-white rounded-lg shadow-md',
        className
      )}
    >
      <div className="form-grid grid gap-4">
        {/* Item Name Input */}
        <Input
          id="name"
          name="name"
          label="Item Name"
          type="text"
          placeholder="Enter item name"
          value={formData.name}
          onChange={handleInputChange}
          error={errors.name}
          required
          className="col-span-2"
        />

        {/* Quantity Input */}
        <Input
          id="quantity"
          name="quantity"
          label="Quantity"
          type="number"
          placeholder="Enter quantity"
          value={formData.quantity}
          onChange={handleInputChange}
          error={errors.quantity}
          required
          className="col-span-1"
        />

        {/* Unit Input */}
        <Input
          id="unit"
          name="unit"
          label="Unit"
          type="text"
          placeholder="e.g., kg, pcs"
          value={formData.unit}
          onChange={handleInputChange}
          error={errors.unit}
          required
          className="col-span-1"
        />

        {/* Category Input */}
        <Input
          id="category"
          name="category"
          label="Category"
          type="text"
          placeholder="Select category"
          value={formData.category}
          onChange={handleInputChange}
          error={errors.category}
          required
          className="col-span-2"
        />

        {/* Notes Input */}
        <Input
          id="notes"
          name="notes"
          label="Notes"
          type="text"
          placeholder="Add notes (optional)"
          value={formData.notes}
          onChange={handleInputChange}
          error={errors.notes}
          className="col-span-2"
        />

        {/* Recipe Association Inputs - shown only when item is from a recipe */}
        {formData.recipeId && (
          <>
            <Input
              id="recipeName"
              name="recipeName"
              label="Recipe"
              type="text"
              value={formData.recipeName}
              disabled
              className="col-span-2"
            />
          </>
        )}

        {/* Error Message */}
        {errors.submit && (
          <div className="error-text text-error-600 text-sm col-span-2" role="alert">
            {errors.submit}
          </div>
        )}

        {/* Action Buttons */}
        <div className="button-group flex justify-end gap-3 col-span-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="cancel-button px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={classNames(
              'save-button px-4 py-2 text-white bg-primary-600 rounded-md',
              'hover:bg-primary-700 transition-colors',
              'disabled:bg-primary-300 disabled:cursor-not-allowed'
            )}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : initialItem ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ListEditor;