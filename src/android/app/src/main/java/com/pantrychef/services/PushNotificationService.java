package com.pantrychef.services;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService; // firebase-messaging:23.0.0
import com.google.firebase.messaging.RemoteMessage; // firebase-messaging:23.0.0

import com.pantrychef.MainActivity;
import com.pantrychef.R;
import com.pantrychef.core.Constants.PreferenceKeys;
import com.pantrychef.utils.Logger;

import java.util.Map;

/**
 * HUMAN TASKS:
 * 1. Add google-services.json file to app directory
 * 2. Configure Firebase Cloud Messaging in Firebase Console
 * 3. Update notification icons in res/drawable folders
 * 4. Verify notification sound files in res/raw if custom sounds are used
 * 5. Test deep linking configuration for notification actions
 */
public class PushNotificationService extends FirebaseMessagingService {

    private static final String TAG = "PushNotificationService";
    private static final String CHANNEL_ID = "PantryChef_Channel";
    private static final String CHANNEL_NAME = "PantryChef Notifications";
    private static final String CHANNEL_DESCRIPTION = "Notifications for recipes, pantry updates and alerts";
    private static final int NOTIFICATION_ID = 1000;

    private NotificationManager notificationManager;
    private SharedPreferences sharedPreferences;

    @Override
    public void onCreate() {
        // Requirement: Mobile Client Architecture - Implements native Android service for real-time communication
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        sharedPreferences = getSharedPreferences(PreferenceKeys.NOTIFICATIONS_ENABLED, Context.MODE_PRIVATE);
        createNotificationChannel();
        Logger.d(TAG, "PushNotificationService created");
    }

    @Override
    public void onNewToken(@NonNull String token) {
        // Requirement: Real-time Communication - Implements push notification handling using Firebase Cloud Messaging
        super.onNewToken(token);
        Logger.d(TAG, "New FCM token received");

        // Store the token in shared preferences
        sharedPreferences.edit()
            .putString(PreferenceKeys.DEVICE_TOKEN, token)
            .apply();

        // TODO: Send token to backend server
        // This should be implemented according to your backend API specification
        sendRegistrationToServer(token);
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        // Requirement: Push Notifications - Integrates Firebase Cloud Messaging for push notification delivery
        super.onMessageReceived(remoteMessage);
        Logger.d(TAG, "Push notification received");

        // Check if notifications are enabled
        if (!sharedPreferences.getBoolean(PreferenceKeys.NOTIFICATIONS_ENABLED, true)) {
            Logger.d(TAG, "Notifications are disabled by user");
            return;
        }

        // Handle notification message
        if (remoteMessage.getNotification() != null) {
            String title = remoteMessage.getNotification().getTitle();
            String message = remoteMessage.getNotification().getBody();
            Map<String, String> data = remoteMessage.getData();
            
            showNotification(title, message, data);
        }
    }

    private void createNotificationChannel() {
        // Create notification channel for Android O and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_DEFAULT
            );
            
            channel.setDescription(CHANNEL_DESCRIPTION);
            channel.enableLights(true);
            channel.enableVibration(true);
            
            // Register channel with system
            notificationManager.createNotificationChannel(channel);
            Logger.d(TAG, "Notification channel created");
        }
    }

    protected void showNotification(String title, String message, Map<String, String> data) {
        Intent intent = new Intent(this, MainActivity.class);
        
        // Add data as extras for deep linking
        if (data != null) {
            for (Map.Entry<String, String> entry : data.entrySet()) {
                intent.putExtra(entry.getKey(), entry.getValue());
            }
        }
        
        // Create pending intent for notification click
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        // Get default notification sound
        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        // Build notification
        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.notification_icon)
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent);

        // Show notification
        notificationManager.notify(NOTIFICATION_ID, notificationBuilder.build());
        Logger.d(TAG, "Notification displayed: " + title);
    }

    private void sendRegistrationToServer(String token) {
        // TODO: Implement token registration with backend
        // This should be implemented using your API client
        try {
            // Make API call to register token
            Logger.d(TAG, "Sending FCM token to server");
        } catch (Exception e) {
            Logger.e(TAG, "Failed to send FCM token to server", e);
        }
    }
}