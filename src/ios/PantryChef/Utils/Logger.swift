//
// Logger.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify log file permissions and storage paths in production environment
// 2. Configure log retention policies for different environments
// 3. Set up log aggregation service integration for production
// 4. Review and adjust log level filters for production deployment

import Foundation // iOS 13.0+
import os.log // iOS 13.0+

// MARK: - LogLevel
// Requirement: Development Environment - Provides comprehensive debugging and logging tools
public enum LogLevel {
    case debug
    case info
    case warning
    case error
}

// MARK: - Logger
// Requirement: System Metrics - Implements logging infrastructure for monitoring and debugging
public final class Logger {
    // MARK: - Singleton
    public static let shared = Logger()
    
    // MARK: - Properties
    private let logger: OSLog
    private let dateFormatter: DateFormatter
    private let subsystem: String
    private let category: String
    
    // MARK: - Initialization
    private init() {
        // Initialize system logger with app bundle identifier
        self.subsystem = "com.pantrychef"
        self.category = "default"
        self.logger = OSLog(subsystem: subsystem, category: category)
        
        // Configure date formatter for ISO8601
        self.dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
    }
    
    // MARK: - Logging Methods
    
    /// Logs a message with the specified level and optional metadata
    /// - Parameters:
    ///   - level: The severity level of the log message
    ///   - message: The message to log
    ///   - file: The source file generating the log
    ///   - function: The function generating the log
    ///   - line: The line number generating the log
    public func log(
        _ level: LogLevel,
        _ message: String,
        file: String? = #file,
        function: String? = #function,
        line: Int = #line
    ) {
        // Check if logging is enabled for current environment
        guard AppConfig.shared.debugLoggingEnabled || level == .error else { return }
        
        // Format timestamp
        let timestamp = dateFormatter.string(from: Date())
        
        // Extract filename from path
        let filename = file.map { ($0 as NSString).lastPathComponent } ?? "Unknown"
        
        // Build log message with metadata
        let emoji: String
        let osLogType: OSLogType
        
        switch level {
        case .debug:
            emoji = "🔍"
            osLogType = .debug
        case .info:
            emoji = "ℹ️"
            osLogType = .info
        case .warning:
            emoji = "⚠️"
            osLogType = .error
        case .error:
            emoji = "❌"
            osLogType = .fault
        }
        
        // Format full log message
        let fullMessage = "\(emoji) [\(timestamp)] [\(level)] [\(filename):\(line)] \(function ?? ""): \(message)"
        
        // Log to system logger
        os_log("%{public}@", log: logger, type: osLogType, fullMessage)
        
        // Print to console in development/staging
        if AppConfig.shared.currentEnvironment != .production {
            print(fullMessage)
        }
    }
    
    /// Convenience method for debug level logging
    public func debug(
        _ message: String,
        file: String? = #file,
        function: String? = #function,
        line: Int = #line
    ) {
        log(.debug, message, file: file, function: function, line: line)
    }
    
    /// Convenience method for info level logging
    public func info(
        _ message: String,
        file: String? = #file,
        function: String? = #function,
        line: Int = #line
    ) {
        log(.info, message, file: file, function: function, line: line)
    }
    
    /// Convenience method for warning level logging
    public func warning(
        _ message: String,
        file: String? = #file,
        function: String? = #function,
        line: Int = #line
    ) {
        log(.warning, message, file: file, function: function, line: line)
    }
    
    /// Convenience method for error level logging
    public func error(
        _ message: String,
        file: String? = #file,
        function: String? = #function,
        line: Int = #line
    ) {
        log(.error, message, file: file, function: function, line: line)
    }
}