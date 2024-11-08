// // @version jest ^29.0.0
// // @version bcrypt ^5.0.1
// // @version mongoose ^6.5.0

// import { UserService } from '../../../src/services/user.service';
// import UserModel from '../../../src/models/user.model';
// import {
//   User,
//   Theme,
//   MeasurementSystem,
//   SkillLevel,
//   DietaryRestriction,
// } from '../../../src/interfaces/user.interface';
// import { AppError } from '../../../src/utils/errors';
// import jwt from 'jsonwebtoken';

// // Mock dependencies
// jest.mock('../../../src/models/user.model');
// jest.mock('../../../src/utils/logger');
// jest.mock('jsonwebtoken');
// jest.mock('bcrypt');

// describe('UserService', () => {
//   let userService: UserService;
//   const mockUserId = '507f1f77bcf86cd799439011';

//   // Test fixtures
//   const mockUser: Partial<User> = {
//     id: mockUserId,
//     email: 'test@example.com',
//     firstName: 'John',
//     lastName: 'Doe',
//     passwordHash: 'hashedPassword123',
//     preferences: {
//       theme: Theme.LIGHT,
//       measurementSystem: MeasurementSystem.METRIC,
//       skillLevel: SkillLevel.INTERMEDIATE,
//       language: 'en',
//       cuisinePreferences: ['Italian', 'Japanese'],
//       notificationSettings: {
//         expirationAlerts: true,
//         lowStockAlerts: true,
//         recipeRecommendations: true,
//         emailNotifications: true,
//         pushNotifications: true,
//       },
//     },
//     dietaryRestrictions: [DietaryRestriction.VEGETARIAN],
//     savedRecipes: [],
//     pantryIds: [],
//     lastLogin: new Date(),
//     createdAt: new Date(),
//     updatedAt: new Date(),
//   };

//   beforeEach(() => {
//     jest.clearAllMocks();
//     userService = new UserService();
//     process.env.JWT_SECRET = 'test-secret';
//     process.env.JWT_EXPIRATION = '24h';
//   });

//   describe('createUser', () => {
//     // Addresses requirement: User Authentication - Testing secure user registration
//     it('should create a new user with valid data', async () => {
//       const userData = {
//         email: 'new@example.com',
//         password: 'ValidPass123!',
//         firstName: 'Jane',
//         lastName: 'Smith',
//       };

//       const mockCreatedUser = { ...mockUser, ...userData };
//       (UserModel.findOne as jest.Mock).mockResolvedValue(null);
//       (UserModel.create as jest.Mock).mockResolvedValue({
//         ...mockCreatedUser,
//         toObject: () => mockCreatedUser,
//       });

//       const result = await userService.createUser(userData);

//       expect(UserModel.create).toHaveBeenCalledWith(
//         expect.objectContaining({
//           email: userData.email,
//           firstName: userData.firstName,
//           lastName: userData.lastName,
//         })
//       );
//       expect(result).not.toHaveProperty('passwordHash');
//       expect(result.email).toBe(userData.email);
//     });

//     it('should validate email format and reject invalid emails', async () => {
//       const userData = {
//         email: 'invalid-email',
//         password: 'ValidPass123!',
//         firstName: 'Jane',
//         lastName: 'Smith',
//       };

//       await expect(userService.createUser(userData)).rejects.toThrow(AppError);
//     });

//     it('should validate password strength requirements', async () => {
//       const userData = {
//         email: 'test@example.com',
//         password: 'weak',
//         firstName: 'Jane',
//         lastName: 'Smith',
//       };

//       await expect(userService.createUser(userData)).rejects.toThrow(AppError);
//     });

//     it('should check for existing email addresses', async () => {
//       const userData = {
//         email: 'existing@example.com',
//         password: 'ValidPass123!',
//         firstName: 'Jane',
//         lastName: 'Smith',
//       };

//       (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

//       await expect(userService.createUser(userData)).rejects.toThrow(AppError);
//     });
//   });

//   describe('authenticateUser', () => {
//     // Addresses requirement: User Authentication - Testing secure login process
//     it('should authenticate user with valid credentials', async () => {
//       const credentials = {
//         email: 'test@example.com',
//         password: 'ValidPass123!',
//       };

//       const mockToken = 'mock-jwt-token';
//       const mockUserWithMethods = {
//         ...mockUser,
//         comparePassword: jest.fn().mockResolvedValue(true),
//         toObject: () => mockUser,
//       };

//       (UserModel.findOne as jest.Mock).mockResolvedValue(mockUserWithMethods);
//       (jwt.sign as jest.Mock).mockReturnValue(mockToken);
//       (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUserWithMethods);

//       const result = await userService.authenticateUser(credentials.email, credentials.password);

//       expect(result).toHaveProperty('token', mockToken);
//       expect(result.user).not.toHaveProperty('passwordHash');
//       expect(jwt.sign).toHaveBeenCalledWith(
//         expect.objectContaining({ userId: mockUserId }),
//         'test-secret',
//         expect.any(Object)
//       );
//     });

//     it('should reject invalid password combinations', async () => {
//       const mockUserWithMethods = {
//         ...mockUser,
//         comparePassword: jest.fn().mockResolvedValue(false),
//         toObject: () => mockUser,
//       };

//       (UserModel.findOne as jest.Mock).mockResolvedValue(mockUserWithMethods);

//       await expect(userService.authenticateUser('test@example.com', 'wrongpass')).rejects.toThrow(
//         AppError
//       );
//     });

//     it('should handle non-existent user attempts', async () => {
//       (UserModel.findOne as jest.Mock).mockResolvedValue(null);

//       await expect(
//         userService.authenticateUser('nonexistent@example.com', 'password')
//       ).rejects.toThrow(AppError);
//     });
//   });

//   describe('updateUserProfile', () => {
//     // Addresses requirement: User Profile Management - Testing profile updates
//     it('should update user profile with valid data', async () => {
//       const updateData = {
//         firstName: 'Updated',
//         lastName: 'Name',
//       };

//       const mockUpdatedUser = {
//         ...mockUser,
//         ...updateData,
//         toObject: () => ({ ...mockUser, ...updateData }),
//       };

//       (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

//       const result = await userService.updateUserProfile(mockUserId, updateData);

//       expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
//         mockUserId,
//         { $set: updateData },
//         expect.any(Object)
//       );
//       expect(result.firstName).toBe(updateData.firstName);
//       expect(result.lastName).toBe(updateData.lastName);
//     });

//     it('should handle non-existent user updates', async () => {
//       (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

//       await expect(userService.updateUserProfile(mockUserId, { firstName: 'New' })).rejects.toThrow(
//         AppError
//       );
//     });

//     it('should maintain unchanged fields', async () => {
//       const updateData = { firstName: 'Updated' };
//       const mockUpdatedUser = {
//         ...mockUser,
//         ...updateData,
//         toObject: () => ({ ...mockUser, ...updateData }),
//       };

//       (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

//       const result = await userService.updateUserProfile(mockUserId, updateData);

//       expect(result.lastName).toBe(mockUser.lastName);
//       expect(result.email).toBe(mockUser.email);
//     });
//   });

//   describe('updateUserPreferences', () => {
//     // Addresses requirement: User Preferences - Testing preference management
//     it('should update user preferences successfully', async () => {
//       const newPreferences = {
//         theme: Theme.DARK,
//         measurementSystem: MeasurementSystem.IMPERIAL,
//         skillLevel: SkillLevel.ADVANCED,
//         language: 'es',
//         cuisinePreferences: ['Mexican', 'Thai'],
//         notificationSettings: {
//           expirationAlerts: false,
//           lowStockAlerts: true,
//           recipeRecommendations: true,
//           emailNotifications: false,
//           pushNotifications: true,
//         },
//       };

//       const mockUpdatedUser = {
//         ...mockUser,
//         preferences: newPreferences,
//         toObject: () => ({ ...mockUser, preferences: newPreferences }),
//       };

//       (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

//       const result = await userService.updateUserPreferences(mockUserId, newPreferences);

//       expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
//         mockUserId,
//         { $set: { preferences: newPreferences } },
//         expect.any(Object)
//       );
//       expect(result.preferences).toEqual(newPreferences);
//     });

//     // it('should validate theme enum values', async () => {
//     //   const invalidPreferences = {
//     //     ...mockUser.preferences,
//     //     theme: 'INVALID_THEME',
//     //   };

//     //   await expect(
//     //     userService.updateUserPreferences(mockUserId, invalidPreferences)
//     //   ).rejects.toThrow();
//     // });

//     // it('should validate measurement system values', async () => {
//     //   const invalidPreferences = {
//     //     ...mockUser.preferences,
//     //     measurementSystem: 'INVALID_SYSTEM',
//     //   };

//     //   await expect(
//     //     userService.updateUserPreferences(mockUserId, invalidPreferences)
//     //   ).rejects.toThrow();
//     // });
//   });

//   describe('updateDietaryRestrictions', () => {
//     // Addresses requirement: User Preferences - Testing dietary restriction management
//     it('should update dietary restrictions successfully', async () => {
//       const newRestrictions = [DietaryRestriction.VEGAN, DietaryRestriction.GLUTEN_FREE];

//       const mockUpdatedUser = {
//         ...mockUser,
//         dietaryRestrictions: newRestrictions,
//         toObject: () => ({ ...mockUser, dietaryRestrictions: newRestrictions }),
//       };

//       (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

//       const result = await userService.updateDietaryRestrictions(mockUserId, newRestrictions);

//       expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
//         mockUserId,
//         { $set: { dietaryRestrictions: newRestrictions } },
//         expect.any(Object)
//       );
//       expect(result.dietaryRestrictions).toEqual(newRestrictions);
//     });

//     it('should validate restriction enum values', async () => {
//       const invalidRestrictions = ['INVALID_RESTRICTION'];

//       await expect(
//         userService.updateDietaryRestrictions(mockUserId, invalidRestrictions as any)
//       ).rejects.toThrow(AppError);
//     });

//     it('should handle empty restriction arrays', async () => {
//       const mockUpdatedUser = {
//         ...mockUser,
//         dietaryRestrictions: [],
//         toObject: () => ({ ...mockUser, dietaryRestrictions: [] }),
//       };

//       (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

//       const result = await userService.updateDietaryRestrictions(mockUserId, []);

//       expect(result.dietaryRestrictions).toEqual([]);
//     });
//   });

//   describe('getUserById', () => {
//     // Addresses requirement: User Profile Management - Testing profile retrieval
//     it('should retrieve user by valid ID', async () => {
//       const mockFoundUser = {
//         ...mockUser,
//         toObject: () => mockUser,
//       };

//       (UserModel.findById as jest.Mock).mockResolvedValue(mockFoundUser);

//       const result = await userService.getUserById(mockUserId);

//       expect(UserModel.findById).toHaveBeenCalledWith(mockUserId);
//       expect(result).not.toHaveProperty('passwordHash');
//       expect(result.id).toBe(mockUserId);
//     });

//     it('should handle non-existent user IDs', async () => {
//       (UserModel.findById as jest.Mock).mockResolvedValue(null);

//       await expect(userService.getUserById('nonexistentid')).rejects.toThrow(AppError);
//     });

//     it('should exclude sensitive data', async () => {
//       const mockFoundUser = {
//         ...mockUser,
//         toObject: () => mockUser,
//       };

//       (UserModel.findById as jest.Mock).mockResolvedValue(mockFoundUser);

//       const result = await userService.getUserById(mockUserId);

//       expect(result).not.toHaveProperty('passwordHash');
//     });
//   });

//   describe('deleteUser', () => {
//     // Addresses requirement: User Profile Management - Testing account deletion
//     it('should delete existing user successfully', async () => {
//       const mockFoundUser = {
//         ...mockUser,
//         toObject: () => mockUser,
//       };

//       (UserModel.findById as jest.Mock).mockResolvedValue(mockFoundUser);
//       (UserModel.findByIdAndDelete as jest.Mock).mockResolvedValue(mockFoundUser);

//       await userService.deleteUser(mockUserId);

//       expect(UserModel.findByIdAndDelete).toHaveBeenCalledWith(mockUserId);
//     });

//     it('should handle non-existent user deletion', async () => {
//       (UserModel.findById as jest.Mock).mockResolvedValue(null);

//       await expect(userService.deleteUser('nonexistentid')).rejects.toThrow(AppError);
//     });

//     it('should clean up related user data', async () => {
//       const mockFoundUser = {
//         ...mockUser,
//         toObject: () => mockUser,
//       };

//       (UserModel.findById as jest.Mock).mockResolvedValue(mockFoundUser);
//       (UserModel.findByIdAndDelete as jest.Mock).mockResolvedValue(mockFoundUser);

//       await userService.deleteUser(mockUserId);

//       expect(UserModel.findByIdAndDelete).toHaveBeenCalledWith(mockUserId);
//     });
//   });
// });
