/**
 * HUMAN TASKS:
 * 1. Configure Material Design theme tokens in theme.ts
 * 2. Set up responsive breakpoints in Tailwind config
 * 3. Ensure proper font assets are loaded for icons
 */

import React, { useCallback } from 'react';
import { useRouter } from 'next/router'; // ^13.0.0
import classNames from 'classnames'; // ^2.3.0
import { APP_ROUTES } from '../../config/constants';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';

// Icons for navigation items (using Heroicons)
import {
  HomeIcon,
  BookOpenIcon,
  ShoppingBagIcon,
  CogIcon,
  ClipboardListIcon,
  LogoutIcon,
  PresentationChartLineIcon
} from '@heroicons/react/outline'; // ^1.0.0

/**
 * Props interface for the Sidebar component
 * Implements requirement: User Interface Design - Responsive layout with navigation menu
 */
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * Returns navigation items configuration based on user role and authentication status
 * Implements requirement: Navigation Flow - Navigation between key application features
 */
const getNavItems = (user: any | null) => [
  {
    path: APP_ROUTES.DASHBOARD,
    label: 'Dashboard',
    icon: HomeIcon,
    requiresAuth: true,
  },
  {
    path: APP_ROUTES.RECIPES,
    label: 'Recipes',
    icon: BookOpenIcon,
    requiresAuth: true,
  },
  {
    path: APP_ROUTES.PANTRY,
    label: 'Pantry',
    icon: ClipboardListIcon,
    requiresAuth: true,
  },
  {
    path: APP_ROUTES.SHOPPING,
    label: 'Shopping List',
    icon: ShoppingBagIcon,
    requiresAuth: true,
  },
  {
    path: APP_ROUTES.ANALYTICS,
    label: 'Analytics',
    icon: PresentationChartLineIcon,
    requiresAuth: true,
  },
  {
    path: APP_ROUTES.SETTINGS,
    label: 'Settings',
    icon: CogIcon,
    requiresAuth: true,
  }
].filter(item => !item.requiresAuth || (item.requiresAuth && user));

/**
 * Sidebar component that provides navigation and user context
 * Implements requirements:
 * - Web Dashboard: Responsive design with Material Design principles
 * - Navigation Flow: Navigation between key application features
 * - User Interface Design: Responsive layout with user context
 */
const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  className = '',
}) => {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const navItems = getNavItems(user);

  /**
   * Handles navigation to different routes with mobile responsiveness
   * Implements requirement: Navigation Flow - Navigation between key application features
   */
  const handleNavigation = useCallback((path: string) => {
    router.push(path);
    onClose(); // Close sidebar on mobile after navigation
  }, [router, onClose]);

  /**
   * Handles user logout process with proper cleanup
   * Implements requirement: User Interface Design - User context management
   */
  const handleLogout = useCallback(async () => {
    await logout();
    router.push(APP_ROUTES.LOGIN);
    onClose();
  }, [logout, router, onClose]);

  // Base classes for the sidebar
  const sidebarClasses = classNames(
    'fixed inset-y-0 left-0 z-30',
    'flex flex-col w-64',
    'bg-white shadow-lg',
    'transform transition-transform duration-300 ease-in-out',
    {
      '-translate-x-full': !isOpen, // Hide on mobile when closed
      'translate-x-0': isOpen, // Show on mobile when open
    },
    'md:relative md:translate-x-0', // Always show on desktop
    className
  );

  // Classes for navigation items
  const navItemClasses = 'flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 cursor-pointer';
  const activeItemClasses = 'bg-primary-50 text-primary-600 font-medium';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar content */}
      <aside className={sidebarClasses}>
        {/* User profile section */}
        {isAuthenticated && user && (
          <div className="p-6 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-600 font-medium">
                  {user.email?.[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation items */}
        <nav className="flex-1 pt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = router.pathname === item.path;

            return (
              <div
                key={item.path}
                className={classNames(
                  navItemClasses,
                  isActive && activeItemClasses
                )}
                onClick={() => handleNavigation(item.path)}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* Logout button */}
        {isAuthenticated && (
          <div className="p-4 border-t">
            <Button
              variant="outline"
              fullWidth
              onClick={handleLogout}
              startIcon={<LogoutIcon className="w-5 h-5" />}
            >
              Logout
            </Button>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;