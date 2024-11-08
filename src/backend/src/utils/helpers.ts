// @ts-check
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import dayjs from 'dayjs';
import { cloneDeep } from 'lodash';
import { logger } from './logger';
import { ERROR_CODES } from './constants';

/*
HUMAN TASKS:
1. Configure timezone settings for dayjs in production environment
2. Set up monitoring for retry operations in CloudWatch
3. Configure currency formatting locales in production
4. Set up error tracking for failed operations
5. Configure rate limiting for retry operations
*/

// Requirement: Data Validation - Generate unique identifiers for system entities
export const generateUniqueId = (): string => {
  const uuid = uuidv4();
  logger.info('Generated unique identifier', { uuid });
  return uuid;
};

// Requirement: Data Processing - Format dates with timezone support
export const formatDate = (date: Date | string | number, format: string): string => {
  try {
    if (!date) {
      throw new Error('Invalid date input');
    }
    const formattedDate = dayjs(date).format(format);
    logger.info('Date formatted successfully', { input: date, format, result: formattedDate });
    return formattedDate;
  } catch (error: any) {
    logger.error('Error formatting date', { error, input: date, format });
    throw new Error(`${ERROR_CODES.VALIDATION_ERROR}: Invalid date format`);
  }
};

// Requirement: Security Standards - Input sanitization for XSS prevention
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    throw new Error(`${ERROR_CODES.VALIDATION_ERROR}: Input must be a string`);
  }

  // Remove dangerous HTML tags and scripts
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();

  logger.info('Input sanitized successfully', {
    originalLength: input.length,
    sanitizedLength: sanitized.length,
  });
  return sanitized;
};

// Requirement: Data Processing - Calculate expiry dates for ingredients
export const calculateExpiryDate = (ingredientType: string, storageType: string): Date => {
  try {
    // Base expiry durations in days for different ingredient types
    const baseExpiry: { [key: string]: number } = {
      'fresh-produce': 7,
      dairy: 14,
      meat: 5,
      frozen: 90,
      pantry: 180,
      spices: 365,
    };

    // Storage type modifiers (multipliers)
    const storageModifiers: { [key: string]: number } = {
      refrigerated: 1,
      frozen: 3,
      'room-temperature': 0.7,
    };

    const baseDays = baseExpiry[ingredientType] || 7;
    const modifier = storageModifiers[storageType] || 1;
    const expiryDate = dayjs()
      .add(baseDays * modifier, 'day')
      .toDate();

    logger.info('Calculated expiry date', { ingredientType, storageType, expiryDate });
    return expiryDate;
  } catch (error: any) {
    logger.error('Error calculating expiry date', { error, ingredientType, storageType });
    throw new Error(`${ERROR_CODES.VALIDATION_ERROR}: Invalid ingredient or storage type`);
  }
};

// Requirement: Data Processing - Format currency with locale support
export const formatCurrency = (amount: number, currency: string): string => {
  try {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Invalid amount');
    }

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const formatted = formatter.format(amount);
    logger.info('Currency formatted successfully', { amount, currency, formatted });
    return formatted;
  } catch (error: any) {
    logger.error('Error formatting currency', { error, amount, currency });
    throw new Error(`${ERROR_CODES.VALIDATION_ERROR}: Invalid currency format`);
  }
};

// Requirement: Data Processing - Deep clone objects safely
export const deepClone = <T>(data: T): T => {
  try {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const cloned = cloneDeep(data);
    logger.info('Object cloned successfully', {
      originalType: typeof data,
      isArray: Array.isArray(data),
    });
    return cloned;
  } catch (error: any) {
    logger.error('Error cloning object', { error });
    throw new Error(`${ERROR_CODES.INTERNAL_SERVER_ERROR}: Failed to clone object`);
  }
};

// Requirement: Error Handling - Retry failed operations with exponential backoff
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T | undefined> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error as Error;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);

      logger.error('Operation failed, retrying', {
        attempt,
        maxRetries,
        delay,
        error: lastError.message,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (lastError) {
    logger.error('Operation failed after max retries', {
      maxRetries,
      error: lastError.message,
    });

    throw new Error(
      `${ERROR_CODES.INTERNAL_SERVER_ERROR}: Operation failed after ${maxRetries} retries: ${lastError.message}`
    );
  }
};
