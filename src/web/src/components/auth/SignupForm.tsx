/**
 * HUMAN TASKS:
 * 1. Configure Material Design theme colors in theme.ts
 * 2. Set up form validation error messages in i18n
 * 3. Configure API endpoints in environment variables
 * 4. Test form submission with actual backend API
 */

import React from 'react'; // ^18.0.0
import { useForm } from 'react-hook-form'; // ^7.0.0
import classNames from 'classnames'; // ^2.3.1

// Internal imports
import { SignupCredentials, AuthResponse } from '../../interfaces/auth.interface';
import Input from '../common/Input';
import Button from '../common/Button';
import { validateSignupCredentials } from '../../utils/validation';
import useAuth from '../../hooks/useAuth';

// Requirement: Frontend UI Framework - Material Design implementation
interface SignupFormProps {
  onSuccess: (response: AuthResponse) => void;
  onError: (error: Error) => void;
  className?: string;
}

/**
 * SignupForm component for user registration with validation and error handling
 * Requirements addressed:
 * - Authentication Flow: Secure user registration with validation
 * - Security Protocols: Input validation for data integrity
 * - Web Dashboard: User registration functionality
 * - Frontend UI Framework: Material Design implementation
 */
const SignupForm: React.FC<SignupFormProps> = ({ onSuccess, onError, className }) => {
  // Initialize form state with react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError,
  } = useForm<SignupCredentials>({
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    },
  });

  // Initialize AuthService instance
  const { signup } = useAuth();


  // Watch password field for confirmation validation
  const password = watch('password');

  /**
   * Handle form submission with validation
   * Requirement: Authentication Flow - Secure registration process
   */
  const onSubmit = async (data: SignupCredentials) => {
    try {
      // Validate form data
      const validation = validateSignupCredentials(data);
      if (!validation.isValid) {
        // Set validation errors in form state
        Object.keys(validation.errors).forEach((key) => {
          setError(key as keyof SignupCredentials, {
            type: 'manual',
            message: validation.errors[key],
          });
        });
        return;
      }

      const response = await signup(data);
      onSuccess(response);
    } catch (error) {
      onError(error as Error);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={classNames(
        'flex flex-col space-y-8 w-full max-w-md mx-auto',
        className
      )}
      noValidate
    >
      {/* First Name Input */}
      <Input
        id="firstName"
        type="text"
        label="First Name"
        placeholder="Enter your first name"
        error={errors.firstName?.message}
        labelClassName='!bg-background-paper'
        {...register('firstName', {
          required: 'First name is required',
          maxLength: {
            value: 50,
            message: 'First name cannot exceed 50 characters',
          },
        })}
      />

      {/* Last Name Input */}
      <Input
        id="lastName"
        type="text"
        label="Last Name"
        placeholder="Enter your last name"
        error={errors.lastName?.message}
        labelClassName='!bg-background-paper'
        {...register('lastName', {
          required: 'Last name is required',
          maxLength: {
            value: 50,
            message: 'Last name cannot exceed 50 characters',
          },
        })}
      />

      {/* Email Input */}
      <Input
        id="email"
        type="email"
        label="Email"
        placeholder="Enter your email address"
        error={errors.email?.message}
        labelClassName='!bg-background-paper'
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Please enter a valid email address',
          },
        })}
      />

      {/* Password Input */}
      <Input
        id="password"
        type="password"
        label="Password"
        placeholder="Create a password"
        error={errors.password?.message}
        labelClassName='!bg-background-paper'
        {...register('password', {
          required: 'Password is required',
          minLength: {
            value: 8,
            message: 'Password must be at least 8 characters long',
          },
          validate: (value) => {
            const { isValid, errors } = validateSignupCredentials({
              email: '',
              firstName: '',
              lastName: '',
              password: value,
              confirmPassword: '',
            });
            return isValid || errors.password;
          },
        })}
      />

      {/* Confirm Password Input */}
      <Input
        id="confirmPassword"
        type="password"
        label="Confirm Password"
        placeholder="Confirm your password"
        error={errors.confirmPassword?.message}
        labelClassName='!bg-background-paper'
        {...register('confirmPassword', {
          required: 'Please confirm your password',
          validate: (value) =>
            value === password || 'Passwords do not match',
        })}
      />

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating Account...' : 'Sign Up'}
      </Button>
    </form>
  );
};

export default SignupForm;