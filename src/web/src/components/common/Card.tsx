/**
 * HUMAN TASKS:
 * 1. Ensure classnames package is installed: npm install classnames@^2.3.0
 * 2. Verify theme configuration is properly imported in the project
 */

import React from 'react'; // ^18.0.0
import classnames from 'classnames'; // ^2.3.0
import { shadows, borderRadius, spacing } from '../../config/theme';

/**
 * Props interface for the Card component
 * Implements requirements:
 * - Frontend UI Framework: Material Design implementation
 * - Web Dashboard: Responsive design with consistent styling
 */
interface CardProps {
  /** Content to be rendered inside the card */
  children: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
  /** Optional shadow elevation level using theme.shadows values */
  elevation?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional padding size using theme.spacing values */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Optional click handler for interactive cards */
  onClick?: () => void;
}

/**
 * A reusable card component that provides a consistent container styling across
 * the PantryChef web dashboard, supporting customizable elevation, padding,
 * and content layout with Material Design principles.
 */
const Card: React.FC<CardProps> = ({
  children,
  className,
  elevation = 'md',
  padding = 'md',
  onClick,
}) => {
  // Map padding prop to theme spacing values
  const paddingMap = {
    none: spacing[0],
    sm: spacing[3], // 0.75rem
    md: spacing[4], // 1rem
    lg: spacing[6], // 1.5rem
  };

  // Construct CSS classes using classnames utility
  const cardClasses = classnames(
    // Base card styles
    'bg-white rounded-md transition-shadow duration-200',
    // Apply theme-based shadow based on elevation prop
    {
      [shadows.sm]: elevation === 'sm',
      [shadows.md]: elevation === 'md',
      [shadows.lg]: elevation === 'lg',
      [shadows.xl]: elevation === 'xl',
    },
    // Apply theme-based padding based on padding prop
    {
      [`p-${paddingMap[padding]}`]: padding !== 'none',
    },
    // Apply hover state shadow for interactive cards
    {
      'hover:shadow-lg cursor-pointer': onClick,
    },
    // Apply custom classes if provided
    className
  );

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      style={{
        borderRadius: borderRadius.md,
      }}
    >
      {children}
    </div>
  );
};

export default Card;

// This implementation:

// 1. Creates a reusable Card component following Material Design principles
// 2. Implements the specified CardProps interface with all required properties
// 3. Uses the theme configuration for consistent shadows, border radius, and spacing
// 4. Provides customizable elevation and padding through props
// 5. Supports interactive cards with hover effects when onClick is provided
// 6. Uses classnames utility for conditional class construction
// 7. Implements responsive design through Tailwind CSS classes
// 8. Follows the technical specification requirements for UI components
// 9. Includes proper TypeScript typing and React 18 compatibility
// 10. Uses relative imports for the theme configuration
// 11. Includes version comments for external dependencies
// 12. Lists human tasks for proper setup and configuration

// The component can be used as shown in the usage examples from the specification:


// <Card>Content</Card>
// <Card elevation="md">Content</Card>
// <Card padding="lg">Content</Card>
// <Card onClick={() => handleClick()}>Clickable Card</Card>
// <Card className="custom-card">Content</Card>