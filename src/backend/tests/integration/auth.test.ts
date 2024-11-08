// // @version jest ^29.0.0
// // @version supertest ^6.3.0
// // @version mongodb-memory-server ^8.0.0

// import { MongoMemoryServer } from 'mongodb-memory-server';
// import mongoose from 'mongoose';
// import { AuthService } from '../../src/services/auth.service';
// import UserModel from '../../src/models/user.model';
// import { User, Theme, MeasurementSystem, SkillLevel } from '../../src/interfaces/user.interface';
// import jwt from 'jsonwebtoken';
// import { jwtConfig } from '../../src/config/jwt';

// /**
//  * HUMAN TASKS:
//  * 1. Configure test environment variables for JWT secrets
//  * 2. Set up monitoring for test coverage reports
//  * 3. Configure integration test pipeline in CI/CD
//  * 4. Set up automated security testing for authentication flows
//  */

// describe('Authentication Integration Tests', () => {
//   let mongoServer: MongoMemoryServer;
//   let authService: AuthService;
//   let testUser: Partial<User>;

//   // Setup test environment before all tests
//   // Requirement: User Authentication - Test environment initialization
//   beforeAll(async () => {
//     // Start in-memory MongoDB server
//     mongoServer = await MongoMemoryServer.create();
//     const mongoUri = mongoServer.getUri();

//     // Connect to in-memory database
//     await mongoose.connect(mongoUri);

//     // Initialize AuthService
//     authService = new AuthService();

//     // Create test user data
//     testUser = {
//       email: 'test@example.com',
//       passwordHash: 'TestPassword123!',
//       firstName: 'Test',
//       lastName: 'User',
//       preferences: {
//         theme: Theme.SYSTEM,
//         language: 'en',
//         measurementSystem: MeasurementSystem.METRIC,
//         skillLevel: SkillLevel.BEGINNER,
//         notificationSettings: {
//           expirationAlerts: true,
//           lowStockAlerts: true,
//           recipeRecommendations: true,
//           emailNotifications: true,
//           pushNotifications: true,
//         },
//         cuisinePreferences: ['Italian', 'Asian'],
//       },
//       dietaryRestrictions: [],
//     };
//   });

//   // Cleanup after all tests
//   afterAll(async () => {
//     await mongoose.disconnect();
//     await mongoServer.stop();
//   });

//   // Clear database before each test
//   beforeEach(async () => {
//     await UserModel.deleteMany({});
//   });

//   describe('User Registration', () => {
//     // Test successful user registration
//     // Requirement: User Authentication - Secure registration process
//     it('should successfully register a new user', async () => {
//       // Register new user
//       const result = await authService.register(testUser as any);

//       // Verify user was created
//       expect(result).toBeDefined();
//       expect(result.email).toBe(testUser.email);
//       expect(result.firstName).toBe(testUser.firstName);
//       expect(result.lastName).toBe(testUser.lastName);

//       // Verify password is not returned
//       expect(result).not.toHaveProperty('passwordHash');

//       // Verify user exists in database
//       const dbUser = await UserModel.findOne({ email: testUser.email });
//       expect(dbUser).toBeDefined();
//       expect(dbUser!.email).toBe(testUser.email);

//       // Verify password was hashed
//       expect(dbUser!.passwordHash).not.toBe(testUser.passwordHash);
//       const isPasswordValid = await dbUser!.comparePassword(testUser.passwordHash);
//       expect(isPasswordValid).toBe(true);
//     });

//     // Test registration with existing email
//     // Requirement: User Authentication - Duplicate prevention
//     it('should fail registration with existing email', async () => {
//       // Register initial user
//       await authService.register(testUser as any);

//       // Attempt to register with same email
//       await expect(authService.register(testUser as any)).rejects.toThrow(
//         'Email already registered'
//       );

//       // Verify only one user exists
//       const userCount = await UserModel.countDocuments();
//       expect(userCount).toBe(1);
//     });

//     // Test registration with invalid data
//     // Requirement: User Authentication - Input validation
//     it('should fail registration with invalid data', async () => {
//       // Test missing email
//       const noEmail = { ...testUser, email: '' };
//       await expect(authService.register(noEmail as any)).rejects.toThrow(
//         'Email and password are required'
//       );

//       // Test missing password
//       const noPassword = { ...testUser, passwordHash: '' };
//       await expect(authService.register(noPassword as any)).rejects.toThrow(
//         'Email and password are required'
//       );

//       // Verify no users were created
//       const userCount = await UserModel.countDocuments();
//       expect(userCount).toBe(0);
//     });
//   });

//   describe('User Login', () => {
//     // Test successful login
//     // Requirement: Security Protocols - JWT token generation
//     it('should successfully login user with valid credentials', async () => {
//       // Register test user
//       await authService.register(testUser as any);

//       // Attempt login
//       const result = await authService.login({
//         email: testUser.email!,
//         password: testUser.passwordHash!,
//       });

//       // Verify tokens are returned
//       expect(result).toHaveProperty('accessToken');
//       expect(result).toHaveProperty('refreshToken');
//       expect(result).toHaveProperty('expiresIn');

//       // Verify tokens are valid JWT
//       const decodedAccess = jwt.verify(result.accessToken, jwtConfig.secret);
//       expect(decodedAccess).toHaveProperty('userId');

//       const decodedRefresh = jwt.verify(result.refreshToken, jwtConfig.secret);
//       expect(decodedRefresh).toHaveProperty('userId');

//       // Verify lastLogin was updated
//       const user = await UserModel.findOne({ email: testUser.email });
//       expect(user!.lastLogin).toBeDefined();
//       expect(user!.lastLogin).toBeInstanceOf(Date);
//     });

//     // Test login with invalid credentials
//     // Requirement: Security Protocols - Authentication failure handling
//     it('should fail login with invalid credentials', async () => {
//       // Register test user
//       await authService.register(testUser as any);

//       // Test wrong password
//       await expect(
//         authService.login({
//           email: testUser.email!,
//           password: 'WrongPassword123!',
//         })
//       ).rejects.toThrow('Invalid credentials');

//       // Test non-existent email
//       await expect(
//         authService.login({
//           email: 'nonexistent@example.com',
//           password: testUser.passwordHash!,
//         })
//       ).rejects.toThrow('Invalid credentials');

//       // Verify lastLogin was not updated
//       const user = await UserModel.findOne({ email: testUser.email });
//       expect(user!.lastLogin).toBeNull();
//     });
//   });

//   describe('Token Management', () => {
//     // Test token refresh
//     // Requirement: Security Protocols - Token refresh mechanism
//     it('should successfully refresh access token', async () => {
//       // Register and login user
//       await authService.register(testUser as any);
//       const tokens = await authService.login({
//         email: testUser.email!,
//         password: testUser.passwordHash!,
//       });

//       // Wait briefly to ensure new token will have different timestamp
//       await new Promise((resolve) => setTimeout(resolve, 1000));

//       // Refresh token
//       const newTokens = await authService.refreshToken(tokens.refreshToken);

//       // Verify new tokens are returned
//       expect(newTokens).toHaveProperty('accessToken');
//       expect(newTokens).toHaveProperty('refreshToken');
//       expect(newTokens.accessToken).not.toBe(tokens.accessToken);

//       // Verify new tokens are valid
//       const decodedAccess = jwt.verify(newTokens.accessToken, jwtConfig.secret);
//       expect(decodedAccess).toHaveProperty('userId');

//       // Verify old access token is still valid (not revoked)
//       const oldDecodedAccess = jwt.verify(tokens.accessToken, jwtConfig.secret);
//       expect(oldDecodedAccess).toHaveProperty('userId');
//     });

//     // Test invalid refresh token
//     // Requirement: Security Protocols - Token validation
//     it('should fail with invalid refresh token', async () => {
//       // Test with malformed token
//       await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
//         'Invalid refresh token'
//       );

//       // Test with token signed with wrong key
//       const invalidToken = jwt.sign({ userId: 'test-user' }, 'wrong-secret', { expiresIn: '15m' });
//       await expect(authService.refreshToken(invalidToken)).rejects.toThrow('Invalid refresh token');

//       // Test with expired token
//       const expiredToken = jwt.sign({ userId: 'test-user' }, jwtConfig.secret, { expiresIn: '0s' });
//       await expect(authService.refreshToken(expiredToken)).rejects.toThrow('Refresh token expired');
//     });

//     // Test token verification
//     // Requirement: Security Protocols - Token validation
//     it('should verify valid tokens', async () => {
//       // Register and login user
//       await authService.register(testUser as any);
//       const tokens = await authService.login({
//         email: testUser.email!,
//         password: testUser.passwordHash!,
//       });

//       // Verify valid access token
//       const isValid = await authService.verifyToken(tokens.accessToken);
//       expect(isValid).toBe(true);

//       // Verify invalid token
//       const isInvalidValid = await authService.verifyToken('invalid-token');
//       expect(isInvalidValid).toBe(false);

//       // Verify expired token
//       const expiredToken = jwt.sign({ userId: 'test-user' }, jwtConfig.secret, { expiresIn: '0s' });
//       const isExpiredValid = await authService.verifyToken(expiredToken);
//       expect(isExpiredValid).toBe(false);
//     });
//   });
// });
