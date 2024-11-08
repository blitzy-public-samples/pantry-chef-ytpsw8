/**
 * HUMAN TASKS:
 * 1. Configure environment variables for authentication endpoints
 * 2. Set up JWT secret and expiration in .env file
 * 3. Configure OAuth providers in authentication service
 * 4. Set up SSL certificates for secure authentication
 * 5. Configure rate limiting for login attempts
 */

import React, { useEffect } from 'react'; // ^18.0.0
import { useRouter } from 'next/router'; // ^13.0.0
import { GetServerSideProps, NextPage } from 'next';
import LoginForm from '../components/auth/LoginForm';
import useAuth from '../hooks/useAuth';
import Link from 'next/link';
import { APP_ROUTES } from '../config/constants';



/**
 * Props interface for the login page component
 */
interface LoginPageProps {
  redirectUrl?: string;

}

/**
 * Login page component that provides secure user authentication functionality
 * Implements requirements:
 * - Authentication Flow: Implements client-side login with JWT-based authentication
 * - Access Control Measures: Provides secure authentication interface
 * - Frontend UI Framework: Implements Material Design principles
 */
const LoginPage: NextPage<LoginPageProps> = ({ redirectUrl }) => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  /**
   * Effect to handle authenticated user redirection
   * Addresses requirement: Authentication Flow - Session management
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push(redirectUrl || APP_ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, user, router, redirectUrl]);

  /**
   * Handles successful login by redirecting user
   * Addresses requirement: Authentication Flow - JWT-based session management
   */
  const handleLoginSuccess = async () => {
    // Redirect to dashboard or specified URL after successful login
    await router.push(redirectUrl || APP_ROUTES.DASHBOARD);
  };

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Login header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome to PantryChef
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to manage your pantry and discover recipes
            </p>
          </div>

          {/* Login form */}
          <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <LoginForm
              onSuccess={handleLoginSuccess}
              className="space-y-6"
            />
          </div>

          {/* Additional options */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href={APP_ROUTES.SIGNUP}>
                <button
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Sign up
                </button>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Server-side props function for authentication check and redirection
 * Addresses requirement: Authentication Flow - JWT validation
 */
export const getServerSideProps: GetServerSideProps<LoginPageProps> = async (context) => {
  // Extract JWT token from request cookies
  const token = context.req.cookies['auth-token'];

  // If token exists, validate it
  if (token) {
    try {
      // Verify JWT token
      const isValid = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).then(res => res.json());

      // If token is valid, redirect to dashboard
      if (isValid) {
        return {
          redirect: {
            destination: APP_ROUTES.DASHBOARD,
            permanent: false
          }
        };
      }
    } catch (error) {
      // Token validation failed, continue to login page
      console.error('Token validation failed:', error);
    }
  }

  // Extract redirect URL from query parameters
  const redirectUrl = context.query.redirect as string;

  // Return props
  return {
    props: {
      redirectUrl: redirectUrl || APP_ROUTES.LOGIN
    }
  };
};

export default LoginPage;