// @version jest ^29.0.0
// @version mongodb-memory-server ^8.0.0
// @version jsonwebtoken ^9.0.0

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { AuthService } from '../../../src/services/auth.service';
import UserModel from '../../../src/models/user.model';
import { User, Theme, MeasurementSystem, SkillLevel } from '../../../src/interfaces/user.interface';
import jwt from 'jsonwebtoken';

/**
 * HUMAN TASKS:
 * 1. Configure test environment variables for JWT secrets
 * 2. Set up test coverage reporting
 * 3. Configure integration test environment
 * 4. Set up automated security testing
 */

describe('AuthService', () => {
  let authService: AuthService;
  let mongoServer: MongoMemoryServer;

  // Test data based on JSON specification
  const validUser = {
    email: 'test@example.com',
    password: 'Password123!',
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

  const invalidCredentials = {
    email: 'nonexistent@example.com',
    password: 'WrongPassword123!'
  };

  beforeAll(async () => {
    // Requirement: Test Environment Setup
    // Start in-memory MongoDB server for isolated testing
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    // Initialize AuthService instance
    authService = new AuthService();
  });

  afterAll(async () => {
    // Clean up test environment
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear database collections before each test
    await UserModel.deleteMany({});
    
    // Reset any mocks
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Requirement: User Authentication - Successful login flow
      // Create test user with hashed password
      const user = new UserModel({
        ...validUser,
        passwordHash: validUser.password
      });
      await user.save();

      // Attempt login
      const result = await authService.login({
        email: validUser.email,
        password: validUser.password
      });

      // Verify returned tokens
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');

      // Verify tokens are valid JWT format
      expect(() => jwt.decode(result.accessToken)).not.toThrow();
      expect(() => jwt.decode(result.refreshToken)).not.toThrow();

      // Verify user lastLogin timestamp updated
      const updatedUser = await UserModel.findOne({ email: validUser.email });
      expect(updatedUser?.lastLogin).toBeDefined();
      expect(updatedUser?.lastLogin).toBeInstanceOf(Date);
    });

    it('should throw error for invalid email', async () => {
      // Requirement: Security Protocols - Invalid credentials handling
      await expect(authService.login({
        email: invalidCredentials.email,
        password: invalidCredentials.password
      })).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      // Requirement: Security Protocols - Password verification
      // Create test user
      const user = new UserModel({
        ...validUser,
        passwordHash: validUser.password
      });
      await user.save();

      // Attempt login with wrong password
      await expect(authService.login({
        email: validUser.email,
        password: invalidCredentials.password
      })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should successfully register new user', async () => {
      // Requirement: User Authentication - Registration process
      const result = await authService.register(validUser);

      // Verify user created in database
      const createdUser = await UserModel.findOne({ email: validUser.email });
      expect(createdUser).toBeDefined();

      // Verify password was hashed
      expect(createdUser?.passwordHash).not.toBe(validUser.password);
      expect(createdUser?.passwordHash).toMatch(/^\$2[aby]\$\d{1,2}\$[./A-Za-z0-9]{53}$/); // bcrypt hash pattern

      // Verify default preferences set correctly
      expect(createdUser?.preferences.theme).toBe(Theme.SYSTEM);
      expect(createdUser?.preferences.measurementSystem).toBe(MeasurementSystem.METRIC);

      // Verify timestamps set
      expect(createdUser?.createdAt).toBeInstanceOf(Date);
      expect(createdUser?.updatedAt).toBeInstanceOf(Date);

      // Verify returned user object doesn't contain sensitive data
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('email', validUser.email);
    });

    it('should throw error for existing email', async () => {
      // Requirement: Data Security - Duplicate account prevention
      // Create initial user
      await authService.register(validUser);

      // Attempt to register with same email
      await expect(authService.register(validUser))
        .rejects.toThrow('Email already registered');
    });
  });

  describe('refreshToken', () => {
    it('should generate new access token with valid refresh token', async () => {
      // Requirement: Security Protocols - Token refresh mechanism
      // Create test user
      const user = await authService.register(validUser);

      // Generate initial tokens
      const tokens = await authService.login({
        email: validUser.email,
        password: validUser.password
      });

      // Refresh token
      const newTokens = await authService.refreshToken(tokens.refreshToken);

      // Verify new tokens generated
      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.accessToken).not.toBe(tokens.accessToken);

      // Verify new token contains correct user claims
      const decoded = jwt.decode(newTokens.accessToken) as { userId: string };
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(user.id);

      // Verify token expiration
      expect(newTokens.expiresIn).toBeGreaterThan(0);
    });

    it('should throw error for invalid refresh token', async () => {
      // Requirement: Security Protocols - Invalid token handling
      await expect(authService.refreshToken('invalid-token'))
        .rejects.toThrow('Invalid refresh token');
    });
  });

  describe('verifyToken', () => {
    it('should return true for valid token', async () => {
      // Requirement: Security Protocols - Token verification
      // Create user and get tokens
      await authService.register(validUser);
      const { accessToken } = await authService.login({
        email: validUser.email,
        password: validUser.password
      });

      // Verify token
      const isValid = await authService.verifyToken(accessToken);
      expect(isValid).toBe(true);
    });

    it('should return false for expired token', async () => {
      // Requirement: Security Protocols - Token expiration
      // Create expired token
      const expiredToken = jwt.sign(
        { userId: new mongoose.Types.ObjectId().toString() },
        'test-secret',
        { expiresIn: '0s' }
      );

      // Verify expired token
      const isValid = await authService.verifyToken(expiredToken);
      expect(isValid).toBe(false);
    });
  });
});