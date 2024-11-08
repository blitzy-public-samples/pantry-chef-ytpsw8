/**
 * HUMAN TASKS:
 * 1. Configure Material UI theme tokens in theme.ts
 * 2. Set up responsive breakpoints in Tailwind config
 * 3. Ensure proper font assets are loaded
 * 4. Configure environment variables for authentication endpoints
 */

import React, { useState, useCallback } from 'react'; // ^18.0.0
import { useRouter } from 'next/router'; // ^13.0.0
import classNames from 'classnames'; // ^2.3.0
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';

/**
 * Props interface for the MainLayout component
 * Implements requirement: Web Dashboard - Consistent layout structure
 */
interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Main layout component that provides the base structure for all pages
 * Implements requirements:
 * - Web Dashboard: Responsive design with consistent layout
 * - User Interface Design: Dashboard view with consistent layout across all pages
 * - Frontend UI Framework: Material Design implementation
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children, className = '' }) => {
  // State for mobile sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  /**
   * Handles sidebar toggle for mobile view
   * Implements requirement: Web Dashboard - Responsive design
   */
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  /**
   * Handles sidebar close for mobile view
   * Implements requirement: Web Dashboard - Responsive design
   */
  const handleSidebarClose = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  // Base layout classes
  const layoutClasses = classNames(
    'min-h-screen',
    'flex',
    'flex-col',
    'bg-background-default',
    className
  );

  // Main content area classes
  const mainClasses = classNames(
    'flex-1',
    'flex',
    'flex-row',
    'pt-16' // Header height offset
  );

  // Content wrapper classes with sidebar margin
  const contentClasses = classNames(
    'flex-1',
    'p-6',
    'transition-[margin-left]',
    'duration-300',
    'ease-in-out',
    {
      'ml-0': !isAuthenticated || !isSidebarOpen // No margin when not authenticated or sidebar closed
    }
  );

  return (
    <div className={layoutClasses}>
      {/* Header Component */}
      <Header
        className="fixed top-0 left-0 right-0 h-16 z-50"
      />

      <main className={mainClasses}>
        {/* Sidebar - Only shown when authenticated */}
        {isAuthenticated && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={handleSidebarClose}
            className="z-40"
          />
        )}

        {/* Main Content Area */}
        <div className={contentClasses}>
          {/* Page Content */}
          {children}
        </div>
      </main>

      {/* Footer Component */}
      <Footer />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={handleSidebarClose}
        />
      )}
    </div>
  );
};

export default MainLayout;