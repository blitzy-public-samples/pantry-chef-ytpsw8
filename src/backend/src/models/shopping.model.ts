// @version mongoose ^6.0.0

/**
 * HUMAN TASKS:
 * 1. Confirm shopping list item categories align with the inventory/ingredient
 *    categories used by the pantry and recipe domains for consistent classification.
 * 2. Verify the iOS `isPurchased` <-> `checked` field mapping is reconciled in the iOS
 *    serialization layer so cross-device sync payloads stay contract-consistent.
 * 3. Confirm the MongoDB `userId` index is provisioned in every environment for
 *    efficient per-user shopping-list query performance.
 */

import mongoose, { Schema, Document } from 'mongoose';
import { IShoppingList, IShoppingListItem } from '../interfaces/shopping.interface';

/**
 * Embedded sub-schema for an individual shopping list item.
 *
 * Field names mirror the canonical `IShoppingListItem` contract field-for-field
 * (shared with the web `ShoppingListItem` interface) so the backend, web, and iOS
 * clients serialize against a single source of truth. The iOS-local `isPurchased`
 * field maps onto the canonical `checked` field in the iOS serialization layer.
 *
 * The interface `id: string` field is intentionally NOT declared here; it is
 * satisfied by Mongoose's built-in sub-document `_id`/`id` virtual combined with
 * the `& Document` generic on the parent model.
 *
 * Addresses requirement: Shopping List Management - Item tracking and categorization
 */
const ShoppingListItemSchema = new Schema<IShoppingListItem>({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: String,
  category: String,
  checked: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  recipeId: String,
  recipeName: String,
});

/**
 * Top-level shopping list schema, scoped to an authenticated user and persisted
 * server-side for cross-device synchronization.
 *
 * Items are embedded via `ShoppingListItemSchema`. The optional `generationOptions`
 * sub-document persists the settings used to generate a list from recipes (recipe
 * selection, serving scaling, pantry inventory exclusion, and duplicate merging).
 *
 * Timestamps are managed exclusively by Mongoose's `{ timestamps: true }` option,
 * which auto-populates `createdAt`/`updatedAt` as `Date` values and satisfies the
 * `IShoppingList.createdAt`/`updatedAt` typing — no hand-rolled timestamp fields
 * and no manual pre-save mutation hook are used.
 *
 * Addresses requirement: Shopping List Generation - List management with timestamps
 */
const ShoppingListSchema = new Schema<IShoppingList>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, default: 'My Shopping List' },
    items: [ShoppingListItemSchema],
    generationOptions: {
      recipeIds: [String],
      servings: Number,
      excludeInventoryItems: Boolean,
      mergeDuplicates: Boolean,
    },
  },
  { timestamps: true }
);

// Create index for efficient per-user querying
ShoppingListSchema.index({ userId: 1 });

/**
 * Compiled Mongoose model for the `ShoppingList` collection.
 *
 * Exported directly (there is no `models/index.ts` barrel) and consumed by
 * `src/backend/src/services/shopping.service.ts` via
 * `import { ShoppingModel } from '../models/shopping.model'`. The `& Document`
 * generic exposes the document `id`/`_id` virtuals and standard model statics
 * (find, findOne, findById, create, findOneAndUpdate, findByIdAndUpdate,
 * findByIdAndDelete, deleteOne) used by the shopping service layer.
 */
export const ShoppingModel = mongoose.model<IShoppingList & Document>(
  'ShoppingList',
  ShoppingListSchema
);
