/**
 * HUMAN TASKS:
 * 1. Ensure Material Design fonts are installed in the project
 * 2. Verify Tailwind CSS is properly configured with the theme
 * 3. Test accessibility with screen readers
 * 4. Validate ARIA labels and descriptions in production
 */

import React, { forwardRef, useState, useCallback } from 'react';
// @version react ^18.0.0
import classNames from 'classnames';
// @version classnames ^2.3.1
import { palette, typography, spacing, borderRadius } from '../../config/theme';
import { validateEmail, validatePassword } from '../../utils/validation';

interface InputProps {
  id: string;
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  value?: any;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  labelClassName?: string;
}

/**
 * A reusable form input component with Material Design styling and validation
 * Requirements addressed:
 * - Frontend UI Framework: Material Design implementation
 * - Data Validation: Input validation for security and data integrity
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      name,
      label,
      type,
      placeholder,
      value,
      onChange,
      onBlur,
      required = false,
      disabled = false,
      error,
      helperText,
      className,
      labelClassName,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Handle real-time validation based on input type
    const validateInput = useCallback(
      (value: string) => {
        if (!isDirty) return '';

        switch (type) {
          case 'email':
            return !validateEmail(value) ? 'Please enter a valid email address' : '';
          case 'password':
            const { isValid, errors } = validatePassword(value);
            return !isValid ? errors.password : '';
          default:
            return '';
        }
      },
      [type, isDirty]
    );

    // Handle input focus
    const handleFocus = () => {
      setIsFocused(true);
    };

    // Handle input blur
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setIsDirty(true);
      onBlur?.(e);
    };

    // Generate unique IDs for accessibility
    const helperId = `${id}-helper`;
    const errorId = `${id}-error`;

    // Dynamic class generation based on state and props
    const containerClasses = classNames(
      'input-container',
      className
    );

    const containerWrapperClasses = classNames(
      'relative'
    )

    const labelClasses = classNames(
      'input-label absolute text-sm  duration-300 transform -translate-y-3 scale-75 top-1 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-1 peer-focus:scale-75 peer-focus:-translate-y-3 start-1 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto',
      {
        'text-sm text-secondary-600': !isFocused && !value && !error,
        'text-xs text-primary-600': isFocused || value,
        'text-error-main peer-focus:text-red-600': error,
        'text-secondary-400': disabled,
      },
      labelClassName,

    );

    const inputClasses = classNames(
      "input-field px-3 py-2 w-full text-sm border rounded-md bg-transparent rounded-lg focus:outline-none focus:ring-0 peer",
      {
        'border-secondary-300 focus:border-primary-500 focus:ring-primary-200':
          !error && !disabled,
        'border-error-main focus:border-error-main focus:ring-error-light':
          error,
        'bg-secondary-100 border-secondary-200 cursor-not-allowed': disabled,
        'input-disabled': disabled,
        'input-error': error,
        'input-focus placeholder-opacity-100': isFocused,
      }
    );

    const helperTextClasses = classNames(
      'input-helper-text text-xs mt-1',
      {
        'text-error-main': error,
        'text-secondary-500': !error,
      }
    );

    return (
      <div className={containerClasses}>
        <div className={containerWrapperClasses}>
          <input
            ref={ref}
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={''}
            disabled={disabled}
            required={required}
            aria-label={ariaLabel || label}
            aria-invalid={!!error}
            aria-required={required}

            aria-describedby={
              error
                ? errorId
                : helperText
                  ? helperId
                  : ariaDescribedBy
            }
            className={inputClasses}
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: typography.fontSize.base,
              borderRadius: borderRadius.md,
              paddingTop: spacing[2],
              paddingBottom: spacing[2],
            }}
          />
          <label
            htmlFor={id}
            className={labelClasses}
          >
            {label}
            {required && (
              <span className="input-required text-error-main ml-1">*</span>
            )}
          </label>
        </div>
        {(error || helperText) && (
          <p
            id={error ? errorId : helperId}
            className={helperTextClasses}
            role={error ? 'alert' : 'status'}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;