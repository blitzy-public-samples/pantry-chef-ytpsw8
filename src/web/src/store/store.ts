/**
 * HUMAN TASKS:
 * 1. Configure Redux DevTools in environment variables for different environments
 * 2. Set up monitoring for Redux store performance
 * 3. Review and adjust persistence configuration with backend team
 * 4. Configure WebSocket middleware environment settings
 */

// @version @reduxjs/toolkit ^1.9.5
// @version redux-persist ^6.0.0
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  createTransform,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Import reducers from feature slices
import authReducer from './slices/authSlice';
import inventoryReducer from './slices/inventorySlice';
import recipeReducer from './slices/recipeSlice';
import shoppingReducer from './slices/shoppingSlice';

/**
 * Requirement: State Management (5.3.1 Frontend Stack)
 * Root reducer combining all feature slices
 */
const rootReducer = combineReducers({
  auth: authReducer,
  inventory: inventoryReducer,
  recipe: recipeReducer,
  shopping: shoppingReducer
});

/**
 * Minimal structural shape of the persisted shopping slice that the transform below
 * operates on. The full `ShoppingState` interface is private to `shoppingSlice`, so only
 * the transient request-status fields relevant to persistence are declared here; the index
 * signature preserves all durable fields (lists, currentList, filter) untouched.
 */
interface PersistedShoppingState {
  loading: boolean;
  error: string | null;
  [key: string]: unknown;
}

/**
 * Requirement: Performance Optimization — persist only DURABLE shopping data.
 *
 * The shopping slice carries transient request status (`loading`, `error`) alongside the
 * durable list data. Persisting those transient fields traps one-off network failures (for
 * example "Network error - no response received") and stale loading flags in storage, so a
 * later session rehydrates into a phantom error/loading state. This transform strips the
 * transient fields when state is written to storage (inbound) and again on rehydrate
 * (outbound) — resetting them to their initial values — while leaving the durable list data
 * (lists, currentList, filter) fully persisted. Scoped to the `shopping` slice only.
 */
const shoppingPersistTransform = createTransform<PersistedShoppingState, PersistedShoppingState>(
  (inboundState) => ({ ...inboundState, loading: false, error: null }),
  (outboundState) => ({ ...outboundState, loading: false, error: null }),
  { whitelist: ['shopping'] }
);

/**
 * Requirement: Performance Optimization (1.1 System Overview/Redis caching layer)
 * Redux persist configuration for offline capabilities
 */
const persistConfig = {
  key: 'pantrychef-root',
  version: 1,
  storage,
  whitelist: ['auth', 'inventory', 'recipe', 'shopping'], // Persist these reducers
  blacklist: [], // No reducers excluded from persistence
  // Strip transient loading/error from the shopping slice so failed/in-flight requests
  // are never frozen into durable storage (see shoppingPersistTransform above).
  transforms: [shoppingPersistTransform],
};

/**
 * Requirement: Performance Optimization
 * Persisted reducer with storage configuration
 */
const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * Requirement: State Management & Real-time Updates
 * Custom middleware for WebSocket state synchronization
 */
const websocketMiddleware = (storeAPI: any) => (next: any) => (action: any) => {
  // Handle WebSocket-specific actions
  if (action.type?.startsWith('ws/')) {
    // WebSocket action handling logic
  }
  return next(action);
};

/**
 * Requirement: State Management (5.3.1 Frontend Stack)
 * Configure and set up the Redux store with middleware and dev tools
 */
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(websocketMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

/**
 * Requirement: Performance Optimization
 * Redux persistor for state persistence and rehydration
 */
export const persistor = persistStore(store);

/**
 * Requirement: State Management
 * Type definitions for TypeScript support
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Requirement: State Management
 * Type-safe hooks for accessing store state and dispatch
 */
declare module 'react-redux' {
  interface DefaultRootState extends RootState {}
}

export default store;