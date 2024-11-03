package com.pantrychef.utils;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import com.pantrychef.core.Constants;

/**
 * Utility class that handles image processing operations for the PantryChef Android application.
 * 
 * HUMAN TASKS:
 * 1. Verify device memory constraints for bitmap operations
 * 2. Test with various Android device cameras and image orientations
 * 3. Monitor memory usage during image processing operations
 * 4. Configure ProGuard rules to preserve EXIF-related code
 */
public final class ImageProcessor {

    private static final String TAG = "ImageProcessor";
    private static final int JPEG_QUALITY = 85;

    private byte[] imageData;
    private Bitmap processedBitmap;

    /**
     * Private constructor to prevent instantiation
     * Requirement: Mobile Application Architecture - Utility class pattern
     */
    private ImageProcessor() {
        // Private constructor to enforce utility class pattern
    }

    /**
     * Process raw image data for ingredient recognition
     * Requirement: Image Recognition Component - Image preprocessing pipeline
     *
     * @param imageData Raw byte array of the captured image
     * @return Processed image data ready for upload
     * @throws IOException If image processing fails
     */
    public static byte[] processImage(byte[] imageData) throws IOException {
        Logger.d(TAG, "Starting image processing");
        
        try {
            // Decode image data to bitmap
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = false;
            Bitmap originalBitmap = BitmapFactory.decodeByteArray(imageData, 0, imageData.length, options);
            
            if (originalBitmap == null) {
                throw new IOException("Failed to decode image data");
            }

            // Extract EXIF orientation
            ExifInterface exif = new ExifInterface(new java.io.ByteArrayInputStream(imageData));
            int orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_UNDEFINED
            );

            // Scale the image while maintaining aspect ratio
            Bitmap scaledBitmap = scaleImage(originalBitmap);
            originalBitmap.recycle();

            // Rotate image based on EXIF data
            Bitmap rotatedBitmap = rotateImage(scaledBitmap, orientation);
            scaledBitmap.recycle();

            // Compress the final image
            byte[] processedData = compressImage(rotatedBitmap);
            rotatedBitmap.recycle();

            Logger.d(TAG, "Image processing completed successfully");
            return processedData;

        } catch (IOException e) {
            Logger.e(TAG, "Error processing image", e);
            throw e;
        } catch (OutOfMemoryError e) {
            Logger.e(TAG, "Out of memory while processing image", e);
            throw new IOException("Insufficient memory for image processing", e);
        }
    }

    /**
     * Scale image to maximum allowed dimensions while maintaining aspect ratio
     * Requirement: Image Processing Pipeline - Image size optimization
     *
     * @param original Original bitmap to scale
     * @return Scaled bitmap image
     */
    private static Bitmap scaleImage(Bitmap original) {
        int originalWidth = original.getWidth();
        int originalHeight = original.getHeight();
        
        Logger.d(TAG, String.format("Original dimensions: %dx%d", originalWidth, originalHeight));

        // Calculate scaling factor based on MAX_IMAGE_DIMENSION
        float scaleFactor = 1.0f;
        if (originalWidth > Constants.MAX_IMAGE_DIMENSION || originalHeight > Constants.MAX_IMAGE_DIMENSION) {
            scaleFactor = Math.min(
                (float) Constants.MAX_IMAGE_DIMENSION / originalWidth,
                (float) Constants.MAX_IMAGE_DIMENSION / originalHeight
            );
        }

        // Calculate new dimensions
        int scaledWidth = Math.round(originalWidth * scaleFactor);
        int scaledHeight = Math.round(originalHeight * scaleFactor);

        Logger.d(TAG, String.format("Scaling image to: %dx%d", scaledWidth, scaledHeight));

        return Bitmap.createScaledBitmap(original, scaledWidth, scaledHeight, true);
    }

    /**
     * Compress image to meet upload size requirements
     * Requirement: Image Processing Pipeline - Image compression
     *
     * @param bitmap Bitmap to compress
     * @return Compressed image data
     * @throws IOException If compression fails
     */
    private static byte[] compressImage(Bitmap bitmap) throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        int quality = JPEG_QUALITY;

        try {
            // Initial compression
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream);
            
            // Reduce quality iteratively if size exceeds limit
            while (outputStream.size() > Constants.IMAGE_UPLOAD_MAX_SIZE && quality > 10) {
                outputStream.reset();
                quality -= 10;
                bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream);
                Logger.d(TAG, String.format("Recompressing at quality %d, size: %d bytes", 
                    quality, outputStream.size()));
            }

            if (outputStream.size() > Constants.IMAGE_UPLOAD_MAX_SIZE) {
                throw new IOException("Unable to compress image to required size");
            }

            Logger.d(TAG, String.format("Final compressed size: %d bytes at quality %d", 
                outputStream.size(), quality));
            
            return outputStream.toByteArray();
        } finally {
            outputStream.close();
        }
    }

    /**
     * Rotate image based on EXIF orientation data
     * Requirement: Image Processing Pipeline - EXIF orientation correction
     *
     * @param bitmap Bitmap to rotate
     * @param orientation EXIF orientation value
     * @return Rotated bitmap image
     */
    private static Bitmap rotateImage(Bitmap bitmap, int orientation) {
        Matrix matrix = new Matrix();
        
        switch (orientation) {
            case ExifInterface.ORIENTATION_ROTATE_90:
                matrix.postRotate(90);
                break;
            case ExifInterface.ORIENTATION_ROTATE_180:
                matrix.postRotate(180);
                break;
            case ExifInterface.ORIENTATION_ROTATE_270:
                matrix.postRotate(270);
                break;
            case ExifInterface.ORIENTATION_FLIP_HORIZONTAL:
                matrix.postScale(-1, 1);
                break;
            case ExifInterface.ORIENTATION_FLIP_VERTICAL:
                matrix.postScale(1, -1);
                break;
            default:
                return bitmap;
        }

        Logger.d(TAG, String.format("Rotating image for EXIF orientation: %d", orientation));
        
        try {
            return Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), 
                matrix, true);
        } catch (OutOfMemoryError e) {
            Logger.e(TAG, "Out of memory while rotating image", e);
            return bitmap;
        }
    }
}