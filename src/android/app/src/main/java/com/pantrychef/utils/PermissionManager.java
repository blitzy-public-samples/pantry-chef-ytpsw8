package com.pantrychef.utils;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import java.lang.ref.WeakReference;
import com.pantrychef.core.Constants;

/**
 * Utility class that manages Android runtime permissions for critical features.
 *
 * HUMAN TASKS:
 * 1. Verify manifest includes all required permission declarations
 * 2. Configure permission rationale strings in strings.xml
 * 3. Review permission request codes with security team
 * 4. Ensure proper permission handling in Activity lifecycle
 */
public class PermissionManager {

    private static final String TAG = "PermissionManager";
    private static final int CAMERA_PERMISSION_REQUEST_CODE = 100;
    private static final int STORAGE_PERMISSION_REQUEST_CODE = 101;
    private static volatile PermissionManager instance = null;

    private WeakReference<Activity> activity;
    private PermissionCallback callback;

    /**
     * Interface for permission request callbacks
     * Requirement: Security Protocols - Access Control Measures
     */
    public interface PermissionCallback {
        void onPermissionGranted(String permission);
        void onPermissionDenied(String permission);
    }

    /**
     * Private constructor that takes an Activity reference
     * Requirement: Security Protocols - Access Control Measures
     */
    private PermissionManager(Activity activity) {
        this.activity = new WeakReference<>(activity);
        Logger.d(TAG, String.format("[API-%s] PermissionManager initialized", Constants.API_VERSION));
    }

    /**
     * Get singleton instance of PermissionManager with double-checked locking
     * Requirement: Security Protocols - Access Control Measures
     */
    public static PermissionManager getInstance(Activity activity) {
        if (instance == null) {
            synchronized (PermissionManager.class) {
                if (instance == null) {
                    instance = new PermissionManager(activity);
                } else {
                    instance.activity = new WeakReference<>(activity);
                }
            }
        } else {
            instance.activity = new WeakReference<>(activity);
        }
        return instance;
    }

    /**
     * Check if camera permission is granted
     * Requirement: Image Recognition - Camera access for ingredient recognition
     */
    public boolean checkCameraPermission() {
        Activity currentActivity = activity.get();
        if (currentActivity == null) {
            Logger.e(TAG, "Activity reference is null", null);
            return false;
        }

        boolean isGranted = ContextCompat.checkSelfPermission(currentActivity, 
            Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        
        Logger.d(TAG, "Camera permission status: " + isGranted);
        return isGranted;
    }

    /**
     * Request camera permission from user
     * Requirement: Image Recognition - Camera access for ingredient recognition
     */
    public void requestCameraPermission(PermissionCallback callback) {
        Activity currentActivity = activity.get();
        if (currentActivity == null) {
            Logger.e(TAG, "Activity reference is null", null);
            return;
        }

        this.callback = callback;

        if (ActivityCompat.shouldShowRequestPermissionRationale(currentActivity, 
            Manifest.permission.CAMERA)) {
            Logger.d(TAG, "Showing camera permission rationale");
            // Activity should show permission rationale UI
        }

        ActivityCompat.requestPermissions(currentActivity,
            new String[]{Manifest.permission.CAMERA},
            CAMERA_PERMISSION_REQUEST_CODE);
        
        Logger.d(TAG, "Camera permission requested");
    }

    /**
     * Check if storage permission is granted
     * Requirement: Data Security - Storage access for caching
     */
    public boolean checkStoragePermission() {
        Activity currentActivity = activity.get();
        if (currentActivity == null) {
            Logger.e(TAG, "Activity reference is null", null);
            return false;
        }

        boolean isGranted = ContextCompat.checkSelfPermission(currentActivity, 
            Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        
        Logger.d(TAG, "Storage permission status: " + isGranted);
        return isGranted;
    }

    /**
     * Request storage permission from user
     * Requirement: Data Security - Storage access for caching
     */
    public void requestStoragePermission(PermissionCallback callback) {
        Activity currentActivity = activity.get();
        if (currentActivity == null) {
            Logger.e(TAG, "Activity reference is null", null);
            return;
        }

        this.callback = callback;

        if (ActivityCompat.shouldShowRequestPermissionRationale(currentActivity, 
            Manifest.permission.WRITE_EXTERNAL_STORAGE)) {
            Logger.d(TAG, "Showing storage permission rationale");
            // Activity should show permission rationale UI
        }

        ActivityCompat.requestPermissions(currentActivity,
            new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE},
            STORAGE_PERMISSION_REQUEST_CODE);
        
        Logger.d(TAG, "Storage permission requested");
    }

    /**
     * Handle permission request results
     * Requirement: Security Protocols - Access Control Measures
     */
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (callback == null) {
            Logger.w(TAG, "Permission callback is null");
            return;
        }

        if (grantResults.length == 0) {
            Logger.e(TAG, "Permission result array is empty", null);
            return;
        }

        switch (requestCode) {
            case CAMERA_PERMISSION_REQUEST_CODE:
                if (grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Logger.d(TAG, "Camera permission granted");
                    callback.onPermissionGranted(Manifest.permission.CAMERA);
                } else {
                    Logger.w(TAG, "Camera permission denied");
                    callback.onPermissionDenied(Manifest.permission.CAMERA);
                }
                break;

            case STORAGE_PERMISSION_REQUEST_CODE:
                if (grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Logger.d(TAG, "Storage permission granted");
                    callback.onPermissionGranted(Manifest.permission.WRITE_EXTERNAL_STORAGE);
                } else {
                    Logger.w(TAG, "Storage permission denied");
                    callback.onPermissionDenied(Manifest.permission.WRITE_EXTERNAL_STORAGE);
                }
                break;

            default:
                Logger.w(TAG, "Unknown permission request code: " + requestCode);
                break;
        }

        // Clear callback reference to prevent memory leaks
        callback = null;
    }
}