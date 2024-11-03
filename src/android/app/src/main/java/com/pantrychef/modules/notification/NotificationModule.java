package com.pantrychef.modules.notification;

// React Native imports - version 0.70.0
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

// AndroidX imports - version 1.7.0
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

// Android core imports
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.graphics.Color;

// Internal imports
import com.pantrychef.utils.Logger;

/**
 * HUMAN TASKS:
 * 1. Add notification icon resource to res/drawable/notification_icon.png
 * 2. Configure notification permissions in AndroidManifest.xml
 * 3. Review notification channel settings with UX team
 * 4. Test notifications on different Android versions (8.0+)
 */
public class NotificationModule extends ReactContextBaseJavaModule {

    private static final String CHANNEL_ID = "pantrychef_notifications";
    private static final String CHANNEL_NAME = "PantryChef Notifications";
    private static final String TAG = "NotificationModule";

    private final NotificationManagerCompat notificationManager;
    private final Logger logger;

    /**
     * Constructor initializes notification module with React context
     * Requirement: Push Notifications - Native notification setup
     */
    public NotificationModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.notificationManager = NotificationManagerCompat.from(reactContext);
        this.logger = Logger.getInstance();
        createNotificationChannel();
        logger.d(TAG, "NotificationModule initialized successfully");
    }

    /**
     * Returns module name for React Native bridge registration
     * Requirement: Push Notifications - Module registration
     */
    @Override
    public String getName() {
        return "NotificationModule";
    }

    /**
     * Creates notification channel for Android O and above
     * Requirement: Push Notifications - Android O compatibility
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setLightColor(Color.BLUE);
            channel.setDescription("PantryChef notifications for ingredient expiration alerts and recipe suggestions");

            NotificationManager notificationManager = 
                (NotificationManager) getReactApplicationContext().getSystemService(Context.NOTIFICATION_SERVICE);
            
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
                logger.d(TAG, "Notification channel created successfully");
            }
        }
    }

    /**
     * Displays a local notification with specified title and message
     * Requirement: Real-time Communication - Ingredient expiration alerts
     */
    @ReactMethod
    public void showLocalNotification(String title, String message, Promise promise) {
        try {
            NotificationCompat.Builder builder = new NotificationCompat.Builder(getReactApplicationContext(), CHANNEL_ID)
                .setSmallIcon(getReactApplicationContext().getResources()
                    .getIdentifier("notification_icon", "drawable", getReactApplicationContext().getPackageName()))
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);

            int notificationId = (int) System.currentTimeMillis();
            notificationManager.notify(notificationId, builder.build());
            
            logger.d(TAG, "Local notification displayed: " + title);
            promise.resolve(notificationId);
            
        } catch (Exception e) {
            logger.e(TAG, "Failed to show notification", e);
            promise.reject("NOTIFICATION_ERROR", "Failed to show notification: " + e.getMessage());
        }
    }

    /**
     * Cancels a specific notification by ID
     * Requirement: Real-time Communication - Notification management
     */
    @ReactMethod
    public void cancelNotification(int notificationId, Promise promise) {
        try {
            notificationManager.cancel(notificationId);
            logger.d(TAG, "Notification cancelled: " + notificationId);
            promise.resolve(null);
            
        } catch (Exception e) {
            logger.e(TAG, "Failed to cancel notification", e);
            promise.reject("NOTIFICATION_ERROR", "Failed to cancel notification: " + e.getMessage());
        }
    }

    /**
     * Cancels all active notifications from the app
     * Requirement: Real-time Communication - Notification cleanup
     */
    @ReactMethod
    public void cancelAllNotifications(Promise promise) {
        try {
            notificationManager.cancelAll();
            logger.d(TAG, "All notifications cancelled");
            promise.resolve(null);
            
        } catch (Exception e) {
            logger.e(TAG, "Failed to cancel all notifications", e);
            promise.reject("NOTIFICATION_ERROR", "Failed to cancel all notifications: " + e.getMessage());
        }
    }
}