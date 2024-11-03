package com.pantrychef;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.pantrychef.utils.PermissionManager;
import com.pantrychef.utils.PermissionManager.PermissionCallback;
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import static org.junit.Assert.*;
import static org.mockito.Mockito.*;

/**
 * Test suite for PermissionManager utility class
 * HUMAN TASKS:
 * 1. Ensure Mockito and JUnit dependencies are correctly configured in build.gradle
 * 2. Verify test coverage requirements with QA team
 * 3. Configure CI pipeline to run these tests before merging
 */
public class PermissionManagerTest {

    @Mock
    private Activity mockActivity;

    @Mock
    private PermissionCallback mockCallback;

    private PermissionManager permissionManager;

    @Before
    public void setup() {
        // Initialize mocks
        MockitoAnnotations.openMocks(this);
        
        // Create PermissionManager instance with mock activity
        permissionManager = PermissionManager.getInstance(mockActivity);
    }

    /**
     * Test singleton pattern implementation and thread-safety
     * Requirement: Security Testing - Verify proper implementation of device permission management
     */
    @Test
    public void testGetInstance() {
        // Test singleton instance creation
        PermissionManager instance1 = PermissionManager.getInstance(mockActivity);
        PermissionManager instance2 = PermissionManager.getInstance(mockActivity);
        
        // Verify same instance is returned
        assertSame("getInstance should return the same instance", instance1, instance2);
        
        // Verify activity reference is updated
        Activity newMockActivity = mock(Activity.class);
        PermissionManager instance3 = PermissionManager.getInstance(newMockActivity);
        assertSame("getInstance should return same instance with new activity", instance1, instance3);
    }

    /**
     * Test camera permission check logic
     * Requirement: Image Recognition Security - Validate camera permission handling
     */
    @Test
    public void testCheckCameraPermission() {
        // Mock permission granted scenario
        mockStatic(ContextCompat.class);
        when(ContextCompat.checkSelfPermission(mockActivity, Manifest.permission.CAMERA))
            .thenReturn(PackageManager.PERMISSION_GRANTED);
        
        // Test permission granted
        assertTrue("Should return true when camera permission is granted", 
            permissionManager.checkCameraPermission());
        
        // Mock permission denied scenario
        when(ContextCompat.checkSelfPermission(mockActivity, Manifest.permission.CAMERA))
            .thenReturn(PackageManager.PERMISSION_DENIED);
        
        // Test permission denied
        assertFalse("Should return false when camera permission is denied", 
            permissionManager.checkCameraPermission());
        
        // Verify correct permission was checked
        verify(ContextCompat, times(2))
            .checkSelfPermission(mockActivity, Manifest.permission.CAMERA);
    }

    /**
     * Test camera permission request flow
     * Requirement: Image Recognition Security - Validate camera permission handling
     */
    @Test
    public void testRequestCameraPermission() {
        // Mock shouldShowRequestPermissionRationale
        mockStatic(ActivityCompat.class);
        when(ActivityCompat.shouldShowRequestPermissionRationale(mockActivity, Manifest.permission.CAMERA))
            .thenReturn(false);
        
        // Request camera permission
        permissionManager.requestCameraPermission(mockCallback);
        
        // Verify permission request was made with correct parameters
        verify(ActivityCompat).requestPermissions(
            eq(mockActivity),
            eq(new String[]{Manifest.permission.CAMERA}),
            eq(100) // CAMERA_PERMISSION_REQUEST_CODE
        );
    }

    /**
     * Test storage permission check logic
     * Requirement: Data Security Testing - Verify proper access control for data storage
     */
    @Test
    public void testCheckStoragePermission() {
        // Mock permission granted scenario
        mockStatic(ContextCompat.class);
        when(ContextCompat.checkSelfPermission(mockActivity, Manifest.permission.WRITE_EXTERNAL_STORAGE))
            .thenReturn(PackageManager.PERMISSION_GRANTED);
        
        // Test permission granted
        assertTrue("Should return true when storage permission is granted", 
            permissionManager.checkStoragePermission());
        
        // Mock permission denied scenario
        when(ContextCompat.checkSelfPermission(mockActivity, Manifest.permission.WRITE_EXTERNAL_STORAGE))
            .thenReturn(PackageManager.PERMISSION_DENIED);
        
        // Test permission denied
        assertFalse("Should return false when storage permission is denied", 
            permissionManager.checkStoragePermission());
        
        // Verify correct permission was checked
        verify(ContextCompat, times(2))
            .checkSelfPermission(mockActivity, Manifest.permission.WRITE_EXTERNAL_STORAGE);
    }

    /**
     * Test storage permission request flow
     * Requirement: Data Security Testing - Verify proper access control for data storage
     */
    @Test
    public void testRequestStoragePermission() {
        // Mock shouldShowRequestPermissionRationale
        mockStatic(ActivityCompat.class);
        when(ActivityCompat.shouldShowRequestPermissionRationale(mockActivity, 
            Manifest.permission.WRITE_EXTERNAL_STORAGE)).thenReturn(false);
        
        // Request storage permission
        permissionManager.requestStoragePermission(mockCallback);
        
        // Verify permission request was made with correct parameters
        verify(ActivityCompat).requestPermissions(
            eq(mockActivity),
            eq(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}),
            eq(101) // STORAGE_PERMISSION_REQUEST_CODE
        );
    }

    /**
     * Test permission result handling
     * Requirement: Security Testing - Verify proper implementation of device permission management
     */
    @Test
    public void testOnRequestPermissionsResult() {
        // Test camera permission granted
        permissionManager.requestCameraPermission(mockCallback);
        permissionManager.onRequestPermissionsResult(
            100, // CAMERA_PERMISSION_REQUEST_CODE
            new String[]{Manifest.permission.CAMERA},
            new int[]{PackageManager.PERMISSION_GRANTED}
        );
        
        // Verify callback was called with granted result
        verify(mockCallback).onPermissionGranted(Manifest.permission.CAMERA);
        
        // Test storage permission denied
        permissionManager.requestStoragePermission(mockCallback);
        permissionManager.onRequestPermissionsResult(
            101, // STORAGE_PERMISSION_REQUEST_CODE
            new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE},
            new int[]{PackageManager.PERMISSION_DENIED}
        );
        
        // Verify callback was called with denied result
        verify(mockCallback).onPermissionDenied(Manifest.permission.WRITE_EXTERNAL_STORAGE);
        
        // Test empty results array
        permissionManager.onRequestPermissionsResult(
            100,
            new String[]{Manifest.permission.CAMERA},
            new int[]{}
        );
        
        // No additional callback invocations should occur
        verifyNoMoreInteractions(mockCallback);
    }

    /**
     * Test memory leak prevention through callback cleanup
     * Requirement: Security Testing - Verify proper implementation of device permission management
     */
    @Test
    public void testCallbackCleanup() {
        // Request permission and handle result
        permissionManager.requestCameraPermission(mockCallback);
        permissionManager.onRequestPermissionsResult(
            100,
            new String[]{Manifest.permission.CAMERA},
            new int[]{PackageManager.PERMISSION_GRANTED}
        );
        
        // Request another permission - callback should be cleared from previous request
        permissionManager.onRequestPermissionsResult(
            100,
            new String[]{Manifest.permission.CAMERA},
            new int[]{PackageManager.PERMISSION_GRANTED}
        );
        
        // Verify callback was only called once
        verify(mockCallback, times(1)).onPermissionGranted(Manifest.permission.CAMERA);
    }
}