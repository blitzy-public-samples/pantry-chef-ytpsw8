/**
 * HUMAN TASKS:
 * 1. Configure environment variables for authentication endpoints
 * 2. Set up error tracking service integration
 * 3. Implement OAuth provider configurations
 * 4. Configure rate limiting for login attempts
 */

import React from 'react'; // ^18.0.0
import { useForm } from 'react-hook-form'; // ^7.0.0
import useAuth from '../../hooks/useAuth';
import Button from '../common/Button';
import Input from '../common/Input';
import { useRouter } from 'next/router';
import { APP_ROUTES } from '../../config/constants';
// @version react-router-dom ^6.0.0
/**
 * Props interface for the LoginForm component
 */
interface LoginFormProps {
  onSuccess: () => void;
  className?: string;
}

/**
 * Form data interface for login credentials
 */
interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

/**
 * Validation rules for the login form fields
 */
const validationRules = {
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email address'
    }
  },
  password: {
    required: 'Password is required',
    minLength: {
      value: 8,
      message: 'Password must be at least 8 characters'
    }
  }
};

/**
 * LoginForm component that handles user authentication with JWT integration
 * Requirements addressed:
 * - Authentication Flow: Implements client-side login form with JWT-based authentication
 * - Access Control Measures: Provides secure user authentication interface
 * - Frontend UI Framework: Implements Material Design principles
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  className = ''
}) => {
  // Initialize form handling with react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  // Get authentication methods from useAuth hook
  const { login, loading, error, isAuthenticated } = useAuth();
  const router = useRouter();

  /**
   * Handles form submission and JWT authentication
   * Addresses requirement: Authentication Flow - JWT-based authentication
   */
  const onSubmit = async (data: LoginFormData) => {
    try {
      await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });

      // Call onSuccess callback if login succeeds
      if (!error) {
        onSuccess();
      }

      // Navigate to dashboard on success
      router.push(APP_ROUTES.DASHBOARD);
    } catch (err) {
      // Error handling is managed by useAuth hook
      console.error('Login submission failed:', err);
      setError('root', {
        type: 'manual',
        message: 'Authentication failed. Please check your credentials.'
      });
    }
  };

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push(APP_ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, router]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`w-full max-w-md space-y-6 ${className}`}
      noValidate
    >
      {/* Display authentication error if any */}
      {error && (
        <div
          className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Email input field */}
      <Input
        {...register('email', validationRules.email)}
        type="email"
        id="email"
        name="email"
        label="Email Address"
        placeholder="Enter your email"
        error={errors.email?.message}
        required
        aria-label="Email Address"
      />

      {/* Password input field */}
      <Input
        {...register('password', validationRules.password)}
        type="password"
        id="password"
        name="password"
        label="Password"
        placeholder="Enter your password"
        error={errors.password?.message}
        required
        aria-label="Password"
      />

      {/* Submit button */}
      <Button
        type="submit"
        variant="primary"
        loading={loading || isSubmitting}
        disabled={loading || isSubmitting}
        fullWidth
        className="mt-6"
      >
        {loading || isSubmitting ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
};

export default LoginForm;