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
 * Default props for the Button component
 */
const defaultProps: Partial<ButtonProps> = {
  variant: 'primary',
  size: 'medium',
  type: 'button',
  disabled: false,
  fullWidth: false,
  loading: false,
};

/**
 * Generates class names for the button based on variant, size, and state
 */
const getButtonClasses = (props: ButtonProps): string => {
  const {
    variant = 'primary',
    size = 'medium',
    disabled,
    fullWidth,
    loading,
    className,
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
    primary: [
      `bg-[${palette.primary[600]}]`,
      `text-white`,
      `hover:bg-[${palette.primary[700]}]`,
      `focus:ring-[${palette.primary[500]}]`,
      `disabled:bg-[${palette.primary[200]}]`,
    ],
    secondary: [
      `bg-[${palette.secondary[600]}]`,
      `text-white`,
      `hover:bg-[${palette.secondary[700]}]`,
      `focus:ring-[${palette.secondary[500]}]`,
      `disabled:bg-[${palette.secondary[200]}]`,
    ],
    outline: [
      'bg-transparent',
      `border-2 border-[${palette.primary[600]}]`,
      `text-[${palette.primary[600]}]`,
      `hover:bg-[${palette.primary[50]}]`,
      `focus:ring-[${palette.primary[500]}]`,
      'disabled:border-gray-200',
      `disabled:text-[${palette.text.disabled}]`,
    ],
    text: [
      'bg-transparent',
      `text-[${palette.primary[600]}]`,
      `hover:bg-[${palette.primary[50]}]`,
      `focus:ring-[${palette.primary[500]}]`,
      `disabled:text-[${palette.text.disabled}]`,
    ],
  };

  // Size-specific classes using spacing and typography
  const sizeClasses = {
    small: [
      `px-${spacing[3]}`,
      `py-${spacing[1]}`,
      `text-${typography.fontSize.sm}`,
      `rounded-${borderRadius.md}`,
    ],
    medium: [
      `px-${spacing[4]}`,
      `py-${spacing[2]}`,
      `text-${typography.fontSize.base}`,
      `rounded-${borderRadius.md}`,
    ],
    large: [
      `px-${spacing[6]}`,
      `py-${spacing[3]}`,
      `text-${typography.fontSize.lg}`,
      `rounded-${borderRadius.lg}`,
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
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
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
        <span className={`mr-${spacing[2]}`}>{startIcon}</span>
      )}

      <span className={`font-${typography.fontWeight.semibold}`}>{children}</span>

      {endIcon && !loading && (
        <span className={`ml-${spacing[2]}`}>{endIcon}</span>
      )}
    </button>
  );
};

Button.defaultProps = defaultProps;

export default Button;