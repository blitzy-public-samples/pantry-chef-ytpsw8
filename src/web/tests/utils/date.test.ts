// @jest version: ^29.0.0
import { describe, it, expect } from 'jest';
import {
  formatDate,
  calculateDaysUntilExpiration,
  createDateRange,
  getExpirationAlertType,
  addDaysToDate
} from '../../src/utils/date';
import { ExpirationAlertType } from '../../src/interfaces/inventory.interface';

// Requirement: Digital pantry management with expiration tracking
describe('formatDate', () => {
  it('should format valid dates with different format strings', () => {
    const testDate = new Date('2023-12-25');
    expect(formatDate(testDate)).toBe('2023-12-25');
    expect(formatDate(testDate, 'MM/dd/yyyy')).toBe('12/25/2023');
    expect(formatDate(testDate, 'MMMM dd, yyyy')).toBe('December 25, 2023');
  });

  it('should return empty string for invalid dates', () => {
    const invalidDate = new Date('invalid');
    expect(formatDate(invalidDate)).toBe('');
  });

  it("should fallback to 'yyyy-MM-dd' format when given invalid format string", () => {
    const testDate = new Date('2023-12-25');
    expect(formatDate(testDate, 'invalid')).toBe('2023-12-25');
  });

  it('should handle null or undefined inputs', () => {
    expect(formatDate(null as unknown as Date)).toBe('');
    expect(formatDate(undefined as unknown as Date)).toBe('');
  });
});

// Requirement: Digital pantry management with expiration tracking
describe('calculateDaysUntilExpiration', () => {
  beforeEach(() => {
    // Mock current date to ensure consistent test results
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-12-25'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should calculate positive days for future dates', () => {
    const futureDate = new Date('2024-01-01');
    expect(calculateDaysUntilExpiration(futureDate)).toBe(7);
  });

  it('should calculate negative days for past dates', () => {
    const pastDate = new Date('2023-12-20');
    expect(calculateDaysUntilExpiration(pastDate)).toBe(-5);
  });

  it('should return 0 for current date', () => {
    const currentDate = new Date('2023-12-25');
    expect(calculateDaysUntilExpiration(currentDate)).toBe(0);
  });

  it('should throw error for invalid dates', () => {
    const invalidDate = new Date('invalid');
    expect(() => calculateDaysUntilExpiration(invalidDate)).toThrow('Invalid expiration date provided');
  });
});

// Requirement: Analytics Date Handling - Date handling for analytics events and metrics
describe('createDateRange', () => {
  it('should create valid DateRange with chronological dates', () => {
    const startDate = new Date('2023-12-01');
    const endDate = new Date('2023-12-31');
    const range = createDateRange(startDate, endDate);
    expect(range).toEqual({ startDate, endDate });
  });

  it('should throw error when end date is before start date', () => {
    const startDate = new Date('2023-12-31');
    const endDate = new Date('2023-12-01');
    expect(() => createDateRange(startDate, endDate))
      .toThrow('End date must be after start date');
  });

  it('should accept same start and end dates', () => {
    const date = new Date('2023-12-25');
    const range = createDateRange(date, date);
    expect(range).toEqual({ startDate: date, endDate: date });
  });

  it('should throw error for invalid date inputs', () => {
    const invalidDate = new Date('invalid');
    const validDate = new Date('2023-12-25');
    expect(() => createDateRange(invalidDate, validDate))
      .toThrow('Invalid date(s) provided for date range');
    expect(() => createDateRange(validDate, invalidDate))
      .toThrow('Invalid date(s) provided for date range');
  });
});

// Requirement: Digital pantry management with expiration tracking
describe('getExpirationAlertType', () => {
  it('should return EXPIRED for negative days', () => {
    expect(getExpirationAlertType(-1)).toBe(ExpirationAlertType.EXPIRED);
    expect(getExpirationAlertType(-7)).toBe(ExpirationAlertType.EXPIRED);
  });

  it('should return EXPIRES_SOON for days <= 7', () => {
    expect(getExpirationAlertType(7)).toBe(ExpirationAlertType.EXPIRES_SOON);
    expect(getExpirationAlertType(3)).toBe(ExpirationAlertType.EXPIRES_SOON);
    expect(getExpirationAlertType(0)).toBe(ExpirationAlertType.EXPIRES_SOON);
  });

  it('should return null for days > 7', () => {
    expect(getExpirationAlertType(8)).toBeNull();
    expect(getExpirationAlertType(30)).toBeNull();
  });

  it('should handle edge cases around 7-day threshold', () => {
    expect(getExpirationAlertType(7)).toBe(ExpirationAlertType.EXPIRES_SOON);
    expect(getExpirationAlertType(7.5)).toBeNull();
    expect(getExpirationAlertType(6.9)).toBe(ExpirationAlertType.EXPIRES_SOON);
  });
});

// Requirement: Analytics Date Handling - Date handling for analytics events and metrics
describe('addDaysToDate', () => {
  it('should add positive number of days', () => {
    const startDate = new Date('2023-12-25');
    const result = addDaysToDate(startDate, 5);
    expect(formatDate(result)).toBe('2023-12-30');
  });

  it('should add negative number of days', () => {
    const startDate = new Date('2023-12-25');
    const result = addDaysToDate(startDate, -5);
    expect(formatDate(result)).toBe('2023-12-20');
  });

  it('should return same date when adding zero days', () => {
    const date = new Date('2023-12-25');
    const result = addDaysToDate(date, 0);
    expect(formatDate(result)).toBe('2023-12-25');
  });

  it('should throw error for invalid date input', () => {
    const invalidDate = new Date('invalid');
    expect(() => addDaysToDate(invalidDate, 5))
      .toThrow('Invalid date provided');
  });
});