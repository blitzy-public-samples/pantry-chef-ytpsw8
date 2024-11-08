// @version @reduxjs/toolkit ^1.9.5
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  AuthState,
  LoginCredentials,
  SignupCredentials,
  AuthResponse
} from '../../interfaces/auth.interface';
import { AuthService } from '../../services/auth.service';
import { RootState } from '../store';

/**
 * HUMAN TASKS:
 * 1. Configure OAuth2.0 providers in environment variables
 * 2. Set up JWT secret and expiration times in configuration
 * 3. Implement Redis session storage configuration
 * 4. Configure SSL certificates for secure authentication
 */

// Initialize auth service instance
const authService = new AuthService();

// Initial state for auth slice
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null
};

/**
 * Async thunk for user login
 * Requirement: Authentication Service - User login functionality
 */
export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for user signup
 * Requirement: Authentication Service - User registration
 */
export const signupThunk = createAsyncThunk(
  'auth/signup',
  async (credentials: SignupCredentials, { rejectWithValue }) => {
    try {
      if (credentials.password !== credentials.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      const response = await authService.signup(credentials);
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for user logout
 * Requirement: Session Management - Token and session cleanup
 */
export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for token refresh
 * Requirement: Security Protocols - Token refresh mechanism
 */
export const refreshTokenThunk = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.refreshToken();
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Auth slice with reducers and actions
 * Requirement: Authentication Service - State management
 */
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Reset error state
    clearError: (state) => {
      state.error = null;
    },
    // Reset entire auth state
    resetAuth: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Login reducers
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.loading = false;
        state.error = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.user = null;
        state.loading = false;
        state.error = action.payload as string;
      })

      // Signup reducers
      .addCase(signupThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupThunk.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.loading = false;
        state.error = null;
      })
      .addCase(signupThunk.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.user = null;
        state.loading = false;
        state.error = action.payload as string;
      })

      // Logout reducers
      .addCase(logoutThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.loading = false;
        state.error = null;
      })
      .addCase(logoutThunk.rejected, (state, action) => {
        // Still clear auth state even if server logout fails
        state.isAuthenticated = false;
        state.user = null;
        state.loading = false;
        state.error = action.payload as string;
      })

      // Token refresh reducers
      .addCase(refreshTokenThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshTokenThunk.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.loading = false;
        state.error = null;
      })
      .addCase(refreshTokenThunk.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.user = null;
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Export actions
export const { clearError, resetAuth } = authSlice.actions;

export const selectAuth = (state: RootState) => state.auth;

// Export reducer
export default authSlice.reducer;