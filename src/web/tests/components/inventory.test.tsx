import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react'; // ^14.0.0
import { describe, test, expect, jest, beforeEach } from '@jest/globals'; // ^29.0.0
import { InventoryList } from '../../src/components/pantry/InventoryList';
import { CategoryFilter } from '../../src/components/pantry/CategoryFilter';
import { ExpirationTracker } from '../../src/components/pantry/ExpirationTracker';
import { InventoryItem, StorageLocation } from '../../src/interfaces/inventory.interface';

// Mock the hooks and utilities
jest.mock('../../src/hooks/useInventory');
jest.mock('../../src/utils/date', () => ({
  formatDate: jest.fn((date) => '2024-01-01'),
  calculateDaysUntilExpiration: jest.fn((date) => 5)
}));

// Mock data generators
const mockInventoryData = (): InventoryItem[] => [
  {
    id: '1',
    name: 'Milk',
    quantity: 1,
    unit: 'gallon',
    category: 'Dairy',
    storageLocation: StorageLocation.REFRIGERATOR,
    expirationDate: new Date('2024-01-10')
  },
  {
    id: '2',
    name: 'Bread',
    quantity: 2,
    unit: 'loaves',
    category: 'Bakery',
    storageLocation: StorageLocation.PANTRY,
    expirationDate: new Date('2024-01-05')
  }
];

const mockCategoryData = () => [
  { id: '1', name: 'Dairy' },
  { id: '2', name: 'Bakery' },
  { id: '3', name: 'Produce' }
];

describe('InventoryList', () => {
  // Test: Digital Pantry Management - Proper rendering with inventory items
  test('should render inventory items with proper InventoryItem interface', async () => {
    const mockItems = mockInventoryData();
    const mockOnItemUpdate = jest.fn();
    const mockOnItemDelete = jest.fn();
    
    (useInventory as jest.Mock).mockReturnValue({
      items: mockItems,
      loading: false,
      updateItem: jest.fn(),
      deleteItem: jest.fn()
    });

    render(
      <InventoryList
        filter={{ categories: [], locations: [], searchTerm: '' }}
        onItemUpdate={mockOnItemUpdate}
        onItemDelete={mockOnItemDelete}
      />
    );

    // Verify items are rendered
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
  });

  // Test: Inventory Management - Item update functionality
  test('should handle item updates with correct Promise resolution', async () => {
    const mockItems = mockInventoryData();
    const mockOnItemUpdate = jest.fn().mockResolvedValue(undefined);
    const mockUpdateItem = jest.fn().mockResolvedValue(undefined);
    
    (useInventory as jest.Mock).mockReturnValue({
      items: mockItems,
      loading: false,
      updateItem: mockUpdateItem,
      deleteItem: jest.fn()
    });

    render(
      <InventoryList
        filter={{ categories: [], locations: [], searchTerm: '' }}
        onItemUpdate={mockOnItemUpdate}
        onItemDelete={jest.fn()}
      />
    );

    // Click edit button and verify update
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    
    await waitFor(() => {
      expect(mockUpdateItem).toHaveBeenCalledWith('1', mockItems[0]);
      expect(mockOnItemUpdate).toHaveBeenCalledWith(mockItems[0]);
    });
  });

  // Test: Digital Pantry Management - Item deletion
  test('should handle item deletion with proper itemId', async () => {
    const mockItems = mockInventoryData();
    const mockOnItemDelete = jest.fn().mockResolvedValue(undefined);
    const mockDeleteItem = jest.fn().mockResolvedValue(undefined);
    
    (useInventory as jest.Mock).mockReturnValue({
      items: mockItems,
      loading: false,
      updateItem: jest.fn(),
      deleteItem: mockDeleteItem
    });

    window.confirm = jest.fn(() => true);

    render(
      <InventoryList
        filter={{ categories: [], locations: [], searchTerm: '' }}
        onItemUpdate={jest.fn()}
        onItemDelete={mockOnItemDelete}
      />
    );

    // Click delete button and verify deletion
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(mockDeleteItem).toHaveBeenCalledWith('1');
      expect(mockOnItemDelete).toHaveBeenCalledWith('1');
    });
  });

  // Test: Inventory Management - Loading state
  test('should display loading state with Material Design spinner', () => {
    (useInventory as jest.Mock).mockReturnValue({
      items: [],
      loading: true,
      updateItem: jest.fn(),
      deleteItem: jest.fn()
    });

    render(
      <InventoryList
        filter={{ categories: [], locations: [], searchTerm: '' }}
        onItemUpdate={jest.fn()}
        onItemDelete={jest.fn()}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('CategoryFilter', () => {
  // Test: Inventory Management - Category rendering
  test('should render categories with proper InventoryCategory interface', () => {
    const categories = mockCategoryData();
    const selectedCategories: string[] = [];
    
    render(
      <CategoryFilter
        selectedCategories={selectedCategories}
        onCategoryChange={jest.fn()}
        availableCategories={categories}
      />
    );

    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Select categories')).toBeInTheDocument();
  });

  // Test: Inventory Management - Category selection
  test('should handle category selection with string array', async () => {
    const categories = mockCategoryData();
    const selectedCategories: string[] = [];
    const handleChange = jest.fn();
    
    render(
      <CategoryFilter
        selectedCategories={selectedCategories}
        onCategoryChange={handleChange}
        availableCategories={categories}
      />
    );

    const dropdown = screen.getByRole('combobox');
    fireEvent.change(dropdown, { target: { value: '1' } });
    
    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith(['1']);
    });
  });

  // Test: Inventory Management - Multiple selections
  test('should handle multiple selections correctly', async () => {
    const categories = mockCategoryData();
    const selectedCategories = ['1'];
    const handleChange = jest.fn();
    
    render(
      <CategoryFilter
        selectedCategories={selectedCategories}
        onCategoryChange={handleChange}
        availableCategories={categories}
      />
    );

    const dropdown = screen.getByRole('combobox');
    fireEvent.change(dropdown, { target: { value: '2' } });
    
    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith(['1', '2']);
    });
  });

  // Test: Inventory Management - Disabled state
  test('should respect disabled state for user interactions', () => {
    const categories = mockCategoryData();
    
    render(
      <CategoryFilter
        selectedCategories={[]}
        onCategoryChange={jest.fn()}
        availableCategories={categories}
        disabled={true}
      />
    );

    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toBeDisabled();
  });
});

describe('ExpirationTracker', () => {
  // Test: Food Waste Reduction - Expiring items display
  test('should display expiring items with proper date formatting', async () => {
    const mockItems = mockInventoryData();
    
    (useInventory as jest.Mock).mockReturnValue({
      items: mockItems,
      loading: false
    });

    render(<ExpirationTracker daysThreshold={7} />);

    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
    expect(screen.getByText('Expires in 5 days')).toBeInTheDocument();
  });

  // Test: Digital Pantry Management - Days threshold
  test('should respect daysThreshold setting for alerts', () => {
    const mockItems = mockInventoryData();
    
    (useInventory as jest.Mock).mockReturnValue({
      items: mockItems,
      loading: false
    });

    render(<ExpirationTracker daysThreshold={3} />);

    const expiringItems = mockItems.filter(item => {
      const daysUntil = 5; // Mocked value from calculateDaysUntilExpiration
      return daysUntil <= 3;
    });

    expect(screen.getAllByRole('row')).toHaveLength(expiringItems.length + 1); // +1 for header row
  });

  // Test: Food Waste Reduction - Sorting
  test('should sort items by expiration date correctly', () => {
    const mockItems = mockInventoryData();
    
    (useInventory as jest.Mock).mockReturnValue({
      items: mockItems,
      loading: false
    });

    render(<ExpirationTracker daysThreshold={7} />);

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Bread'); // Should be first as it expires sooner
    expect(rows[2]).toHaveTextContent('Milk');
  });

  // Test: Digital Pantry Management - Alert types
  test('should show appropriate ExpirationAlertType based on dates', () => {
    const mockItems = [
      {
        ...mockInventoryData()[0],
        expirationDate: new Date(Date.now() - 86400000) // Yesterday
      }
    ];
    
    (useInventory as jest.Mock).mockReturnValue({
      items: mockItems,
      loading: false
    });

    render(<ExpirationTracker daysThreshold={7} />);

    expect(screen.getByText(/Expired/)).toHaveClass('alert-expired');
  });
});