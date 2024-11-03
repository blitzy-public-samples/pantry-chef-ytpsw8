package com.pantrychef.modules.camera;

import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.ImageFormat;
import android.graphics.SurfaceTexture;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CameraMetadata;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.TotalCaptureResult;
import android.media.Image;
import android.media.ImageReader;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Size;
import android.view.Surface;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.pantrychef.utils.ImageProcessor;
import com.pantrychef.utils.PermissionManager;
import com.pantrychef.utils.Logger;

import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * React Native native module that implements camera functionality for ingredient recognition
 * using Camera2 API.
 *
 * HUMAN TASKS:
 * 1. Verify camera hardware capabilities on target devices
 * 2. Test camera preview orientation on different devices
 * 3. Configure ProGuard rules for Camera2 API classes
 * 4. Review memory management during image capture
 */
public class CameraModule extends ReactContextBaseJavaModule {

    private static final String TAG = "CameraModule";
    private static final String ERROR_NO_PERMISSION = "E_NO_PERMISSION";
    private static final String ERROR_CAMERA_NOT_AVAILABLE = "E_CAMERA_NOT_AVAILABLE";

    private final ReactApplicationContext reactContext;
    private CameraDevice cameraDevice;
    private CameraCaptureSession captureSession;
    private ImageReader imageReader;
    private HandlerThread backgroundThread;
    private Handler backgroundHandler;
    private Semaphore cameraOpenCloseLock = new Semaphore(1);
    private Size captureSize;

    /**
     * Initialize the camera module with React Native context
     * Requirement: Mobile Application Architecture - Native module integration
     */
    public CameraModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        Logger.d(TAG, "CameraModule initialized");
    }

    /**
     * Return the name of the native module for React Native
     * Requirement: Mobile Application Architecture - React Native integration
     */
    @Override
    public String getName() {
        return "CameraModule";
    }

    /**
     * Capture image using device camera for ingredient recognition
     * Requirement: Photographic ingredient recognition
     */
    @ReactMethod
    public void captureImage(final Promise promise) {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            promise.reject(ERROR_CAMERA_NOT_AVAILABLE, "Activity is not available");
            return;
        }

        PermissionManager permissionManager = PermissionManager.getInstance(currentActivity);
        
        if (!permissionManager.checkCameraPermission()) {
            permissionManager.requestCameraPermission(new PermissionManager.PermissionCallback() {
                @Override
                public void onPermissionGranted(String permission) {
                    setupCameraAndCapture(promise);
                }

                @Override
                public void onPermissionDenied(String permission) {
                    promise.reject(ERROR_NO_PERMISSION, "Camera permission denied");
                }
            });
        } else {
            setupCameraAndCapture(promise);
        }
    }

    /**
     * Check if device camera is available and accessible
     * Requirement: Image Recognition Component - Camera availability check
     */
    @ReactMethod
    public void checkCameraAvailability(final Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject(ERROR_CAMERA_NOT_AVAILABLE, "Activity is not available");
            return;
        }

        boolean hasCamera = activity.getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY);
        if (!hasCamera) {
            promise.reject(ERROR_CAMERA_NOT_AVAILABLE, "Device has no camera");
            return;
        }

        PermissionManager permissionManager = PermissionManager.getInstance(activity);
        boolean hasPermission = permissionManager.checkCameraPermission();
        
        promise.resolve(hasPermission);
    }

    /**
     * Set up camera device and capture session
     * Requirement: Image Recognition Component - Camera setup
     */
    private void setupCameraAndCapture(final Promise promise) {
        startBackgroundThread();

        CameraManager manager = (CameraManager) reactContext.getSystemService(Context.CAMERA_SERVICE);
        try {
            String cameraId = selectCamera(manager);
            if (cameraId == null) {
                promise.reject(ERROR_CAMERA_NOT_AVAILABLE, "No suitable camera found");
                return;
            }

            setupImageReader();
            openCamera(manager, cameraId, promise);

        } catch (CameraAccessException e) {
            Logger.e(TAG, "Camera access error", e);
            promise.reject(ERROR_CAMERA_NOT_AVAILABLE, "Failed to access camera: " + e.getMessage());
            stopBackgroundThread();
        }
    }

    /**
     * Select appropriate camera for ingredient recognition
     * Requirement: Image Recognition Component - Camera selection
     */
    private String selectCamera(CameraManager manager) throws CameraAccessException {
        for (String cameraId : manager.getCameraIdList()) {
            CameraCharacteristics characteristics = manager.getCameraCharacteristics(cameraId);
            Integer facing = characteristics.get(CameraCharacteristics.LENS_FACING);
            
            if (facing != null && facing == CameraCharacteristics.LENS_FACING_BACK) {
                captureSize = chooseOptimalSize(characteristics);
                return cameraId;
            }
        }
        return null;
    }

    /**
     * Choose optimal capture size based on camera characteristics
     * Requirement: Image Recognition Component - Image quality optimization
     */
    private Size chooseOptimalSize(CameraCharacteristics characteristics) {
        Size[] sizes = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
                .getOutputSizes(ImageFormat.JPEG);
        
        // Choose size that's large enough for recognition but not too large for processing
        for (Size size : sizes) {
            if (size.getWidth() <= 1920 && size.getHeight() <= 1080) {
                return size;
            }
        }
        return sizes[0];
    }

    /**
     * Set up image reader for capturing photos
     * Requirement: Image Recognition Component - Image capture
     */
    private void setupImageReader() {
        imageReader = ImageReader.newInstance(
            captureSize.getWidth(),
            captureSize.getHeight(),
            ImageFormat.JPEG,
            2
        );

        imageReader.setOnImageAvailableListener(new ImageReader.OnImageAvailableListener() {
            @Override
            public void onImageAvailable(ImageReader reader) {
                backgroundHandler.post(new ImageSaver(reader.acquireNextImage()));
            }
        }, backgroundHandler);
    }

    /**
     * Open camera device
     * Requirement: Image Recognition Component - Camera initialization
     */
    private void openCamera(CameraManager manager, String cameraId, final Promise promise) {
        try {
            if (!cameraOpenCloseLock.tryAcquire(2500, TimeUnit.MILLISECONDS)) {
                throw new RuntimeException("Time out waiting to lock camera opening.");
            }

            manager.openCamera(cameraId, new CameraDevice.StateCallback() {
                @Override
                public void onOpened(CameraDevice camera) {
                    cameraOpenCloseLock.release();
                    cameraDevice = camera;
                    createCaptureSession(promise);
                }

                @Override
                public void onDisconnected(CameraDevice camera) {
                    cameraOpenCloseLock.release();
                    camera.close();
                    cameraDevice = null;
                    promise.reject(ERROR_CAMERA_NOT_AVAILABLE, "Camera disconnected");
                }

                @Override
                public void onError(CameraDevice camera, int error) {
                    cameraOpenCloseLock.release();
                    camera.close();
                    cameraDevice = null;
                    promise.reject(ERROR_CAMERA_NOT_AVAILABLE, "Camera error: " + error);
                }
            }, backgroundHandler);

        } catch (CameraAccessException e) {
            Logger.e(TAG, "Failed to open camera", e);
            promise.reject(ERROR_CAMERA_NOT_AVAILABLE, "Failed to open camera: " + e.getMessage());
        } catch (InterruptedException e) {
            Logger.e(TAG, "Interrupted while opening camera", e);
            promise.reject(ERROR_CAMERA_NOT_AVAILABLE, "Interrupted while opening camera");
        }
    }

    /**
     * Create capture session for taking photos
     * Requirement: Image Recognition Component - Image capture setup
     */
    private void createCaptureSession(final Promise promise) {
        try {
            Surface surface = imageReader.getSurface();

            final CaptureRequest.Builder captureBuilder = 
                cameraDevice.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE);
            captureBuilder.addTarget(surface);

            // Auto-focus should be continuous for ingredient recognition
            captureBuilder.set(CaptureRequest.CONTROL_AF_MODE, 
                CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE);
            
            // Auto-exposure and auto-white-balance for better recognition
            captureBuilder.set(CaptureRequest.CONTROL_AE_MODE,
                CaptureRequest.CONTROL_AE_MODE_ON_AUTO_FLASH);
            captureBuilder.set(CaptureRequest.CONTROL_AWB_MODE,
                CaptureRequest.CONTROL_AWB_MODE_AUTO);

            cameraDevice.createCaptureSession(Arrays.asList(surface),
                new CameraCaptureSession.StateCallback() {
                    @Override
                    public void onConfigured(CameraCaptureSession session) {
                        captureSession = session;
                        try {
                            session.capture(captureBuilder.build(),
                                new CameraCaptureSession.CaptureCallback() {
                                    @Override
                                    public void onCaptureCompleted(CameraCaptureSession session,
                                            CaptureRequest request, TotalCaptureResult result) {
                                        Logger.d(TAG, "Image capture completed");
                                    }
                                }, backgroundHandler);
                        } catch (CameraAccessException e) {
                            Logger.e(TAG, "Failed to start capture", e);
                            promise.reject(ERROR_CAMERA_NOT_AVAILABLE, 
                                "Failed to start capture: " + e.getMessage());
                        }
                    }

                    @Override
                    public void onConfigureFailed(CameraCaptureSession session) {
                        Logger.e(TAG, "Failed to configure capture session", null);
                        promise.reject(ERROR_CAMERA_NOT_AVAILABLE, "Failed to configure camera");
                    }
                }, backgroundHandler);

        } catch (CameraAccessException e) {
            Logger.e(TAG, "Failed to create capture session", e);
            promise.reject(ERROR_CAMERA_NOT_AVAILABLE, 
                "Failed to create capture session: " + e.getMessage());
        }
    }

    /**
     * Start background thread for camera operations
     * Requirement: Mobile Application Architecture - Background processing
     */
    private void startBackgroundThread() {
        backgroundThread = new HandlerThread("CameraBackground");
        backgroundThread.start();
        backgroundHandler = new Handler(backgroundThread.getLooper());
    }

    /**
     * Stop background thread
     * Requirement: Mobile Application Architecture - Resource cleanup
     */
    private void stopBackgroundThread() {
        if (backgroundThread != null) {
            backgroundThread.quitSafely();
            try {
                backgroundThread.join();
                backgroundThread = null;
                backgroundHandler = null;
            } catch (InterruptedException e) {
                Logger.e(TAG, "Failed to stop background thread", e);
            }
        }
    }

    /**
     * Clean up resources
     * Requirement: Mobile Application Architecture - Resource management
     */
    private void cleanup() {
        if (captureSession != null) {
            captureSession.close();
            captureSession = null;
        }
        if (cameraDevice != null) {
            cameraDevice.close();
            cameraDevice = null;
        }
        if (imageReader != null) {
            imageReader.close();
            imageReader = null;
        }
        stopBackgroundThread();
    }

    /**
     * Inner class to handle image saving and processing
     * Requirement: Image Recognition Component - Image processing
     */
    private class ImageSaver implements Runnable {
        private final Image image;

        ImageSaver(Image image) {
            this.image = image;
        }

        @Override
        public void run() {
            ByteBuffer buffer = image.getPlanes()[0].getBuffer();
            byte[] bytes = new byte[buffer.remaining()];
            buffer.get(bytes);
            
            try {
                byte[] processedImage = ImageProcessor.processImage(bytes);
                // TODO: Send processed image to recognition service
                cleanup();
            } catch (Exception e) {
                Logger.e(TAG, "Failed to process image", e);
            } finally {
                image.close();
            }
        }
    }
}