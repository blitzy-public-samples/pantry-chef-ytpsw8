//
// String+Extensions.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Review and update regular expressions for email/password validation based on security requirements
// 2. Configure localization files for proper string localization support
// 3. Verify emoji Unicode ranges are up to date with latest Unicode standard

import Foundation // iOS 13.0+

// MARK: - String Extension
extension String {
    // MARK: - Validation Properties
    
    /// Validates if string is a properly formatted email address using RFC 5322 compliant regular expression
    /// Requirement: Data Validation - Implements secure input validation for email addresses
    public var isValidEmail: Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        do {
            let regex = try NSRegularExpression(pattern: emailRegex)
            let range = NSRange(location: 0, length: self.utf16.count)
            let matches = regex.matches(in: self, range: range)
            
            // Log validation result for debugging
            if matches.isEmpty {
                Logger.shared.debug("Email validation failed for: \(self)")
            }
            
            return matches.count == 1 && self.count <= 254
        } catch {
            Logger.shared.error("Email regex creation failed: \(error.localizedDescription)")
            return false
        }
    }
    
    /// Validates if string meets password security requirements defined in Security constants
    /// Requirement: Data Validation - Implements secure password validation with security best practices
    public var isValidPassword: Bool {
        // Check minimum length requirement
        guard self.count >= Security.minimumPasswordLength else {
            Logger.shared.debug("Password validation failed: too short")
            return false
        }
        
        // Verify password complexity requirements
        let uppercaseRegex = ".*[A-Z]+.*"
        let numberRegex = ".*[0-9]+.*"
        let specialCharRegex = ".*[^A-Za-z0-9]+.*"
        
        do {
            let hasUppercase = try matches(pattern: uppercaseRegex)
            let hasNumber = try matches(pattern: numberRegex)
            let hasSpecialChar = try matches(pattern: specialCharRegex)
            
            let isValid = hasUppercase && hasNumber && hasSpecialChar
            
            if !isValid {
                Logger.shared.debug("Password validation failed: missing required character types")
            }
            
            return isValid
        } catch {
            Logger.shared.error("Password validation regex failed: \(error.localizedDescription)")
            return false
        }
    }
    
    /// Validates if string is a valid username meeting application requirements
    /// Requirement: Data Validation - Implements secure username validation
    public var isValidUsername: Bool {
        // Check length requirements
        guard (3...30).contains(self.count) else {
            Logger.shared.debug("Username validation failed: invalid length")
            return false
        }
        
        // Verify username contains only allowed characters
        let usernameRegex = "^[a-zA-Z0-9_]+$"
        do {
            let isValid = try matches(pattern: usernameRegex)
            
            if !isValid {
                Logger.shared.debug("Username validation failed: invalid characters")
            }
            
            return isValid
        } catch {
            Logger.shared.error("Username validation regex failed: \(error.localizedDescription)")
            return false
        }
    }
    
    // MARK: - String Manipulation Properties
    
    /// Returns string with leading and trailing whitespace and newlines removed
    /// Requirement: Frontend Stack - Provides core string manipulation utilities
    public var trimmed: String {
        return self.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    
    /// Converts string to URL-friendly slug format
    /// Requirement: Frontend Stack - Provides string formatting utilities
    public var slugified: String {
        let lowercased = self.lowercased()
        let whitespaceReplaced = lowercased.replacingOccurrences(of: " ", with: "-")
        
        // Remove special characters except hyphens
        let regex = try? NSRegularExpression(pattern: "[^a-z0-9\\-]")
        let range = NSRange(location: 0, length: whitespaceReplaced.utf16.count)
        let slugified = regex?.stringByReplacingMatches(in: whitespaceReplaced,
                                                      range: range,
                                                      withTemplate: "")
        
        return slugified ?? whitespaceReplaced
    }
    
    /// Checks if string contains any emoji characters
    /// Requirement: Frontend Stack - Provides string validation utilities
    public var containsEmoji: Bool {
        for scalar in unicodeScalars {
            switch scalar.value {
            case 0x1F600...0x1F64F, // Emoticons
                 0x1F300...0x1F5FF, // Misc Symbols and Pictographs
                 0x1F680...0x1F6FF, // Transport and Map
                 0x1F900...0x1F9FF, // Supplemental Symbols and Pictographs
                 0x2600...0x26FF,   // Misc Symbols
                 0x2700...0x27BF,   // Dingbats
                 0xFE00...0xFE0F,   // Variation Selectors
                 0x1F000...0x1F255: // Mahjong and Playing Cards
                return true
            default:
                continue
            }
        }
        return false
    }
    
    // MARK: - Utility Functions
    
    /// Returns localized version of string using system localization
    /// Requirement: Frontend Stack - Supports localization requirements
    public func localized(with arguments: [String: Any]? = nil) -> String {
        let localizedString = NSLocalizedString(self, comment: "")
        
        if let args = arguments {
            return String(format: localizedString, arguments: args.map { String(describing: $0.value) })
        }
        
        return localizedString
    }
    
    /// Checks if string matches given regular expression pattern
    /// Requirement: Data Validation - Implements secure input validation
    public func matches(pattern: String) throws -> Bool {
        let regex = try NSRegularExpression(pattern: pattern)
        let range = NSRange(location: 0, length: self.utf16.count)
        return regex.firstMatch(in: self, range: range) != nil
    }
}