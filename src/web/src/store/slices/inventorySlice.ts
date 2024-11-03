// @version @reduxjs/toolkit ^1.9.0
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import InventoryService from '../../services/inventory.service';
import {
  InventoryItem,
  InventoryFilter,
  InventoryCategory,
  ExpirationAlert,
} from '../../interfaces/inventory.interface';

// State interface for inventory management
interface InventoryState {
  items: InventoryItem[];
  categories: InventoryCategory[];
  expirationAlerts: ExpirationAlert[];
  loading: boolean;
  error: string | null;
  currentFilter: InventoryFilter | null;
}

// Initial state
const initialState: InventoryState = {
  items: [],
  categories: [],
  expirationAlerts: [],
  loading: false,
  error: null,
  currentFilter: null,
};

// Requirement: Digital Pantry Management - Fetch inventory items with filtering
export const fetchInventoryItems = createAsyncThunk(
  'inventory/fetchItems',
  async (filter: InventoryFilter) => {
    const items = await InventoryService.getInventoryItems(filter);
    return items;
  }
);

// Requirement: Digital Pantry Management - Add new inventory items
export const addItem = createAsyncThunk(
  'inventory/addItem',
  async (item: Omit<InventoryItem, 'id'>) => {
    const newItem = await InventoryService.addInventoryItem(item);
    return newItem;
  }
);

// Requirement: Digital Pantry Management - Update existing inventory items
export const updateItem = createAsyncThunk(
  'inventory/updateItem',
  async ({ id, updates }: { id: string; updates: Partial<InventoryItem> }) => {
    const updatedItem = await InventoryService.updateInventoryItem(id, updates);
    return updatedItem;
  }
);

// Requirement: Digital Pantry Management - Delete inventory items
export const deleteItem = createAsyncThunk(
  'inventory/deleteItem',
  async (id: string) => {
    await InventoryService.deleteInventoryItem(id);
    return id;
  }
);

// Requirement: Inventory Management - Fetch inventory categories
export const fetchCategories = createAsyncThunk(
  'inventory/fetchCategories',
  async () => {
    const categories = await InventoryService.getCategories();
    return categories;
  }
);

// Requirement: Expiration Tracking - Fetch expiration alerts
export const fetchExpirationAlerts = createAsyncThunk(
  'inventory/fetchExpirationAlerts',
  async (daysThreshold: number) => {
    const alerts = await InventoryService.getExpirationAlerts(daysThreshold);
    return alerts;
  }
);

// Create the inventory slice
const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    // Requirement: Inventory Management - Update current filter
    setFilter: (state, action: PayloadAction<InventoryFilter>) => {
      state.currentFilter = action.payload;
    },
    // Requirement: Inventory Management - Clear current filter
    clearFilter: (state) => {
      state.currentFilter = null;
    },
    // Requirement: Digital Pantry Management - Clear error state
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch inventory items
    builder
      .addCase(fetchInventoryItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchInventoryItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory items';
      })

    // Add item
    builder
      .addCase(addItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addItem.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(addItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to add item';
      })

    // Update item
    builder
      .addCase(updateItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateItem.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update item';
      })

    // Delete item
    builder
      .addCase(deleteItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteItem.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(item => item.id !== action.payload);
      })
      .addCase(deleteItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete item';
      })

    // Fetch categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch categories';
      })

    // Fetch expiration alerts
    builder
      .addCase(fetchExpirationAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpirationAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.expirationAlerts = action.payload;
      })
      .addCase(fetchExpirationAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch expiration alerts';
      });
  },
});

// Export actions
export const { setFilter, clearFilter, clearError } = inventorySlice.actions;

// Selectors
export const selectInventoryItems = (state: RootState) => state.inventory.items;
export const selectCategories = (state: RootState) => state.inventory.categories;
export const selectExpirationAlerts = (state: RootState) => state.inventory.expirationAlerts;
export const selectInventoryLoading = (state: RootState) => state.inventory.loading;
export const selectInventoryError = (state: RootState) => state.inventory.error;
export const selectCurrentFilter = (state: RootState) => state.inventory.currentFilter;

// Export reducer
export default inventorySlice.reducer;