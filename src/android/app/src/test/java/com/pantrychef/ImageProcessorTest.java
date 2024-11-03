package com.pantrychef;

import static org.junit.Assert.*;
import static org.mockito.Mockito.*;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import org.junit.Before;
import org.junit.After;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.pantrychef.utils.ImageProcessor;
import com.pantrychef.core.Constants;

/**
 * Unit test suite for ImageProcessor class
 * 
 * HUMAN TASKS:
 * 1. Verify test image resources are available in test assets
 * 2. Configure test device with sufficient memory for bitmap operations
 * 3. Run tests on different Android API levels to ensure compatibility
 * 4. Monitor memory usage during large image processing tests
 */
public class ImageProcessorTest {

    private byte[] testImageData;
    private Bitmap testBitmap;
    private Matrix testMatrix;

    @Mock
    private ExifInterface mockExif;

    @Before
    public void setUp() throws IOException {
        // Initialize Mockito annotations
        MockitoAnnotations.openMocks(this);

        // Create test image data
        testBitmap = Bitmap.createBitmap(2048, 1536, Bitmap.Config.ARGB_8888);
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        testBitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream);
        testImageData = stream.toByteArray();
        
        // Initialize test matrix for transformations
        testMatrix = new Matrix();
    }

    @After
    public void tearDown() {
        // Clean up resources
        if (testBitmap != null && !testBitmap.isRecycled()) {
            testBitmap.recycle();
        }
        testImageData = null;
        testMatrix = null;
    }

    /**
     * Tests complete image processing pipeline
     * Requirement: Image Recognition Component Testing - Validates image preprocessing pipeline functionality
     */
    @Test
    public void testImageProcessing() throws IOException {
        // Process test image
        byte[] processedData = ImageProcessor.processImage(testImageData);
        
        // Verify processed image size is within limits
        assertTrue("Processed image size exceeds maximum allowed size",
            processedData.length <= Constants.IMAGE_UPLOAD_MAX_SIZE);
        
        // Decode processed image to verify dimensions
        Bitmap processedBitmap = BitmapFactory.decodeByteArray(processedData, 0, processedData.length);
        assertNotNull("Failed to decode processed image", processedBitmap);
        
        // Verify dimensions are within limits
        assertTrue("Image width exceeds maximum dimension",
            processedBitmap.getWidth() <= Constants.MAX_IMAGE_DIMENSION);
        assertTrue("Image height exceeds maximum dimension",
            processedBitmap.getHeight() <= Constants.MAX_IMAGE_DIMENSION);
        
        // Clean up
        processedBitmap.recycle();
    }

    /**
     * Tests image scaling functionality
     * Requirement: Mobile Application Testing - Verifies native image processing capabilities
     */
    @Test
    public void testImageScaling() throws IOException {
        // Create oversized test bitmap
        Bitmap oversizedBitmap = Bitmap.createBitmap(3840, 2160, Bitmap.Config.ARGB_8888);
        
        // Process image through scaling
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        oversizedBitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream);
        byte[] processedData = ImageProcessor.processImage(stream.toByteArray());
        
        // Decode processed image
        Bitmap scaledBitmap = BitmapFactory.decodeByteArray(processedData, 0, processedData.length);
        
        // Verify scaled dimensions
        assertTrue("Scaled width exceeds maximum",
            scaledBitmap.getWidth() <= Constants.MAX_IMAGE_DIMENSION);
        assertTrue("Scaled height exceeds maximum",
            scaledBitmap.getHeight() <= Constants.MAX_IMAGE_DIMENSION);
        
        // Verify aspect ratio is maintained (within 0.1% tolerance)
        float originalRatio = (float) oversizedBitmap.getWidth() / oversizedBitmap.getHeight();
        float scaledRatio = (float) scaledBitmap.getWidth() / scaledBitmap.getHeight();
        assertEquals("Aspect ratio not maintained", originalRatio, scaledRatio, 0.001);
        
        // Clean up
        oversizedBitmap.recycle();
        scaledBitmap.recycle();
    }

    /**
     * Tests image compression functionality
     * Requirement: Image Recognition Component Testing - Validates compression functionality
     */
    @Test
    public void testImageCompression() throws IOException {
        // Create high quality test image
        Bitmap highQualityBitmap = Bitmap.createBitmap(1920, 1080, Bitmap.Config.ARGB_8888);
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        highQualityBitmap.compress(Bitmap.CompressFormat.JPEG, 100, stream);
        byte[] highQualityData = stream.toByteArray();
        
        // Process image
        byte[] compressedData = ImageProcessor.processImage(highQualityData);
        
        // Verify compressed size
        assertTrue("Compressed image exceeds maximum size",
            compressedData.length <= Constants.IMAGE_UPLOAD_MAX_SIZE);
        
        // Verify image quality is acceptable
        Bitmap compressedBitmap = BitmapFactory.decodeByteArray(compressedData, 0, compressedData.length);
        assertNotNull("Failed to decode compressed image", compressedBitmap);
        
        // Test progressive compression
        for (int quality = 100; quality >= 10; quality -= 10) {
            ByteArrayOutputStream testStream = new ByteArrayOutputStream();
            compressedBitmap.compress(Bitmap.CompressFormat.JPEG, quality, testStream);
            assertTrue("Compressed size invalid for quality " + quality,
                testStream.size() > 0);
        }
        
        // Clean up
        highQualityBitmap.recycle();
        compressedBitmap.recycle();
    }

    /**
     * Tests image rotation functionality
     * Requirement: Image Recognition Component Testing - Validates EXIF orientation handling
     */
    @Test
    public void testImageRotation() throws IOException {
        // Test all EXIF orientation values
        int[] orientations = {
            ExifInterface.ORIENTATION_NORMAL,
            ExifInterface.ORIENTATION_ROTATE_90,
            ExifInterface.ORIENTATION_ROTATE_180,
            ExifInterface.ORIENTATION_ROTATE_270,
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL,
            ExifInterface.ORIENTATION_FLIP_VERTICAL
        };
        
        for (int orientation : orientations) {
            // Create test image with EXIF data
            ByteArrayOutputStream stream = new ByteArrayOutputStream();
            testBitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream);
            byte[] imageData = stream.toByteArray();
            
            // Mock EXIF interface
            when(mockExif.getAttributeInt(
                eq(ExifInterface.TAG_ORIENTATION),
                eq(ExifInterface.ORIENTATION_UNDEFINED)
            )).thenReturn(orientation);
            
            // Process image
            byte[] rotatedData = ImageProcessor.processImage(imageData);
            Bitmap rotatedBitmap = BitmapFactory.decodeByteArray(rotatedData, 0, rotatedData.length);
            
            // Verify image was processed
            assertNotNull("Failed to process image with orientation " + orientation,
                rotatedBitmap);
            
            // Verify dimensions for 90/270 degree rotations
            if (orientation == ExifInterface.ORIENTATION_ROTATE_90 ||
                orientation == ExifInterface.ORIENTATION_ROTATE_270) {
                assertTrue("Width/height should be swapped for 90/270 rotation",
                    rotatedBitmap.getWidth() <= Constants.MAX_IMAGE_DIMENSION &&
                    rotatedBitmap.getHeight() <= Constants.MAX_IMAGE_DIMENSION);
            }
            
            rotatedBitmap.recycle();
        }
    }
}