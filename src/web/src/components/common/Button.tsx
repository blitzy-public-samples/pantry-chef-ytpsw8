/**
 * HUMAN TASKS:
 * 1. Ensure @types/react is installed for TypeScript support
 * 2. Verify classnames package is installed: npm install classnames@^2.3.0
 * 3. Configure Tailwind CSS for proper purging of dynamic classes
 */

import React from 'react'; // ^18.0.0
import classNames from 'classnames'; // ^2.3.0
import { palette, typography, spacing, borderRadius } from '../../config/theme';

/**
 * Props interface for the Button component
 * Implements requirements:
 * - Frontend UI Framework: Material Design implementation
 * - Web Dashboard: Responsive design with consistent styling
 */
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Generates class names for the button based on variant, size, and state
 */
const getButtonClasses = (props: ButtonProps): string => {
  const {
    variant = 'primary',
    size = 'medium',
    disabled = false,
    fullWidth = false,
    loading = false,
    className,
    type = 'button',
  } = props;

  // Base classes using theme tokens
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-semibold transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:cursor-not-allowed',
  ];

  // Variant-specific classes using palette colors
  const variantClasses = {
    //https://tailwindcss.com/docs/theme
    primary: [
      `bg-primary-600`,
      `text-white`,
      `hover:bg-primary-700`,
      `focus:ring-primary-500`,
      `disabled:bg-primary-200`,
    ],
    secondary: [
      `bg-primary-600`,
      `text-white`,
      `hover:bg-primary-700`,
      `focus:ring-primary-500`,
      `disabled:bg-primary-200`,
    ],
    outline: [
      'bg-transparent',
      `border-2 border-primary-600`,
      `text-primary-600`,
      `hover:bg-primary-50`,
      `focus:ring-primary-500`,
      'disabled:border-gray-200',
      `disabled:text-text-disabled`,
    ],
    text: [
      'bg-transparent',
      `text-primary-600`,
      `hover:bg-primary-50`,
      `focus:ring-primary-500`,
      `disabled:text-text-disabled`,
    ],
  };

  // Size-specific classes using spacing and typography
  const sizeClasses = {
    small: [
      `px-3`,
      `py-1`,
      `text-sm`,
      `rounded-md`,
    ],
    medium: [
      `px-4`,
      `py-2`,
      `text-base`,
      `rounded-md`,
    ],
    large: [
      `px-6`,
      `py-3`,
      `text-lg`,
      `rounded-lg`,
    ],
  };

  // State classes
  const stateClasses = [
    disabled && 'opacity-60',
    fullWidth && 'w-full',
    loading && 'cursor-wait',
  ];

  return classNames(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    stateClasses,
    className
  );
};

/**
 * Button component that implements Material Design principles
 * with consistent styling across the PantryChef web application
 */
export const Button: React.FC<ButtonProps> = (props) => {
  const {
    children,
    disabled,
    loading,
    startIcon,
    endIcon,
    onClick,
    type = 'button',
  } = props;

  const buttonClasses = getButtonClasses(props);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      className={buttonClasses}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}

      {startIcon && !loading && (
        <span className={`mr-2`}>{startIcon}</span>
      )}

      <span className={`font-semibold`}>{children}</span>

      {endIcon && !loading && (
        <span className={`ml-2`}>{endIcon}</span>
      )}
    </button>
  );
};

export default Button;