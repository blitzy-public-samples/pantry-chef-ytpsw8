// @version mongoose ^6.5.0
// @version bcrypt ^5.0.1

import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcrypt';
import { User, Theme, MeasurementSystem, SkillLevel, DietaryRestriction, NotificationSettings } from '../interfaces/user.interface';

/**
 * HUMAN TASKS:
 * 1. Configure password strength requirements in your validation middleware
 * 2. Set up email verification service integration
 * 3. Configure notification service for user alerts
 * 4. Set up monitoring for failed login attempts
 * 5. Implement regular security audits for password hashing
 */

// Addresses requirement: User Authentication - Secure password handling
const hashPassword = async function(this: any, next: Function): Promise<void> {
  try {
    // Only hash the password if it has been modified or is new
    if (!this.isModified('passwordHash')) {
      return next();
    }

    // Generate salt and hash password using bcrypt
    // Addresses requirement: Data Security - Secure password hashing
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
};

// Addresses requirement: User Authentication - Password verification
const comparePassword = async function(this: any, candidatePassword: string): Promise<boolean> {
  try {
    // Compare provided password with stored hash
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Addresses requirement: User Profile Management - Comprehensive user data structure
const UserSchema = new Schema<User>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  passwordHash: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  profileImage: {
    type: String,
    default: null
  },
  // Addresses requirement: User Preferences - Personalized settings
  preferences: {
    type: {
      theme: {
        type: String,
        enum: Object.values(Theme),
        default: Theme.SYSTEM
      },
      measurementSystem: {
        type: String,
        enum: Object.values(MeasurementSystem),
        default: MeasurementSystem.METRIC
      },
      skillLevel: {
        type: String,
        enum: Object.values(SkillLevel),
        default: SkillLevel.BEGINNER
      },
      // Addresses requirement: User Preferences - Notification settings
      notificationSettings: {
        type: {
          expirationAlerts: {
            type: Boolean,
            default: true
          },
          lowStockAlerts: {
            type: Boolean,
            default: true
          },
          recipeRecommendations: {
            type: Boolean,
            default: true
          },
          emailNotifications: {
            type: Boolean,
            default: true
          },
          pushNotifications: {
            type: Boolean,
            default: true
          }
        },
        required: true,
        default: {
          expirationAlerts: true,
          lowStockAlerts: true,
          recipeRecommendations: true,
          emailNotifications: true,
          pushNotifications: true
        }
      }
    },
    required: true
  },
  // Addresses requirement: User Preferences - Dietary restrictions
  dietaryRestrictions: {
    type: [{
      type: String,
      enum: Object.values(DietaryRestriction)
    }],
    default: []
  },
  // References to saved recipes
  savedRecipes: {
    type: [{
      type: Schema.Types.ObjectId,
      ref: 'Recipe'
    }],
    default: []
  },
  // References to user's pantries
  pantryIds: {
    type: [{
      type: Schema.Types.ObjectId,
      ref: 'Pantry'
    }],
    default: []
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Middleware to hash password before saving
// Addresses requirement: Data Security - Password encryption
UserSchema.pre('save', hashPassword);

// Instance method to compare passwords
// Addresses requirement: User Authentication - Secure password verification
UserSchema.methods.comparePassword = comparePassword;

// Create and export the User model
const UserModel: Model<User> = mongoose.model<User>('User', UserSchema);

export default UserModel;