package com.pantrychef.utils;

import android.util.Log; // API 21+
import java.text.SimpleDateFormat; // Java 8+
import java.util.Date; // Java 8+
import com.pantrychef.core.AppConfig;
import com.pantrychef.core.Constants;

/**
 * Utility class that provides centralized logging functionality for the PantryChef Android application.
 *
 * HUMAN TASKS:
 * 1. Verify BuildConfig.DEBUG flag is properly configured in build.gradle
 * 2. Ensure ProGuard/R8 rules preserve logging in release builds if needed
 * 3. Configure external logging services integration if required
 * 4. Review log retention policies with security team
 */
public class Logger {

    private static final String TAG = "PantryChef";
    private static final boolean DEBUG = AppConfig.getInstance(null).isDebugBuild();
    private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS");
    private static volatile Logger instance = null;

    private final SimpleDateFormat dateFormat;

    /**
     * Private constructor to enforce singleton pattern
     * Requirement: Development Environment - Logging tools configuration
     */
    private Logger() {
        this.dateFormat = DATE_FORMAT;
        // Configure thread-safe date formatter
        this.dateFormat.setLenient(false);
    }

    /**
     * Returns singleton instance with double-checked locking pattern
     * Requirement: System Monitoring - Thread-safe logging initialization
     */
    public static Logger getInstance() {
        if (instance == null) {
            synchronized (Logger.class) {
                if (instance == null) {
                    instance = new Logger();
                }
            }
        }
        return instance;
    }

    /**
     * Log debug message with timestamp
     * Requirement: Development Environment - Debug logging
     */
    public static void d(String tag, String message) {
        if (DEBUG) {
            Log.d(TAG, formatMessage(tag, message));
        }
    }

    /**
     * Log info message with timestamp
     * Requirement: System Monitoring - Application logging
     */
    public static void i(String tag, String message) {
        Log.i(TAG, formatMessage(tag, message));
    }

    /**
     * Log warning message with timestamp
     * Requirement: Security Logging - Security monitoring
     */
    public static void w(String tag, String message) {
        Log.w(TAG, formatMessage(tag, message));
    }

    /**
     * Log error message with timestamp and stack trace
     * Requirement: Security Logging - Security compliance
     */
    public static void e(String tag, String message, Throwable throwable) {
        String formattedMessage = formatMessage(tag, message);
        if (throwable != null) {
            formattedMessage += "\nException: " + throwable.getClass().getName() + 
                              "\nMessage: " + throwable.getMessage() + 
                              "\nStack trace: " + Log.getStackTraceString(throwable);
        }
        Log.e(TAG, formattedMessage);
    }

    /**
     * Format log message with consistent pattern including timestamp
     * Requirement: System Monitoring - Formatted logging output
     */
    private static String formatMessage(String tag, String message) {
        return String.format("[%s][%s][API-%s] %s",
            getInstance().dateFormat.format(new Date()),
            tag,
            Constants.API_VERSION,
            message
        );
    }
}