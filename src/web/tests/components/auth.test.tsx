// @version @testing-library/react ^13.0.0
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
// @version @testing-library/user-event ^14.0.0
import userEvent from '@testing-library/user-event';
// @version @jest/globals ^29.0.0
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import React from 'react';

// Components under test
import LoginForm from '../../src/components/auth/LoginForm';
import SignupForm from '../../src/components/auth/SignupForm';
import ForgotPasswordForm from '../../src/components/auth/ForgotPasswordForm';

// Mock the auth hook and service
jest.mock('../../src/hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({
    login: jest.fn(),
    loading: false,
    error: null
  })
}));

jest.mock('../../src/services/auth.service', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    signup: jest.fn(),
    requestPasswordReset: jest.fn()
  }))
}));

// Test data from specification
const validCredentials = {
  email: 'test@example.com',
  password: 'Password123!',
  confirmPassword: 'Password123!',
  firstName: 'John',
  lastName: 'Doe'
};

const invalidCredentials = {
  email: 'invalid-email',
  password: 'short',
  confirmPassword: 'not-matching',
  firstName: '',
  lastName: ''
};

describe('LoginForm', () => {
  // Requirement: Authentication Flow Testing - Login functionality
  const mockOnSuccess = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form with required fields', () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('validates email field with required and pattern rules', async () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    await userEvent.type(emailInput, invalidCredentials.email);
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });

  test('validates password field with required and minLength rules', async () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.type(passwordInput, invalidCredentials.password);
    fireEvent.blur(passwordInput);
    
    await waitFor(() => {
      expect(screen.getByText(/must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  test('handles successful login submission with JWT token', async () => {
    const mockUseAuth = require('../../src/hooks/useAuth').default;
    mockUseAuth.mockImplementation(() => ({
      login: jest.fn().mockResolvedValue({}),
      loading: false,
      error: null
    }));

    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    await userEvent.type(screen.getByLabelText(/email address/i), validCredentials.email);
    await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  test('handles error with invalid credentials', async () => {
    const mockUseAuth = require('../../src/hooks/useAuth').default;
    mockUseAuth.mockImplementation(() => ({
      login: jest.fn().mockRejectedValue(new Error('Invalid credentials')),
      loading: false,
      error: 'Invalid credentials'
    }));

    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    await userEvent.type(screen.getByLabelText(/email address/i), invalidCredentials.email);
    await userEvent.type(screen.getByLabelText(/password/i), invalidCredentials.password);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  test('shows loading state during API submission', async () => {
    const mockUseAuth = require('../../src/hooks/useAuth').default;
    mockUseAuth.mockImplementation(() => ({
      login: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000))),
      loading: true,
      error: null
    }));

    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('SignupForm', () => {
  // Requirement: Authentication Flow Testing - Signup functionality
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders signup form with all required fields', () => {
    render(<SignupForm onSuccess={mockOnSuccess} onError={mockOnError} />);
    
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  test('validates email with format checking', async () => {
    render(<SignupForm onSuccess={mockOnSuccess} onError={mockOnError} />);
    
    await userEvent.type(screen.getByLabelText(/email/i), invalidCredentials.email);
    fireEvent.blur(screen.getByLabelText(/email/i));
    
    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });
  });

  test('validates password with strength requirements', async () => {
    render(<SignupForm onSuccess={mockOnSuccess} onError={mockOnError} />);
    
    await userEvent.type(screen.getByLabelText(/^password/i), invalidCredentials.password);
    fireEvent.blur(screen.getByLabelText(/^password/i));
    
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  test('validates password confirmation matching', async () => {
    render(<SignupForm onSuccess={mockOnSuccess} onError={mockOnError} />);
    
    await userEvent.type(screen.getByLabelText(/^password/i), validCredentials.password);
    await userEvent.type(screen.getByLabelText(/confirm password/i), invalidCredentials.confirmPassword);
    fireEvent.blur(screen.getByLabelText(/confirm password/i));
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  test('validates first name and last name fields', async () => {
    render(<SignupForm onSuccess={mockOnSuccess} onError={mockOnError} />);
    
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await userEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    });
  });

  test('handles successful signup submission with AuthResponse', async () => {
    const mockAuthService = require('../../src/services/auth.service').AuthService;
    mockAuthService.mockImplementation(() => ({
      signup: jest.fn().mockResolvedValue({ token: 'mock-token', user: validCredentials })
    }));

    render(<SignupForm onSuccess={mockOnSuccess} onError={mockOnError} />);
    
    await userEvent.type(screen.getByLabelText(/first name/i), validCredentials.firstName);
    await userEvent.type(screen.getByLabelText(/last name/i), validCredentials.lastName);
    await userEvent.type(screen.getByLabelText(/email/i), validCredentials.email);
    await userEvent.type(screen.getByLabelText(/^password/i), validCredentials.password);
    await userEvent.type(screen.getByLabelText(/confirm password/i), validCredentials.confirmPassword);
    
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(expect.objectContaining({
        token: 'mock-token',
        user: expect.any(Object)
      }));
    });
  });

  test('handles API errors during registration', async () => {
    const mockAuthService = require('../../src/services/auth.service').AuthService;
    mockAuthService.mockImplementation(() => ({
      signup: jest.fn().mockRejectedValue(new Error('Email already exists'))
    }));

    render(<SignupForm onSuccess={mockOnSuccess} onError={mockOnError} />);
    
    await userEvent.type(screen.getByLabelText(/email/i), validCredentials.email);
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  test('shows loading state during registration', async () => {
    const mockAuthService = require('../../src/services/auth.service').AuthService;
    mockAuthService.mockImplementation(() => ({
      signup: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    }));

    render(<SignupForm onSuccess={mockOnSuccess} onError={mockOnError} />);
    
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    
    expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('ForgotPasswordForm', () => {
  // Requirement: Authentication Flow Testing - Password reset functionality
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders form with email field', () => {
    render(<ForgotPasswordForm onSuccess={mockOnSuccess} onError={mockOnError} />);
    
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  test('validates email with format checking', async () => {
    render(<ForgotPasswordForm onSuccess={mockOnSuccess} onError={mockOnError} />);
    
    await userEvent.type(screen.getByLabelText(/email address/i), invalidCredentials.email);
    fireEvent.blur(screen.getByLabelText(/email address/i));
    
    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });
  });

  test('handles successful password reset request', async () => {
    const mockAuthService = require('../../src/services/auth.service').AuthService;
    mockAuthService.mockImplementation(() => ({
      requestPasswordReset: jest.fn().mockResolvedValue(undefined)
    }));

    render(<ForgotPasswordForm onSuccess={mockOnSuccess} onError={mockOnError} />);
    
    await userEvent.type(screen.getByLabelText(/email address/i), validCredentials.email);
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(validCredentials.email);
    });
  });

  test('handles error with invalid email', async () => {
    const mockAuthService = require('../../src/services/auth.service').AuthService;
    mockAuthService.mockImplementation(() => ({
      requestPasswordReset: jest.fn().mockRejectedValue(new Error('Email not found'))
    }));

    render(<ForgotPasswordForm onSuccess={mockOnSuccess} onError={mockOnError} />);
    
    await userEvent.type(screen.getByLabelText(/email address/i), invalidCredentials.email);
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Email not found');
    });
  });

  test('shows loading state during request submission', async () => {
    const mockAuthService = require('../../src/services/auth.service').AuthService;
    mockAuthService.mockImplementation(() => ({
      requestPasswordReset: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    }));

    render(<ForgotPasswordForm onSuccess={mockOnSuccess} onError={mockOnError} />);
    
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));
    
    expect(screen.getByText(/sending/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});