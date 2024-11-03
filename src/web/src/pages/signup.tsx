/**
 * HUMAN TASKS:
 * 1. Configure Material UI theme tokens in theme.ts
 * 2. Set up environment variables for authentication endpoints
 * 3. Configure toast notifications in _app.tsx
 * 4. Test signup flow with actual backend API
 */

import React, { useEffect } from 'react'; // ^18.0.0
import { useRouter } from 'next/router'; // ^13.0.0
import { NextPage } from 'next';
import { toast } from 'react-toastify'; // ^9.0.0

// Internal imports
import MainLayout from '../components/layout/MainLayout';
import SignupForm from '../components/auth/SignupForm';
import { useAuth } from '../hooks/useAuth';
import { AuthResponse } from '../interfaces/auth.interface';

/**
 * SignupPage component for user registration
 * Implements requirements:
 * - Authentication Flow: Secure user registration with validation and error handling
 * - Web Dashboard: User registration functionality
 * - Security Protocols: Input validation and device verification
 */
const SignupPage: NextPage = () => {
  const router = useRouter();
  const { isAuthenticated, signup } = useAuth();

  /**
   * Redirect to dashboard if user is already authenticated
   * Implements requirement: Authentication Flow - User session management
   */
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  /**
   * Handle successful signup
   * Implements requirement: Authentication Flow - Success handling
   */
  const handleSignupSuccess = async (response: AuthResponse) => {
    toast.success('Account created successfully! Welcome to PantryChef.');
    await router.push('/dashboard');
  };

  /**
   * Handle signup errors
   * Implements requirement: Authentication Flow - Error handling
   */
  const handleSignupError = (error: Error) => {
    toast.error(error.message || 'Failed to create account. Please try again.');
  };

  return (
    <MainLayout>
      <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6">
        <div className="w-full max-w-480 p-8 bg-background-paper rounded-lg shadow-md">
          {/* Page Title */}
          <h1 className="text-2xl font-bold text-center mb-6">
            Create Your Account
          </h1>

          {/* Description */}
          <p className="text-center text-gray-600 mb-8">
            Join PantryChef to start managing your kitchen smarter and discover personalized recipes.
          </p>

          {/* Signup Form */}
          <SignupForm
            onSuccess={handleSignupSuccess}
            onError={handleSignupError}
            className="w-full"
          />

          {/* Login Link */}
          <p className="text-center mt-6 text-gray-600">
            Already have an account?{' '}
            <a
              href="/login"
              className="text-primary-main hover:text-primary-dark font-medium"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default SignupPage;