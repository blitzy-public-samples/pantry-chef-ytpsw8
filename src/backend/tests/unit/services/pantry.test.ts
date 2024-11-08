// // @version jest ^29.0.0
// // @version mongoose ^6.0.0

// /**
//  * HUMAN TASKS:
//  * 1. Configure test environment variables:
//  *    - EXPIRATION_WARNING_DAYS=7
//  *    - LOW_STOCK_THRESHOLD=2
//  * 2. Set up test MongoDB instance for integration tests
//  * 3. Configure test Redis instance for cache testing
//  */

// import { PantryService } from '../../../src/services/pantry.service';
// import { CacheService } from '../../../src/services/cache.service';
// import { QueueService } from '../../../src/services/queue.service';
// import { NotificationService } from '../../../src/services/notification.service';
// import { PantryModel } from '../../../src/models/pantry.model';
// import {
//   Pantry,
//   PantryItem,
//   PantryStats,
//   StorageLocation,
// } from '../../../src/interfaces/pantry.interface';
// import { AppError } from '../../../src/utils/errors';
// import { IngredientCategory } from '../../../src/interfaces/ingredient.interface';

// // Mock dependencies
// jest.mock('../../../src/services/cache.service');
// jest.mock('../../../src/services/queue.service');
// jest.mock('../../../src/services/notification.service');
// jest.mock('../../../src/models/pantry.model');
// jest.mock('../../../src/utils/logger');

// describe('PantryService', () => {
//   let pantryService: PantryService;
//   let cacheService: jest.Mocked<CacheService>;
//   let queueService: jest.Mocked<QueueService>;
//   let notificationService: jest.Mocked<NotificationService>;

//   // Test data
//   const mockUserId = 'user123';
//   const mockPantryName = 'My Pantry';
//   const mockPantryId = 'pantry123';

//   const mockPantry: Pantry = {
//     id: mockPantryId,
//     userId: mockUserId,
//     name: mockPantryName,
//     items: [],
//     locations: Object.values(StorageLocation),
//     createdAt: new Date(),
//     updatedAt: new Date(),
//   };

//   const mockPantryItem: PantryItem = {
//     ingredientId: 'ingredient123',
//     quantity: 2,
//     unit: 'pieces',
//     location: StorageLocation.PANTRY,
//     purchaseDate: new Date(),
//     expirationDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
//     notes: 'Test item',
//   };

//   const mockPantryStats: PantryStats = {
//     totalItems: 5,
//     expiringItems: 2,
//     lowStockItems: 1,
//     itemsByCategory: new Map([[IngredientCategory.PRODUCE, 3]]),
//     itemsByLocation: new Map([[StorageLocation.PANTRY, 5]]),
//   };

//   beforeEach(() => {
//     // Clear all mocks
//     jest.clearAllMocks();

//     // Initialize mocked services
//     cacheService = {
//       set: jest.fn(),
//       get: jest.fn(),
//       delete: jest.fn(),
//     } as unknown as jest.Mocked<CacheService>;

//     queueService = {
//       publishToQueue: jest.fn(),
//     } as unknown as jest.Mocked<QueueService>;

//     notificationService = {
//       sendWebSocketNotification: jest.fn(),
//       checkExpiringItems: jest.fn(),
//     } as unknown as jest.Mocked<NotificationService>;

//     // Initialize PantryService with mocked dependencies
//     pantryService = new PantryService(cacheService, queueService, notificationService);
//   });

//   describe('createPantry', () => {
//     // Test: Successful pantry creation
//     it('should create a new pantry successfully', async () => {
//       // Arrange
//       (PantryModel.create as jest.Mock).mockResolvedValue(mockPantry);
//       cacheService.set.mockResolvedValue(undefined);

//       // Act
//       const result = await pantryService.createPantry(mockUserId, mockPantryName);

//       // Assert
//       expect(result).toEqual(mockPantry);
//       expect(PantryModel.create).toHaveBeenCalledWith({
//         userId: mockUserId,
//         name: mockPantryName,
//         items: [],
//         locations: Object.values(StorageLocation),
//         createdAt: expect.any(Date),
//         updatedAt: expect.any(Date),
//       });
//       expect(cacheService.set).toHaveBeenCalledWith(`pantry:${mockUserId}`, mockPantry, 3600);
//     });

//     // Test: Invalid parameters
//     it('should throw error for invalid parameters', async () => {
//       // Act & Assert
//       await expect(pantryService.createPantry('', '')).rejects.toThrow(AppError);
//       expect(PantryModel.create).not.toHaveBeenCalled();
//     });
//   });

//   describe('getPantry', () => {
//     // Test: Cache hit scenario
//     it('should return pantry from cache when available', async () => {
//       // Arrange
//       cacheService.get.mockResolvedValue(mockPantry);

//       // Act
//       const result = await pantryService.getPantry(mockUserId);

//       // Assert
//       expect(result).toEqual(mockPantry);
//       expect(cacheService.get).toHaveBeenCalledWith(`pantry:${mockUserId}`);
//       expect(PantryModel.findOne).not.toHaveBeenCalled();
//     });

//     // Test: Cache miss scenario
//     it('should fetch from database on cache miss', async () => {
//       // Arrange
//       cacheService.get.mockResolvedValue(null);
//       (PantryModel.findOne as jest.Mock).mockResolvedValue(mockPantry);

//       // Act
//       const result = await pantryService.getPantry(mockUserId);

//       // Assert
//       expect(result).toEqual(mockPantry);
//       expect(PantryModel.findOne).toHaveBeenCalledWith({ userId: mockUserId });
//       expect(cacheService.set).toHaveBeenCalledWith(`pantry:${mockUserId}`, mockPantry, 3600);
//     });

//     // Test: Pantry not found
//     it('should throw error when pantry not found', async () => {
//       // Arrange
//       cacheService.get.mockResolvedValue(null);
//       (PantryModel.findOne as jest.Mock).mockResolvedValue(null);

//       // Act & Assert
//       await expect(pantryService.getPantry(mockUserId)).rejects.toThrow(AppError);
//     });
//   });

//   describe('addItem', () => {
//     // Test: Successful item addition
//     it('should add item to pantry successfully', async () => {
//       // Arrange
//       (pantryService.addItem as jest.Mock).mockResolvedValue(undefined);
//       cacheService.delete.mockResolvedValue(undefined);

//       // Act
//       await pantryService.addItem(mockUserId, mockPantryItem);

//       // Assert
//       expect(pantryService.addItem).toHaveBeenCalledWith(mockPantryItem);
//       expect(cacheService.delete).toHaveBeenCalledWith(`pantry:${mockUserId}`);
//       expect(queueService.publishToQueue).toHaveBeenCalledWith(
//         'expiration-check',
//         expect.any(Object)
//       );
//       expect(notificationService.sendWebSocketNotification).toHaveBeenCalled();
//     });

//     // Test: Invalid item data
//     // it('should throw error for invalid item data', async () => {
//     //   // Arrange
//     //   const invalidItem = { ...mockPantryItem, quantity: undefined };

//     //   // Act & Assert
//     //   await expect(pantryService.addItem(mockUserId, invalidItem)).rejects.toThrow(AppError);
//     //   expect(pantryService.addItem).not.toHaveBeenCalled();
//     // });

//     // Test: Invalid storage location
//     it('should throw error for invalid storage location', async () => {
//       // Arrange
//       const invalidItem = { ...mockPantryItem, location: 'INVALID' as StorageLocation };

//       // Act & Assert
//       await expect(pantryService.addItem(mockUserId, invalidItem)).rejects.toThrow(AppError);
//     });
//   });

//   describe('removeItem', () => {
//     // Test: Successful item removal
//     it('should remove item successfully', async () => {
//       // Arrange
//       (pantryService.removeItem as jest.Mock).mockResolvedValue(undefined);

//       // Act
//       await pantryService.removeItem(mockUserId, mockPantryItem.ingredientId);

//       // Assert
//       expect(pantryService.removeItem).toHaveBeenCalledWith(mockPantryItem.ingredientId);
//       expect(cacheService.delete).toHaveBeenCalledWith(`pantry:${mockUserId}`);
//       expect(notificationService.sendWebSocketNotification).toHaveBeenCalled();
//     });

//     // Test: Item not found
//     it('should handle item not found error', async () => {
//       // Arrange
//       (pantryService.removeItem as jest.Mock).mockRejectedValue(new Error('Item not found'));

//       // Act & Assert
//       await expect(pantryService.removeItem(mockUserId, 'nonexistent')).rejects.toThrow();
//     });
//   });

//   describe('updateItemQuantity', () => {
//     // Test: Successful quantity update
//     it('should update item quantity successfully', async () => {
//       // Arrange
//       const newQuantity = 5;
//       (pantryService.updateItemQuantity as jest.Mock).mockResolvedValue(undefined);

//       // Act
//       await pantryService.updateItemQuantity(mockUserId, mockPantryItem.ingredientId, newQuantity);

//       // Assert
//       expect(pantryService.updateItemQuantity).toHaveBeenCalledWith(
//         mockPantryItem.ingredientId,
//         newQuantity
//       );
//       expect(cacheService.delete).toHaveBeenCalledWith(`pantry:${mockUserId}`);
//       expect(notificationService.sendWebSocketNotification).toHaveBeenCalled();
//     });

//     // Test: Invalid quantity
//     it('should throw error for negative quantity', async () => {
//       // Act & Assert
//       await expect(
//         pantryService.updateItemQuantity(mockUserId, mockPantryItem.ingredientId, -1)
//       ).rejects.toThrow(AppError);
//       expect(pantryService.updateItemQuantity).not.toHaveBeenCalled();
//     });
//   });

//   describe('checkExpiringItems', () => {
//     // Test: Expiring items found
//     it('should identify items nearing expiration', async () => {
//       // Arrange
//       const expiringItem = {
//         ...mockPantryItem,
//         expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
//       };
//       mockPantry.items = [expiringItem];
//       (PantryModel.findOne as jest.Mock).mockResolvedValue(mockPantry);

//       // Act
//       const result = await pantryService.checkExpiringItems(mockUserId);

//       // Assert
//       expect(result).toHaveLength(1);
//       expect(result[0]).toEqual(expiringItem);
//       expect(notificationService.checkExpiringItems).toHaveBeenCalledWith(mockUserId);
//     });

//     // Test: No expiring items
//     it('should return empty array when no items are expiring', async () => {
//       // Arrange
//       mockPantry.items = [mockPantryItem]; // Item expires in 14 days
//       (PantryModel.findOne as jest.Mock).mockResolvedValue(mockPantry);

//       // Act
//       const result = await pantryService.checkExpiringItems(mockUserId);

//       // Assert
//       expect(result).toHaveLength(0);
//       expect(notificationService.checkExpiringItems).not.toHaveBeenCalled();
//     });
//   });

//   describe('getPantryStats', () => {
//     // Test: Successful stats retrieval
//     it('should retrieve pantry statistics successfully', async () => {
//       // Arrange
//       (PantryModel.getStats as jest.Mock).mockResolvedValue(mockPantryStats);

//       // Act
//       const result = await pantryService.getPantryStats(mockUserId);

//       // Assert
//       expect(result).toEqual(mockPantryStats);
//       expect(PantryModel.getStats).toHaveBeenCalled();
//     });

//     // Test: Error handling
//     it('should handle stats retrieval error', async () => {
//       // Arrange
//       (PantryModel.getStats as jest.Mock).mockRejectedValue(new Error('Stats error'));

//       // Act & Assert
//       await expect(pantryService.getPantryStats(mockUserId)).rejects.toThrow();
//     });
//   });
// });
