// External dependencies
// @version: react ^18.2.0
import React from 'react';
// @version: @testing-library/react ^13.0.0
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
// @version: @jest/globals ^29.0.0
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
// @version: react-redux ^8.0.0
import { Provider } from 'react-redux';

// Internal dependencies
import { ShoppingList } from '../../src/components/shopping/ShoppingList';
import { ListEditor } from '../../src/components/shopping/ListEditor';
import { useShoppingList } from '../../src/hooks/useShoppingList';
import { ShoppingListItem } from '../../src/interfaces/shopping.interface';

// Mock the useShoppingList hook
jest.mock('../../src/hooks/useShoppingList');

// Mock shopping list data
const mockShoppingListItem: ShoppingListItem = {
  id: '1',
  name: 'Apples',
  quantity: 2,
  unit: 'kg',
  category: 'Fruits',
  checked: false,
  notes: 'Red apples preferred',
  recipeId: '',
  recipeName: ''
};

const mockShoppingListWithRecipe: ShoppingListItem = {
  id: '2',
  name: 'Chicken Breast',
  quantity: 500,
  unit: 'g',
  category: 'Meat',
  checked: false,
  notes: 'For curry recipe',
  recipeId: 'recipe123',
  recipeName: 'Chicken Curry'
};

// Mock Redux store
const mockStore = {
  getState: () => ({
    shopping: {
      lists: [],
      loading: false,
      error: null
    }
  }),
  dispatch: jest.fn(),
  subscribe: jest.fn()
};

// Test suite for ShoppingList component
describe('ShoppingList Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (useShoppingList as jest.Mock).mockReturnValue({
      shoppingLists: [{
        id: 'list1',
        items: [mockShoppingListItem, mockShoppingListWithRecipe]
      }],
      loading: false,
      error: null,
      toggleItemCheck: jest.fn(),
      filterItems: jest.fn()
    });
  });

  // Test requirement: Shopping List Management - Display and interaction
  test('renders shopping list with items correctly', () => {
    const onItemCheck = jest.fn();
    
    render(
      <Provider store={mockStore}>
        <ShoppingList
          className="test-class"
          showChecked={true}
          listId="list1"
          onItemCheck={onItemCheck}
        />
      </Provider>
    );

    // Verify item rendering
    expect(screen.getByText('Apples')).toBeInTheDocument();
    expect(screen.getByText('2 kg')).toBeInTheDocument();
    expect(screen.getByText('Fruits')).toBeInTheDocument();
  });

  // Test requirement: Shopping List Management - Item checking functionality
  test('handles item check/uncheck correctly', async () => {
    const onItemCheck = jest.fn();
    const mockToggleItemCheck = jest.fn();
    (useShoppingList as jest.Mock).mockReturnValue({
      shoppingLists: [{
        id: 'list1',
        items: [mockShoppingListItem]
      }],
      loading: false,
      error: null,
      toggleItemCheck: mockToggleItemCheck,
      filterItems: jest.fn()
    });

    render(
      <Provider store={mockStore}>
        <ShoppingList
          showChecked={true}
          listId="list1"
          onItemCheck={onItemCheck}
        />
      </Provider>
    );

    // Find and click checkbox
    const checkbox = screen.getByRole('checkbox', { name: /Mark Apples as checked/i });
    fireEvent.click(checkbox);

    // Verify toggle and callback
    await waitFor(() => {
      expect(mockToggleItemCheck).toHaveBeenCalledWith('list1', '1');
      expect(onItemCheck).toHaveBeenCalledWith('1');
    });
  });

  // Test requirement: Shopping List Management - Loading state
  test('displays loading state correctly', () => {
    (useShoppingList as jest.Mock).mockReturnValue({
      shoppingLists: [],
      loading: true,
      error: null,
      toggleItemCheck: jest.fn(),
      filterItems: jest.fn()
    });

    render(
      <Provider store={mockStore}>
        <ShoppingList
          showChecked={true}
          listId="list1"
          onItemCheck={jest.fn()}
        />
      </Provider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // Test requirement: Shopping List Management - Error handling
  test('displays error state correctly', () => {
    (useShoppingList as jest.Mock).mockReturnValue({
      shoppingLists: [],
      loading: false,
      error: 'Failed to load shopping list',
      toggleItemCheck: jest.fn(),
      filterItems: jest.fn()
    });

    render(
      <Provider store={mockStore}>
        <ShoppingList
          showChecked={true}
          listId="list1"
          onItemCheck={jest.fn()}
        />
      </Provider>
    );

    expect(screen.getByText(/Failed to load shopping list/i)).toBeInTheDocument();
  });

  // Test requirement: Shopping List Management - Recipe association display
  test('displays recipe information when available', () => {
    render(
      <Provider store={mockStore}>
        <ShoppingList
          showChecked={true}
          listId="list1"
          onItemCheck={jest.fn()}
        />
      </Provider>
    );

    expect(screen.getByText('Chicken Curry')).toBeInTheDocument();
  });
});

// Test suite for ListEditor component
describe('ListEditor Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useShoppingList as jest.Mock).mockReturnValue({
      addItem: jest.fn(),
      updateItem: jest.fn()
    });
  });

  // Test requirement: Shopping List Management - Form rendering
  test('renders form with initial values correctly', () => {
    render(
      <Provider store={mockStore}>
        <ListEditor
          initialItem={mockShoppingListItem}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      </Provider>
    );

    // Verify form fields
    expect(screen.getByLabelText(/Item Name/i)).toHaveValue('Apples');
    expect(screen.getByLabelText(/Quantity/i)).toHaveValue(2);
    expect(screen.getByLabelText(/Unit/i)).toHaveValue('kg');
    expect(screen.getByLabelText(/Category/i)).toHaveValue('Fruits');
    expect(screen.getByLabelText(/Notes/i)).toHaveValue('Red apples preferred');
  });

  // Test requirement: Shopping List Management - Form validation
  test('validates required fields before submission', async () => {
    const onSave = jest.fn();
    
    render(
      <Provider store={mockStore}>
        <ListEditor
          initialItem={null}
          onSave={onSave}
          onCancel={jest.fn()}
        />
      </Provider>
    );

    // Submit empty form
    fireEvent.click(screen.getByText('Add Item'));

    // Verify validation messages
    await waitFor(() => {
      expect(screen.getByText(/Item name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Unit is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Category is required/i)).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  // Test requirement: Shopping List Management - Item creation
  test('handles new item creation correctly', async () => {
    const onSave = jest.fn();
    const mockAddItem = jest.fn();
    (useShoppingList as jest.Mock).mockReturnValue({
      addItem: mockAddItem,
      updateItem: jest.fn()
    });

    render(
      <Provider store={mockStore}>
        <ListEditor
          initialItem={null}
          onSave={onSave}
          onCancel={jest.fn()}
        />
      </Provider>
    );

    // Fill form
    fireEvent.change(screen.getByLabelText(/Item Name/i), { target: { value: 'Bananas' } });
    fireEvent.change(screen.getByLabelText(/Quantity/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Unit/i), { target: { value: 'kg' } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: 'Fruits' } });

    // Submit form
    fireEvent.click(screen.getByText('Add Item'));

    // Verify submission
    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalled();
      expect(onSave).toHaveBeenCalled();
    });
  });

  // Test requirement: Shopping List Management - Item update
  test('handles item update correctly', async () => {
    const onSave = jest.fn();
    const mockUpdateItem = jest.fn();
    (useShoppingList as jest.Mock).mockReturnValue({
      addItem: jest.fn(),
      updateItem: mockUpdateItem
    });

    render(
      <Provider store={mockStore}>
        <ListEditor
          initialItem={mockShoppingListItem}
          onSave={onSave}
          onCancel={jest.fn()}
        />
      </Provider>
    );

    // Update quantity
    fireEvent.change(screen.getByLabelText(/Quantity/i), { target: { value: '3' } });

    // Submit form
    fireEvent.click(screen.getByText('Update Item'));

    // Verify update
    await waitFor(() => {
      expect(mockUpdateItem).toHaveBeenCalled();
      expect(onSave).toHaveBeenCalled();
    });
  });

  // Test requirement: Shopping List Management - Recipe association
  test('displays recipe fields when item has recipe association', () => {
    render(
      <Provider store={mockStore}>
        <ListEditor
          initialItem={mockShoppingListWithRecipe}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      </Provider>
    );

    expect(screen.getByDisplayValue('Chicken Curry')).toBeInTheDocument();
    expect(screen.getByDisplayValue('For curry recipe')).toBeInTheDocument();
  });

  // Test requirement: Shopping List Management - Cancel operation
  test('handles cancel operation correctly', () => {
    const onCancel = jest.fn();
    
    render(
      <Provider store={mockStore}>
        <ListEditor
          initialItem={null}
          onSave={jest.fn()}
          onCancel={onCancel}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});