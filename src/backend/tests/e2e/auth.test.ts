// @version jest ^29.0.0
// @version supertest ^6.1.3
// @version mongodb ^4.5.0

import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import supertest from 'supertest';
import app from '../../src/app';
import UserModel from '../../src/models/user.model';
import { User, Theme, MeasurementSystem, SkillLevel } from '../../src/interfaces/user.interface';

// HUMAN TASKS:
// 1. Configure test database connection string in environment variables
// 2. Set up test email service for password reset testing
// 3. Configure test OAuth providers for social authentication testing
// 4. Set up test Redis instance for session management testing

const request = supertest(app);
const baseUrl = '/api/v1/auth';

// Test user data matching the User interface
const testUser = {
  email: 'test@example.com',
  password: 'Test123!@#',
  firstName: 'Test',
  lastName: 'User',
  preferences: {
    theme: Theme.SYSTEM,
    measurementSystem: MeasurementSystem.METRIC,
    skillLevel: SkillLevel.BEGINNER,
    notificationSettings: {
      expirationAlerts: true,
      lowStockAlerts: true,
      recipeRecommendations: true,
      emailNotifications: true,
      pushNotifications: true
    }
  }
};

// Store tokens for authenticated requests
let accessToken: string;
let refreshToken: string;

/**
 * Setup function that runs before all tests
 * Requirement addressed: Test environment initialization
 */
beforeAll(async () => {
  try {
    // Clear existing test data
    await UserModel.deleteMany({});
  } catch (error) {
    console.error('Error in test setup:', error);
    throw error;
  }
});

/**
 * Cleanup function that runs after all tests
 * Requirement addressed: Test environment cleanup
 */
afterAll(async () => {
  try {
    // Clean up test data
    await UserModel.deleteMany({});
  } catch (error) {
    console.error('Error in test cleanup:', error);
    throw error;
  }
});

/**
 * Setup function that runs before each test
 * Requirement addressed: Test isolation
 */
beforeEach(async () => {
  try {
    // Reset test data
    await UserModel.deleteMany({});
    accessToken = '';
    refreshToken = '';
  } catch (error) {
    console.error('Error in test reset:', error);
    throw error;
  }
});

describe('Authentication Endpoints', () => {
  /**
   * Test user registration endpoint
   * Requirements addressed:
   * - User Authentication: New user registration
   * - Data Security: Secure password handling
   */
  describe('POST /register', () => {
    it('should successfully register a new user', async () => {
      const response = await request
        .post(`${baseUrl}/register`)
        .send(testUser)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('firstName', testUser.firstName);
      expect(response.body.user).toHaveProperty('lastName', testUser.lastName);
      expect(response.body.user).not.toHaveProperty('passwordHash');

      // Verify user in database
      const dbUser = await UserModel.findOne({ email: testUser.email });
      expect(dbUser).toBeTruthy();
      expect(dbUser?.passwordHash).not.toBe(testUser.password);
    });

    it('should reject registration with invalid email format', async () => {
      const invalidUser = { ...testUser, email: 'invalid-email' };
      await request
        .post(`${baseUrl}/register`)
        .send(invalidUser)
        .expect(400);
    });

    it('should reject registration with weak password', async () => {
      const weakPasswordUser = { ...testUser, password: 'weak' };
      await request
        .post(`${baseUrl}/register`)
        .send(weakPasswordUser)
        .expect(400);
    });
  });

  /**
   * Test user login endpoint
   * Requirements addressed:
   * - User Authentication: Secure login process
   * - Security Protocols: JWT token generation
   */
  describe('POST /login', () => {
    beforeEach(async () => {
      // Create test user for login tests
      await request
        .post(`${baseUrl}/register`)
        .send(testUser);
    });

    it('should successfully authenticate user and return tokens', async () => {
      const response = await request
        .post(`${baseUrl}/login`)
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      // Verify token response
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toHaveProperty('email', testUser.email);

      // Verify lastLogin timestamp update
      const dbUser = await UserModel.findOne({ email: testUser.email });
      expect(dbUser?.lastLogin).toBeTruthy();
    });

    it('should reject login with incorrect password', async () => {
      await request
        .post(`${baseUrl}/login`)
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('should reject login for non-existent user', async () => {
      await request
        .post(`${baseUrl}/login`)
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);
    });
  });

  /**
   * Test token refresh endpoint
   * Requirements addressed:
   * - Security Protocols: Token refresh mechanism
   * - Data Security: Secure session management
   */
  describe('POST /refresh-token', () => {
    beforeEach(async () => {
      // Create user and get tokens
      const loginResponse = await request
        .post(`${baseUrl}/register`)
        .send(testUser)
        .then(() => request
          .post(`${baseUrl}/login`)
          .send({
            email: testUser.email,
            password: testUser.password
          }));

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should successfully refresh access token', async () => {
      const response = await request
        .post(`${baseUrl}/refresh-token`)
        .send({ refreshToken })
        .expect(200);

      // Verify new token response
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.accessToken).toBeTruthy();
    });

    it('should reject refresh with invalid token', async () => {
      await request
        .post(`${baseUrl}/refresh-token`)
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should reject refresh with expired token', async () => {
      // Wait for token expiration if needed
      await request
        .post(`${baseUrl}/refresh-token`)
        .send({ refreshToken: 'expired-token' })
        .expect(401);
    });
  });

  /**
   * Test password reset endpoint
   * Requirements addressed:
   * - User Authentication: Password recovery
   * - Data Security: Secure password reset
   */
  describe('POST /reset-password', () => {
    beforeEach(async () => {
      // Create test user for password reset
      await request
        .post(`${baseUrl}/register`)
        .send(testUser);
    });

    it('should successfully initiate password reset', async () => {
      const response = await request
        .post(`${baseUrl}/reset-password`)
        .send({ email: testUser.email })
        .expect(200);

      // Verify reset token creation
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('reset instructions sent');
    });

    it('should handle reset request for non-existent email', async () => {
      await request
        .post(`${baseUrl}/reset-password`)
        .send({ email: 'nonexistent@example.com' })
        .expect(200); // Should still return 200 for security
    });

    it('should reject invalid reset token', async () => {
      await request
        .post(`${baseUrl}/reset-password/confirm`)
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123!@#'
        })
        .expect(400);
    });
  });
});