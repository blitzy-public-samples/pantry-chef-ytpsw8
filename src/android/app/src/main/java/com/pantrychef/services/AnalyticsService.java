package com.pantrychef.services;

import android.content.Context;
import com.google.firebase.analytics.FirebaseAnalytics; // firebase-analytics:21.5.0
import org.json.JSONObject; // API 21+
import com.pantrychef.core.Constants;
import com.pantrychef.utils.Logger;

/**
 * Service class that handles analytics tracking and reporting using Firebase Analytics.
 * 
 * HUMAN TASKS:
 * 1. Verify Firebase project configuration in google-services.json
 * 2. Enable data collection in Firebase Console
 * 3. Configure Firebase Analytics custom event limits
 * 4. Review analytics data retention policies
 * 5. Set up Firebase Analytics debug view for testing
 */
public class AnalyticsService {

    private static final String TAG = "AnalyticsService";
    private static volatile AnalyticsService INSTANCE = null;
    private static final int MAX_PROPERTY_LENGTH = 100;

    private final FirebaseAnalytics mFirebaseAnalytics;
    private final Context mContext;

    /**
     * Private constructor for singleton pattern initialization
     * Requirement: Analytics and Reporting - Firebase Analytics integration
     */
    private AnalyticsService(Context context) {
        this.mContext = context.getApplicationContext();
        this.mFirebaseAnalytics = FirebaseAnalytics.getInstance(mContext);
        
        // Set default user properties
        mFirebaseAnalytics.setUserProperty("app_version", Constants.API_VERSION);
        mFirebaseAnalytics.setUserProperty("api_version", Constants.API_VERSION);
        
        // Enable analytics collection
        mFirebaseAnalytics.setAnalyticsCollectionEnabled(true);
        
        Logger.d(TAG, "AnalyticsService initialized successfully");
    }

    /**
     * Get thread-safe singleton instance using double-checked locking
     * Requirement: Analytics and Reporting - Thread-safe singleton pattern
     */
    public static synchronized AnalyticsService getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (AnalyticsService.class) {
                if (INSTANCE == null) {
                    if (context == null) {
                        Logger.e(TAG, "Context cannot be null for AnalyticsService initialization", null);
                        throw new IllegalArgumentException("Context required for AnalyticsService initialization");
                    }
                    INSTANCE = new AnalyticsService(context);
                }
            }
        }
        return INSTANCE;
    }

    /**
     * Track screen view events with Firebase Analytics
     * Requirement: Analytics and Reporting - User interaction tracking
     */
    public void trackScreenView(String screenName) {
        if (screenName == null || screenName.isEmpty()) {
            Logger.e(TAG, "Screen name cannot be null or empty", null);
            return;
        }

        Bundle params = new Bundle();
        params.putString(FirebaseAnalytics.Param.SCREEN_NAME, screenName);
        params.putString(FirebaseAnalytics.Param.SCREEN_CLASS, screenName);
        params.putLong(FirebaseAnalytics.Param.TIMESTAMP, System.currentTimeMillis());

        mFirebaseAnalytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, params);
        Logger.d(TAG, "Screen view tracked: " + screenName);
    }

    /**
     * Track user interaction events with custom properties
     * Requirement: Analytics and Reporting - Feature usage tracking
     */
    public void trackUserAction(String action, JSONObject properties) {
        if (action == null || action.isEmpty()) {
            Logger.e(TAG, "Action cannot be null or empty", null);
            return;
        }

        Bundle params = new Bundle();
        params.putString("action_name", action);
        params.putLong(FirebaseAnalytics.Param.TIMESTAMP, System.currentTimeMillis());

        if (properties != null) {
            Iterator<String> keys = properties.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                try {
                    String value = properties.getString(key);
                    // Truncate property values to maximum length
                    if (value.length() > MAX_PROPERTY_LENGTH) {
                        value = value.substring(0, MAX_PROPERTY_LENGTH);
                    }
                    params.putString(key, value);
                } catch (JSONException e) {
                    Logger.e(TAG, "Error parsing property: " + key, e);
                }
            }
        }

        mFirebaseAnalytics.logEvent(Constants.AnalyticsEvents.RECIPE_VIEW, params);
        Logger.d(TAG, "User action tracked: " + action);
    }

    /**
     * Track error events with stack trace
     * Requirement: System Metrics - Error rate tracking
     */
    public void trackError(String errorType, String errorMessage, Throwable throwable) {
        if (errorType == null || errorType.isEmpty()) {
            Logger.e(TAG, "Error type cannot be null or empty", null);
            return;
        }

        Bundle params = new Bundle();
        params.putString("error_type", errorType);
        params.putString("error_message", errorMessage != null ? errorMessage : "");
        params.putLong(FirebaseAnalytics.Param.TIMESTAMP, System.currentTimeMillis());

        if (throwable != null) {
            params.putString("stack_trace", Log.getStackTraceString(throwable));
        }

        mFirebaseAnalytics.logEvent("app_error", params);
        Logger.e(TAG, "Error tracked: " + errorType + " - " + errorMessage, throwable);
    }

    /**
     * Track performance and usage metrics with numeric values
     * Requirement: System Metrics - Performance metrics tracking
     */
    public void trackMetric(String metricName, double value) {
        if (metricName == null || metricName.isEmpty()) {
            Logger.e(TAG, "Metric name cannot be null or empty", null);
            return;
        }

        Bundle params = new Bundle();
        params.putString("metric_name", metricName);
        params.putDouble("metric_value", value);
        params.putLong(FirebaseAnalytics.Param.TIMESTAMP, System.currentTimeMillis());

        mFirebaseAnalytics.logEvent("app_metric", params);
        Logger.d(TAG, String.format("Metric tracked: %s = %.2f", metricName, value));
    }
}