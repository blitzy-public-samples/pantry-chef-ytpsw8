/**
 * HUMAN TASKS:
 * 1. Ensure Tailwind CSS is properly configured with the animation utilities
 * 2. Verify that the classnames package is installed (npm install classnames@^2.3.0)
 */

import React from 'react'; // ^18.0.0
import classnames from 'classnames'; // ^2.3.0
import { palette } from '../../config/theme';

/**
 * Props interface for the Spinner component
 * Implements requirements:
 * - Frontend UI Framework: Material Design implementation
 * - Web Dashboard: Responsive design with customizable components
 */
interface SpinnerProps {
  /** Size variant of the spinner: 'sm' (24px), 'md' (32px), or 'lg' (48px) */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant using theme palette: 'primary', 'secondary', 'error', 'warning', or 'success' */
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success';
  /** Additional CSS classes for custom styling */
  className?: string;
}

/**
 * A reusable loading spinner component that provides visual feedback during asynchronous operations
 * in the PantryChef web dashboard, following Material Design principles.
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className,
}) => {
  // Determine spinner size classes based on size prop
  const sizeClasses = {
    'spinner-sm': size === 'sm',
    'spinner-md': size === 'md',
    'spinner-lg': size === 'lg',
  };

  // Get color from theme palette based on color prop
  const getColorValue = () => {
    switch (color) {
      case 'primary':
        return palette.primary[600];
      case 'secondary':
        return palette.secondary[600];
      case 'error':
        return palette.error.main;
      case 'warning':
        return palette.warning.main;
      case 'success':
        return palette.success.main;
      default:
        return palette.primary[600];
    }
  };

  // Compose class names for the spinner
  const spinnerClasses = classnames(
    'spinner',
    sizeClasses,
    className
  );

  return (
    <div
      className={spinnerClasses}
      style={{
        borderTopColor: getColorValue(),
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent'
      }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;