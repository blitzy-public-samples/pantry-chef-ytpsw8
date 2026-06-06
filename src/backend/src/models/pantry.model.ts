// @version mongoose ^6.0.0

/**
 * HUMAN TASKS:
 * 1. Configure MongoDB indexes for optimal query performance on userId and ingredientId fields
 * 2. Set up monitoring for expiring items notification threshold (default 7 days)
 * 3. Configure low stock thresholds per ingredient category in system settings
 * 4. Verify that the storage locations enum matches the UI display options
 */

import mongoose, { Schema, Document } from 'mongoose';
import { Pantry, PantryItem, StorageLocation, PantryStats } from '../interfaces/pantry.interface';
import { IngredientCategory } from '../interfaces/ingredient.interface';

// Addresses requirement: Digital Pantry Management - Item tracking
const PantryItemSchema = new Schema<PantryItem>({
  ingredientId: {
    type: String,
    required: true,
    ref: 'Ingredient'
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true
  },
  location: {
    type: String,
    enum: Object.values(StorageLocation),
    required: true
  },
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expirationDate: {
    type: Date,
    required: true
  },
  notes: {
    type: String,
    default: ''
  }
});

// Addresses requirement: Digital Pantry Management - Pantry data structure
const PantrySchema = new Schema<Pantry>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    default: 'My Pantry'
  },
  items: [PantryItemSchema],
  locations: [{
    type: String,
    enum: Object.values(StorageLocation)
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps on save
PantrySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Addresses requirement: Digital Pantry Management - Expiration tracking
PantrySchema.methods.getStats = async function(): Promise<PantryStats> {
  const now = new Date();
  const expirationThreshold = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days

  const itemsByCategory = new Map<IngredientCategory, number>();
  const itemsByLocation = new Map<StorageLocation, number>();
  
  let expiringItems = 0;
  let lowStockItems = 0;

  // Calculate statistics from pantry items
  for (const item of this.items) {
    // Track expiring items
    if (item.expirationDate <= expirationThreshold) {
      expiringItems++;
    }

    // Group by location
    const locationCount = itemsByLocation.get(item.location) || 0;
    itemsByLocation.set(item.location, locationCount + 1);

    // Resolve the ingredient once for both category grouping and the
    // category-specific low-stock threshold (avoids a second async lookup).
    const ingredient = await mongoose.model('Ingredient').findById(item.ingredientId);
    if (ingredient) {
      const categoryCount = itemsByCategory.get(ingredient.category) || 0;
      itemsByCategory.set(ingredient.category, categoryCount + 1);

      // Track low stock items (threshold varies by category)
      if (item.quantity <= this.getLowStockThreshold(ingredient.category)) {
        lowStockItems++;
      }
    } else if (item.quantity <= 1) {
      // Fallback to the default threshold when the ingredient cannot be resolved
      lowStockItems++;
    }
  }

  return {
    totalItems: this.items.length,
    expiringItems,
    lowStockItems,
    itemsByCategory,
    itemsByLocation
  };
};

// Addresses requirement: Inventory Management - Item management
PantrySchema.methods.addItem = async function(item: PantryItem): Promise<void> {
  const existingItemIndex = this.items.findIndex(
    (i: PantryItem) => i.ingredientId === item.ingredientId
  );

  if (existingItemIndex >= 0) {
    // Update existing item
    this.items[existingItemIndex] = {
      ...this.items[existingItemIndex],
      quantity: item.quantity,
      location: item.location,
      expirationDate: item.expirationDate,
      notes: item.notes
    };
  } else {
    // Add new item
    this.items.push(item);
  }

  // Update locations if needed
  if (!this.locations.includes(item.location)) {
    this.locations.push(item.location);
  }

  await this.save();
};

// Addresses requirement: Inventory Management - Item removal
PantrySchema.methods.removeItem = async function(ingredientId: string): Promise<void> {
  const itemIndex = this.items.findIndex(
    (item: PantryItem) => item.ingredientId === ingredientId
  );

  if (itemIndex >= 0) {
    this.items.splice(itemIndex, 1);
    await this.save();
  }
};

// Addresses requirement: Inventory Management - Quantity updates
PantrySchema.methods.updateItemQuantity = async function(
  ingredientId: string,
  quantity: number
): Promise<void> {
  const item = this.items.find((i: PantryItem) => i.ingredientId === ingredientId);
  
  if (item) {
    item.quantity = Math.max(0, quantity); // Prevent negative quantities
    await this.save();
  }
};

// Helper method to determine low stock threshold based on ingredient category.
// Implemented as a synchronous schema method because it is consumed inside the
// synchronous portion of getStats(); the caller resolves the ingredient and
// passes its category so no asynchronous lookup is required here.
PantrySchema.methods.getLowStockThreshold = function(category: IngredientCategory): number {
  const defaultThreshold = 1;
  const thresholds: Partial<Record<IngredientCategory, number>> = {
    [IngredientCategory.PRODUCE]: 2,
    [IngredientCategory.MEAT]: 1,
    [IngredientCategory.DAIRY]: 1,
    [IngredientCategory.GRAINS]: 2,
    [IngredientCategory.SPICES]: 1,
    [IngredientCategory.CONDIMENTS]: 1,
    [IngredientCategory.BEVERAGES]: 1,
    [IngredientCategory.OTHER]: 1
  };

  return thresholds[category] ?? defaultThreshold;
};

// Create indexes for efficient querying
PantrySchema.index({ userId: 1 });
PantrySchema.index({ 'items.ingredientId': 1 });
PantrySchema.index({ 'items.expirationDate': 1 });

/**
 * Mongoose document type for a pantry. Extends the plain {@link Pantry} data
 * shape with the instance methods registered on PantrySchema.methods so that
 * consumers (e.g. PantryService) can invoke them on hydrated documents in a
 * fully type-safe manner instead of treating them as (non-existent) statics.
 */
export type PantryDocument = Pantry & Document & {
  getStats(): Promise<PantryStats>;
  addItem(item: PantryItem): Promise<void>;
  removeItem(ingredientId: string): Promise<void>;
  updateItemQuantity(ingredientId: string, quantity: number): Promise<void>;
  getLowStockThreshold(category: IngredientCategory): number;
};

export const PantryModel = mongoose.model<PantryDocument>('Pantry', PantrySchema);