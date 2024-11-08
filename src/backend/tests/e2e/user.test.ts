// // @version supertest ^6.3.3
// // @version jest ^29.5.0
// // @version mongoose ^6.0.0

// import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
// import supertest from 'supertest';
// import mongoose from 'mongoose';
// import UserModel from '../../src/models/user.model';
// import {
//   User,
//   Theme,
//   MeasurementSystem,
//   SkillLevel,
//   DietaryRestriction,
//   NotificationSettings,
// } from '../../src/interfaces/user.interface';

// /**
//  * HUMAN TASKS:
//  * 1. Configure test database connection string in environment variables
//  * 2. Set up test data seeding scripts if needed
//  * 3. Configure test email service for verification testing
//  * 4. Set up test S3 bucket for profile image testing
//  * 5. Configure test notification service for notification testing
//  */

// let app: any;
// let request: supertest.SuperTest<supertest.Test>;
// let authToken: string;

// // Test user data
// const testUser: Partial<User> = {
//   email: 'test@pantrychef.com',
//   passwordHash: 'TestPassword123!',
//   firstName: 'Test',
//   lastName: 'User',
//   preferences: {
//     theme: Theme.LIGHT,
//     language: 'en',
//     measurementSystem: MeasurementSystem.METRIC,
//     skillLevel: SkillLevel.INTERMEDIATE,
//     cuisinePreferences: ['Italian', 'Japanese'],
//     notificationSettings: {
//       expirationAlerts: true,
//       lowStockAlerts: true,
//       recipeRecommendations: true,
//       emailNotifications: true,
//       pushNotifications: true,
//     },
//   },
//   dietaryRestrictions: [DietaryRestriction.VEGETARIAN, DietaryRestriction.GLUTEN_FREE],
// };

// describe('User API E2E Tests', () => {
//   // Setup test environment
//   beforeAll(async () => {
//     // Addresses requirement: Test environment setup
//     const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/pantrychef_test';
//     await mongoose.connect(mongoUri);

//     // Import app after DB connection to avoid connection issues
//     const { app: application } = await import('../../src/app');
//     app = application;
//     // request = supertest(app);
//   });

//   // Cleanup after all tests
//   afterAll(async () => {
//     // Addresses requirement: Test data cleanup
//     await UserModel.deleteMany({});
//     await mongoose.connection.close();
//   });

//   // Clean the database before each test
//   beforeEach(async () => {
//     await UserModel.deleteMany({});
//   });

//   // Test user registration
//   test('POST /api/users/register - should register a new user', async () => {
//     // Addresses requirement: User Authentication - Registration
//     const response = await request.post('/api/users/register').send(testUser).expect(201);

//     expect(response.body).toHaveProperty('token');
//     expect(response.body.user).toHaveProperty('id');
//     expect(response.body.user.email).toBe(testUser.email);
//     expect(response.body.user).not.toHaveProperty('passwordHash');

//     // Verify user exists in database
//     const dbUser = await UserModel.findById(response.body.user.id);
//     expect(dbUser).toBeTruthy();
//     expect(dbUser?.email).toBe(testUser.email);
//   });

//   // Test user login
//   test('POST /api/users/login - should authenticate user and return token', async () => {
//     // Addresses requirement: User Authentication - Login
//     // Create test user first
//     await request.post('/api/users/register').send(testUser);

//     const response = await request
//       .post('/api/users/login')
//       .send({
//         email: testUser.email,
//         password: testUser.passwordHash,
//       })
//       .expect(200);

//     expect(response.body).toHaveProperty('token');
//     expect(response.body.user).toHaveProperty('lastLogin');
//     authToken = response.body.token;
//   });

//   // Test profile update
//   test('PUT /api/users/profile - should update user profile', async () => {
//     // Addresses requirement: User Profile Management
//     // Register and login first
//     const registerResponse = await request.post('/api/users/register').send(testUser);
//     authToken = registerResponse.body.token;

//     const updatedProfile = {
//       firstName: 'Updated',
//       lastName: 'Name',
//       profileImage: 'https://example.com/image.jpg',
//     };

//     const response = await request
//       .put('/api/users/profile')
//       .set('Authorization', `Bearer ${authToken}`)
//       .send(updatedProfile)
//       .expect(200);

//     expect(response.body.firstName).toBe(updatedProfile.firstName);
//     expect(response.body.lastName).toBe(updatedProfile.lastName);
//     expect(response.body.profileImage).toBe(updatedProfile.profileImage);
//   });

//   // Test preferences update
//   test('PUT /api/users/preferences - should update user preferences', async () => {
//     // Addresses requirement: User Preferences
//     // Register and login first
//     const registerResponse = await request.post('/api/users/register').send(testUser);
//     authToken = registerResponse.body.token;

//     const updatedPreferences = {
//       theme: Theme.DARK,
//       measurementSystem: MeasurementSystem.IMPERIAL,
//       skillLevel: SkillLevel.ADVANCED,
//       notificationSettings: {
//         expirationAlerts: false,
//         lowStockAlerts: true,
//         recipeRecommendations: true,
//         emailNotifications: false,
//         pushNotifications: true,
//       },
//     };

//     const response = await request
//       .put('/api/users/preferences')
//       .set('Authorization', `Bearer ${authToken}`)
//       .send(updatedPreferences)
//       .expect(200);

//     expect(response.body.preferences.theme).toBe(updatedPreferences.theme);
//     expect(response.body.preferences.measurementSystem).toBe(updatedPreferences.measurementSystem);
//     expect(response.body.preferences.skillLevel).toBe(updatedPreferences.skillLevel);
//     expect(response.body.preferences.notificationSettings).toEqual(
//       updatedPreferences.notificationSettings
//     );
//   });

//   // Test dietary restrictions update
//   test('PUT /api/users/dietary-restrictions - should update dietary restrictions', async () => {
//     // Addresses requirement: Dietary Restrictions
//     // Register and login first
//     const registerResponse = await request.post('/api/users/register').send(testUser);
//     authToken = registerResponse.body.token;

//     const updatedRestrictions = [DietaryRestriction.VEGAN, DietaryRestriction.NUT_FREE];

//     const response = await request
//       .put('/api/users/dietary-restrictions')
//       .set('Authorization', `Bearer ${authToken}`)
//       .send({ dietaryRestrictions: updatedRestrictions })
//       .expect(200);

//     expect(response.body.dietaryRestrictions).toEqual(updatedRestrictions);
//   });

//   // Test profile retrieval
//   test('GET /api/users/profile - should retrieve user profile', async () => {
//     // Addresses requirement: User Profile Management
//     // Register and login first
//     const registerResponse = await request.post('/api/users/register').send(testUser);
//     authToken = registerResponse.body.token;

//     const response = await request
//       .get('/api/users/profile')
//       .set('Authorization', `Bearer ${authToken}`)
//       .expect(200);

//     expect(response.body).toHaveProperty('id');
//     expect(response.body.email).toBe(testUser.email);
//     expect(response.body.firstName).toBe(testUser.firstName);
//     expect(response.body.preferences).toEqual(testUser.preferences);
//     expect(response.body.dietaryRestrictions).toEqual(testUser.dietaryRestrictions);
//   });

//   // Test account deletion
//   test('DELETE /api/users/account - should delete user account', async () => {
//     // Addresses requirement: User Profile Management
//     // Register and login first
//     const registerResponse = await request.post('/api/users/register').send(testUser);
//     authToken = registerResponse.body.token;
//     const userId = registerResponse.body.user.id;

//     await request
//       .delete('/api/users/account')
//       .set('Authorization', `Bearer ${authToken}`)
//       .expect(200);

//     // Verify user no longer exists
//     const deletedUser = await UserModel.findById(userId);
//     expect(deletedUser).toBeNull();
//   });

//   // Test invalid login attempts
//   test('POST /api/users/login - should handle invalid credentials', async () => {
//     // Addresses requirement: User Authentication - Security
//     await request
//       .post('/api/users/login')
//       .send({
//         email: testUser.email,
//         password: 'wrongpassword',
//       })
//       .expect(401);
//   });

//   // Test unauthorized access
//   test('GET /api/users/profile - should prevent unauthorized access', async () => {
//     // Addresses requirement: User Authentication - Security
//     await request.get('/api/users/profile').expect(401);
//   });

//   // Test invalid token
//   test('GET /api/users/profile - should reject invalid token', async () => {
//     // Addresses requirement: User Authentication - Security
//     await request
//       .get('/api/users/profile')
//       .set('Authorization', 'Bearer invalid_token')
//       .expect(401);
//   });
// });
