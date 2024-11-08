/**
 * HUMAN TASKS:
 * 1. Configure error tracking integration for shopping list operations
 * 2. Verify shopping list categories with backend team
 * 3. Review shopping list filter performance with large datasets
 * 4. Set up monitoring for shopping list generation performance
 */

// @version: @reduxjs/toolkit ^1.9.5
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  ShoppingList,
  ShoppingListItem,
  ShoppingListFilter,
  ShoppingListGenerationOptions
} from '../../interfaces/shopping.interface';
import ShoppingService from '../../services/shopping.service';

// State interface for shopping slice
interface ShoppingState {
  lists: ShoppingList[];
  currentList: ShoppingList | null;
  filter: ShoppingListFilter;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: ShoppingState = {
  lists: [],
  currentList: null,
  filter: {
    categories: [],
    searchTerm: '',
    showCheckedItems: true,
    recipeId: '',
    sortBy: '', // add default value
    sortDirection: '', // add default value
  },
  loading: false,
  error: null
};

/**
 * Async thunk to fetch all shopping lists
 * Requirement: Shopping List Management (8.1 User Interface Design/Screen Components)
 */
export const fetchShoppingLists = createAsyncThunk(
  'shopping/fetchShoppingLists',
  async (_, { rejectWithValue }) => {
    try {
      return await ShoppingService.getShoppingLists();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk to fetch a specific shopping list
 * Requirement: Shopping List Management
 */
export const fetchShoppingList = createAsyncThunk(
  'shopping/fetchShoppingList',
  async (id: string, { rejectWithValue }) => {
    try {
      return await ShoppingService.getShoppingList(id);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk to create a new shopping list
 * Requirement: Shopping List Management
 */
export const createShoppingList = createAsyncThunk(
  'shopping/createShoppingList',
  async (data: Partial<ShoppingList>, { rejectWithValue }) => {
    try {
      return await ShoppingService.createShoppingList(data);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk to update a shopping list
 * Requirement: Shopping List Management
 */
export const updateShoppingList = createAsyncThunk(
  'shopping/updateShoppingList',
  async ({ id, data }: { id: string; data: Partial<ShoppingList> }, { rejectWithValue }) => {
    try {
      return await ShoppingService.updateShoppingList(id, data);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk to delete a shopping list
 * Requirement: Shopping List Management
 */
export const deleteShoppingList = createAsyncThunk(
  'shopping/deleteShoppingList',
  async (id: string, { rejectWithValue }) => {
    try {
      await ShoppingService.deleteShoppingList(id);
      return id;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk to generate a shopping list from recipes
 * Requirement: Shopping List Generation (1.2 Scope/Core Capabilities)
 */
export const generateShoppingList = createAsyncThunk(
  'shopping/generateShoppingList',
  async (options: ShoppingListGenerationOptions, { rejectWithValue }) => {
    try {
      return await ShoppingService.generateShoppingList(options);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Shopping slice with reducers and actions
 * Requirement: Shopping List Management & Generation
 */
const shoppingSlice = createSlice({
  name: 'shopping',
  initialState,
  reducers: {
    // Set filter for shopping list items
    setFilter: (state, action: PayloadAction<Partial<ShoppingListFilter>>) => {
      state.filter = { ...state.filter, ...action.payload };
    },

    // Toggle checked status of shopping list item
    toggleItemChecked: (state, action: PayloadAction<{ listId: string; itemId: string }>) => {
      const list = state.lists.find(l => l.id === action.payload.listId);
      if (list) {
        const item = list.items.find(i => i.id === action.payload.itemId);
        if (item) {
          item.checked = !item.checked;
        }
      }
    },

    // Clear all filters
    clearFilter: (state) => {
      state.filter = initialState.filter;
    }
  },
  extraReducers: (builder) => {
    // Fetch all lists
    builder.addCase(fetchShoppingLists.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchShoppingLists.fulfilled, (state, action) => {
      state.lists = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchShoppingLists.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch single list
    builder.addCase(fetchShoppingList.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchShoppingList.fulfilled, (state, action) => {
      state.currentList = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchShoppingList.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create list
    builder.addCase(createShoppingList.fulfilled, (state, action) => {
      state.lists.push(action.payload);
      state.currentList = action.payload;
      state.loading = false;
    });

    // Update list
    builder.addCase(updateShoppingList.fulfilled, (state, action) => {
      const index = state.lists.findIndex(list => list.id === action.payload.id);
      if (index !== -1) {
        state.lists[index] = action.payload;
      }
      if (state.currentList?.id === action.payload.id) {
        state.currentList = action.payload;
      }
    });

    // Delete list
    builder.addCase(deleteShoppingList.fulfilled, (state, action) => {
      state.lists = state.lists.filter(list => list.id !== action.payload);
      if (state.currentList?.id === action.payload) {
        state.currentList = null;
      }
    });

    // Generate list
    builder.addCase(generateShoppingList.fulfilled, (state, action) => {
      state.lists.push(action.payload);
      state.currentList = action.payload;
    });
  }
});

// Export actions
export const { setFilter, toggleItemChecked, clearFilter } = shoppingSlice.actions;

// Export selectors
export const shoppingSelectors = {
  selectAllLists: (state: { shopping: ShoppingState }) => state.shopping.lists,
  selectCurrentList: (state: { shopping: ShoppingState }) => state.shopping.currentList,
  selectFilter: (state: { shopping: ShoppingState }) => state.shopping.filter,
  selectFilteredItems: (state: { shopping: ShoppingState }) => {
    const list = state.shopping.currentList;
    const filter = state.shopping.filter;

    if (!list) return [];

    return list.items.filter(item => {
      const matchesCategory = filter.categories.length === 0 ||
        filter.categories.includes(item.category);
      const matchesSearch = !filter.searchTerm ||
        item.name.toLowerCase().includes(filter.searchTerm.toLowerCase());
      const matchesChecked = filter.showCheckedItems || !item.checked;
      const matchesRecipe = !filter.recipeId || item.recipeId === filter.recipeId;

      return matchesCategory && matchesSearch && matchesChecked && matchesRecipe;
    });
  }
};

// Export reducer
export default shoppingSlice.reducer;