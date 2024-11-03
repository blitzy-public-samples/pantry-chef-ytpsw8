//
// Date+Extensions.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify date formatting matches UI design requirements
// 2. Confirm timezone handling aligns with business requirements
// 3. Review expiration calculation logic with product team

import Foundation // iOS 13.0+
import Core.Constants

// MARK: - Date Extensions
// Requirement: Expiration Tracking - Support expiration date tracking for pantry items
extension Date {
    
    /// Checks if the date has passed the current date
    var isExpired: Bool {
        return Calendar.current.compare(Date(), to: self, toGranularity: .day) == .orderedDescending
    }
    
    /// Calculates number of days until expiration
    var daysUntilExpiration: Int {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: Date(), to: self)
        return components.day ?? 0
    }
    
    /// Returns formatted string for expiration date display
    var formattedExpirationDate: String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "MMM dd, yyyy"
        return dateFormatter.string(from: self)
    }
    
    /// Returns formatted timestamp string in ISO8601 format
    var formattedTimestamp: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: self)
    }
    
    /// Adds specified number of days to date
    /// - Parameter days: Number of days to add
    /// - Returns: New date with added days
    func addDays(_ days: Int) -> Date {
        let calendar = Calendar.current
        return calendar.date(byAdding: .day, value: days, to: self) ?? self
    }
    
    /// Subtracts specified number of days from date
    /// - Parameter days: Number of days to subtract
    /// - Returns: New date with subtracted days
    func subtractDays(_ days: Int) -> Date {
        return addDays(-days)
    }
    
    /// Checks if date is the same calendar day as another date
    /// - Parameter otherDate: Date to compare with
    /// - Returns: True if same calendar day, false otherwise
    func isSameDay(as otherDate: Date) -> Bool {
        let calendar = Calendar.current
        let components: Set<Calendar.Component> = [.year, .month, .day]
        let selfComponents = calendar.dateComponents(components, from: self)
        let otherComponents = calendar.dateComponents(components, from: otherDate)
        
        return selfComponents.year == otherComponents.year &&
               selfComponents.month == otherComponents.month &&
               selfComponents.day == otherComponents.day
    }
    
    /// Checks if date is within specified number of days from current date
    /// - Parameter days: Number of days to check within
    /// - Returns: True if within specified days, false otherwise
    func isWithinDays(_ days: Int) -> Bool {
        let daysRemaining = daysUntilExpiration
        return daysRemaining >= 0 && daysRemaining <= days
    }
    
    /// Creates a new date by adding the token expiration time interval
    /// - Returns: Date representing token expiration
    static func tokenExpirationDate() -> Date {
        return Date().addingTimeInterval(Security.tokenExpirationTime)
    }
}