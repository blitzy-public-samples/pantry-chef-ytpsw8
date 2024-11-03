/**
 * HUMAN TASKS:
 * 1. Verify date format strings match UI design requirements
 * 2. Confirm expiration alert thresholds with product team
 * 3. Set up date localization configuration if needed
 * 4. Configure timezone handling based on deployment regions
 */

// External date utility imports from date-fns v2.30.0
import { format, differenceInDays, addDays, isValid } from 'date-fns';

// Internal type imports
import { DateRange } from '../interfaces/analytics.interface';
import { ExpirationAlert, ExpirationAlertType } from '../interfaces/inventory.interface';

/**
 * Formats a date into a standardized string representation
 * Requirement: Digital pantry management with expiration tracking
 * 
 * @param date The date to format
 * @param formatString Optional custom format string
 * @returns Formatted date string or empty string if date is invalid
 */
export const formatDate = (date: Date, formatString: string = 'yyyy-MM-dd'): string => {
  if (!isValid(date)) {
    return '';
  }
  try {
    return format(date, formatString);
  } catch (error) {
    console.error('Date formatting error:', error);
    return format(date, 'yyyy-MM-dd');
  }
};

/**
 * Calculates the number of days until an item expires
 * Requirement: Digital pantry management with expiration tracking
 * 
 * @param expirationDate The expiration date to check against
 * @returns Number of days until expiration (negative if expired)
 */
export const calculateDaysUntilExpiration = (expirationDate: Date): number => {
  if (!isValid(expirationDate)) {
    throw new Error('Invalid expiration date provided');
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInDays(expirationDate, today);
};

/**
 * Creates a validated DateRange object for analytics queries
 * Requirement: Analytics Date Handling - Date handling for analytics events and metrics
 * 
 * @param startDate Start of the date range
 * @param endDate End of the date range
 * @returns DateRange object with validated dates
 * @throws Error if dates are invalid or in wrong order
 */
export const createDateRange = (startDate: Date, endDate: Date): DateRange => {
  if (!isValid(startDate) || !isValid(endDate)) {
    throw new Error('Invalid date(s) provided for date range');
  }

  if (differenceInDays(endDate, startDate) < 0) {
    throw new Error('End date must be after start date');
  }

  return {
    startDate,
    endDate
  };
};

/**
 * Determines the type of expiration alert based on days until expiration
 * Requirement: Digital pantry management with expiration tracking
 * 
 * @param daysUntilExpiration Number of days until item expires
 * @returns ExpirationAlertType or null if no alert needed
 */
export const getExpirationAlertType = (daysUntilExpiration: number): ExpirationAlertType | null => {
  if (daysUntilExpiration < 0) {
    return ExpirationAlertType.EXPIRED;
  }
  
  if (daysUntilExpiration <= 7) {
    return ExpirationAlertType.EXPIRES_SOON;
  }
  
  return null;
};

/**
 * Adds a specified number of days to a date
 * Requirement: Analytics Date Handling - Date handling for analytics events and metrics
 * 
 * @param date Base date to add to
 * @param days Number of days to add
 * @returns New date with days added
 * @throws Error if input date is invalid
 */
export const addDaysToDate = (date: Date, days: number): Date => {
  if (!isValid(date)) {
    throw new Error('Invalid date provided');
  }
  
  return addDays(date, days);
};