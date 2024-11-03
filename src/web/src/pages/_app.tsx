/**
 * HUMAN TASKS:
 * 1. Configure Redux DevTools in environment variables
 * 2. Set up performance monitoring for Redux store
 * 3. Configure theme tokens in Material Design implementation
 * 4. Review and adjust persistence configuration with backend team
 */

// Core React and Next.js - @version react ^18.0.0, next/app ^13.0.0
import React from 'react';
import type { AppProps } from 'next/app';

// Redux imports - @version react-redux ^8.1.0, redux-persist ^6.0.0
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store/store';

// Layout and styles
import MainLayout from '../components/layout/MainLayout';
import '../styles/globals.css';

/**
 * Root application component that provides global providers and layout
 * Implements requirements:
 * - Web Dashboard (1.2 Scope): Consistent layout and state management
 * - State Management (5.3.1): Redux implementation with persistence
 * - Mobile-first Design (1.1): Material Design responsive layout
 */
const App = ({ Component, pageProps }: AppProps): JSX.Element => {
  return (
    /**
     * Redux Provider wraps the entire application to provide global state management
     * Requirement: State Management (5.3.1)
     */
    <Provider store={store}>
      {/**
       * PersistGate delays app rendering until persisted state is retrieved
       * Requirement: State Management - persistence and real-time sync
       */}
      <PersistGate 
        loading={null} 
        persistor={persistor}
      >
        {/**
         * MainLayout provides consistent page structure with Material Design
         * Requirements: 
         * - Web Dashboard: Consistent layout
         * - Mobile-first Design: Responsive implementation
         */}
        <MainLayout>
          {/**
           * Render the current page component with its props
           * Wrapped in layout context for consistent structure
           */}
          <Component {...pageProps} />
        </MainLayout>
      </PersistGate>
    </Provider>
  );
};

export default App;