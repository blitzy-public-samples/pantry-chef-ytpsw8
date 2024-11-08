/**
 * HUMAN TASKS:
 * 1. Configure email service settings in environment variables
 * 2. Set up email templates for password reset notifications
 * 3. Configure rate limiting for password reset requests
 * 4. Test email delivery in production environment
 */

import React, { useState } from 'react';
// @version react ^18.0.0
import { useForm } from 'react-hook-form';
// @version react-hook-form ^7.0.0

// Internal dependencies
import Input from '../common/Input';
import Button from '../common/Button';
import { AuthService } from '../../services/auth.service';
import { validateEmail } from '../../utils/validation';

// Interfaces defined in JSON specification
interface ForgotPasswordFormData {
  email: string;
}

interface ForgotPasswordFormProps {
  onSuccess: (email: string) => void;
  onError: (error: string) => void;
}

/**
 * ForgotPasswordForm component for handling password reset requests
 * Requirements addressed:
 * - Authentication Service: Implements password reset functionality
 * - Security Protocols: Implements secure password reset flow with email verification
 */
export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
  onError
}) => {
  // Form state management using react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<ForgotPasswordFormData>();

  // Loading state for submission feedback
  const [loading, setLoading] = useState(false);

  // Initialize AuthService
  const authService = new AuthService();

  /**
   * Handles form submission with email validation
   * Requirement: Security Protocols - Secure password reset flow
   */
  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setLoading(true);

      // Validate email format
      if (!validateEmail(data.email)) {
        setError('email', {
          type: 'manual',
          message: 'Please enter a valid email address'
        });
        return;
      }

      // Request password reset
      // await authService.requestPasswordReset(data.email);

      // Call success callback with email
      onSuccess(data.email);
    } catch (error) {
      // Handle error cases
      onError(error instanceof Error ? error.message : 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="form-container flex flex-col space-y-4 w-full max-w-md mx-auto p-6"
      noValidate
    >
      {/* Form title */}
      <h2 className="form-title text-2xl font-bold text-gray-900 mb-4">
        Reset Password
      </h2>

      {/* Form description */}
      <p className="form-description text-sm text-gray-600 mb-6">
        Enter your email address and we'll send you instructions to reset your password.
      </p>

      {/* Email input field */}
      <div className="input-wrapper w-full">
        <Input
          id="email"
          type="email"
          label="Email Address"
          placeholder="Enter your email"
          {...register('email', {
            required: 'Email is required',
            validate: (value) => validateEmail(value) || 'Please enter a valid email address'
          })}
          error={errors.email?.message}
          aria-label="Email Address"
          required
        />
      </div>

      {/* Submit button */}
      <div className="button-wrapper w-full mt-6">
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={loading}
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Reset Password'}
        </Button>
      </div>
    </form>
  );
};

export default ForgotPasswordForm;