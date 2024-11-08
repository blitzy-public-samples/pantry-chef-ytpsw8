/**
 * HUMAN TASKS:
 * 1. Configure environment variables for authentication endpoints
 * 2. Set up proper SSL certificates for secure communication
 * 3. Ensure proper CORS configuration in backend for authentication endpoints
 * 4. Configure CDN for logo and static assets
 */

import React, { useCallback, useState } from 'react'; // ^18.0.0
import Link from 'next/link'; // ^13.0.0
import { useRouter } from 'next/router'; // ^13.0.0
import { Button } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { APP_ROUTES } from '../../config/constants';

/**
 * Props interface for the Header component
 * Implements requirement: Web Dashboard - Responsive design with consistent styling
 */
interface HeaderProps {
  className?: string;
}

/**
 * Main header component for the PantryChef web dashboard
 * Implements requirements:
 * - Web Dashboard: Responsive design with mobile menu support
 * - User Interface Design: Header component with quick actions
 * - Authentication Flow: User authentication state management
 */
const Header: React.FC<HeaderProps> = ({ className }) => {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const [isMobileMenuOpen, setMobileMenu] = useState<boolean>(false);

  /**
   * Handles user logout and redirects to home page
   * Implements requirement: Authentication Flow - Logout functionality
   */
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      await router.push(APP_ROUTES.HOME);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, router]);

  const toggleMobileMenu = () => {
    setMobileMenu(!isMobileMenuOpen);
  }

  /**
   * Renders authentication-related buttons based on auth state
   * Implements requirement: User Interface Design - Quick actions and user profile management
   */
  const renderAuthButtons = () => {
    if (isAuthenticated && user) {
      return (
        <div className="flex items-center space-x-4">
          <span className="hidden md:inline-block text-gray-700">
            Welcome, {user.firstName}
          </span>
          <Button
            variant="outline"
            size="small"
            onClick={handleLogout}
            className="text-sm"
          >
            Logout
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <Link href={APP_ROUTES.LOGIN} className='flex self-stretch'>
          <Button variant="outline" size="small" className="text-sm" >
            Login
          </Button>
        </Link>
        <Link href={APP_ROUTES.SIGNUP} className='flex self-stretch'>
          <Button variant="primary" size="small" className="text-sm">
            Sign Up
          </Button>
        </Link>
      </div>
    );
  };

  return (
    <header className={`fixed top-0 w-full bg-white shadow-md z-50 ${className}`}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and brand */}
        <Link href={APP_ROUTES.HOME} className="text-2xl font-bold text-primary-600">
          PantryChef
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-4">
          {isAuthenticated && (
            <>
              <Link
                href={APP_ROUTES.DASHBOARD}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href={APP_ROUTES.RECIPES}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Recipes
              </Link>
              <Link
                href={APP_ROUTES.PANTRY}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Pantry
              </Link>
            </>
          )}
        </nav>

        {/* Authentication Section */}
        <div className="flex items-center">
          {renderAuthButtons()}

          {/* Mobile Menu Button*/}
          <button
            className="md:hidden ml-4 p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Toggle mobile menu"
            onClick={toggleMobileMenu}
          >
            <svg
              className={`h-6 w-6 ${isMobileMenuOpen ? 'text-primary-600' : 'text-gray-600'}`}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu - Hidden by default */}
      {isMobileMenuOpen && <nav className="md:hidden bg-white border-t">
        {isAuthenticated && (
          <div className="px-4 py-2 space-y-1">
            <Link
              href={APP_ROUTES.DASHBOARD}
              className="block px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              onClick={() => setMobileMenu(false)}
            >
              Dashboard
            </Link>
            <Link
              href={APP_ROUTES.RECIPES}
              className="block px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              onClick={() => setMobileMenu(false)}
            >
              Recipes
            </Link>
            <Link
              href={APP_ROUTES.PANTRY}
              className="block px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              onClick={() => setMobileMenu(false)}
            >
              Pantry
            </Link>
            <Link
              href={APP_ROUTES.SHOPPING}
              className="block px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              onClick={() => setMobileMenu(false)}
            >
              Shopping List
            </Link>
            <Link
              href={APP_ROUTES.ANALYTICS}
              className="block px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              onClick={() => setMobileMenu(false)}
            >
              Analytics
            </Link>
            <Link
              href={APP_ROUTES.SETTINGS}
              className="block px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              onClick={() => setMobileMenu(false)}
            >
              Settings
            </Link>
          </div>
        )}
      </nav>}
    </header>
  );
};

export default Header;