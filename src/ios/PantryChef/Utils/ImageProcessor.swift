//
// ImageProcessor.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure Vision framework models and parameters for optimal recognition
// 2. Verify cache size limits based on device capabilities
// 3. Review and adjust image quality settings for different device types
// 4. Set up performance monitoring for processing time requirements

import UIKit // iOS 13.0+
import CoreImage // iOS 13.0+
import Vision // iOS 13.0+

// MARK: - ImageQuality
// Requirement: Image Processing - Client-side image preprocessing and optimization
public enum ImageQuality {
    case low
    case medium
    case high
}

// MARK: - ProcessingError
// Requirement: Image Processing - Define possible image processing errors for error handling
public enum ProcessingError: Error {
    case invalidImage
    case processingFailed
    case sizeTooLarge
    case unsupportedFormat
}

// MARK: - ImageProcessor
// Requirement: Image Recognition - Photographic ingredient recognition and cataloging
public final class ImageProcessor {
    // MARK: - Singleton
    public static let shared = ImageProcessor()
    
    // MARK: - Properties
    private let imageCache: NSCache<NSString, UIImage>
    private let processingQueue: DispatchQueue
    private let maxImageSize: Int
    private let defaultQuality: ImageQuality
    
    // MARK: - Private Initialization
    private init() {
        // Initialize processing queue with quality of service user-initiated
        self.processingQueue = DispatchQueue(label: "com.pantrychef.imageprocessing",
                                           qos: .userInitiated,
                                           attributes: .concurrent)
        
        // Configure image cache with size limits
        self.imageCache = NSCache<NSString, UIImage>()
        self.imageCache.countLimit = 100
        self.imageCache.totalCostLimit = 50 * 1024 * 1024 // 50MB
        
        // Set default image quality to medium
        self.defaultQuality = .medium
        
        // Set maximum image size limit to optimize processing time (8MB)
        self.maxImageSize = 8 * 1024 * 1024
    }
    
    // MARK: - Public Methods
    
    /// Preprocesses an image for ingredient recognition with optimized performance
    /// - Parameters:
    ///   - image: The input image to process
    ///   - quality: Optional quality level for processing (defaults to medium)
    /// - Returns: Result containing processed image or error
    public func preprocessImage(image: UIImage, quality: ImageQuality? = nil) -> Result<UIImage, ProcessingError> {
        // Requirement: Performance Optimization - Image processing performance optimization to meet < 3s processing time
        
        // Check if image recognition is enabled
        guard Features.imageRecognitionEnabled else {
            Logger.shared.error("Image recognition feature is disabled")
            return .failure(.processingFailed)
        }
        
        // Validate input image
        guard let cgImage = image.cgImage else {
            Logger.shared.error("Invalid input image format")
            return .failure(.invalidImage)
        }
        
        // Check image size
        let imageSize = cgImage.width * cgImage.height * 4 // Approximate size in bytes
        guard imageSize <= maxImageSize else {
            Logger.shared.error("Image size exceeds maximum allowed: \(imageSize) bytes")
            return .failure(.sizeTooLarge)
        }
        
        Logger.shared.debug("Starting image preprocessing with quality: \(quality ?? defaultQuality)")
        
        let context = CIContext()
        let ciImage = CIImage(cgImage: cgImage)
        
        do {
            // Apply noise reduction filter
            let noiseReductionFilter = CIFilter(name: "CINoiseReduction")
            noiseReductionFilter?.setValue(ciImage, forKey: kCIInputImageKey)
            noiseReductionFilter?.setValue(0.02, forKey: "inputNoiseLevel")
            noiseReductionFilter?.setValue(0.40, forKey: "inputSharpness")
            
            guard let filteredImage = noiseReductionFilter?.outputImage else {
                throw ProcessingError.processingFailed
            }
            
            // Adjust contrast and brightness
            let colorControls = CIFilter(name: "CIColorControls")
            colorControls?.setValue(filteredImage, forKey: kCIInputImageKey)
            colorControls?.setValue(1.1, forKey: kCIInputContrastKey)
            colorControls?.setValue(0.0, forKey: kCIInputBrightnessKey)
            
            guard let adjustedImage = colorControls?.outputImage,
                  let outputCGImage = context.createCGImage(adjustedImage, from: adjustedImage.extent) else {
                throw ProcessingError.processingFailed
            }
            
            // Create UIImage with proper orientation
            let processedImage = UIImage(cgImage: outputCGImage, scale: image.scale, orientation: image.imageOrientation)
            
            Logger.shared.debug("Image preprocessing completed successfully")
            return .success(processedImage)
            
        } catch {
            Logger.shared.error("Image preprocessing failed: \(error.localizedDescription)")
            return .failure(.processingFailed)
        }
    }
    
    /// Compresses an image to reduce size while maintaining quality for efficient processing
    /// - Parameters:
    ///   - image: The image to compress
    ///   - compressionQuality: The compression quality (0.0 to 1.0)
    /// - Returns: Result containing compressed image data or error
    public func compressImage(image: UIImage, compressionQuality: CGFloat) -> Result<Data, ProcessingError> {
        // Validate compression quality range
        let quality = max(0.0, min(1.0, compressionQuality))
        
        Logger.shared.debug("Compressing image with quality: \(quality)")
        
        guard let imageData = image.jpegData(compressionQuality: quality) else {
            Logger.shared.error("Failed to compress image")
            return .failure(.processingFailed)
        }
        
        // Validate compressed size
        guard imageData.count <= maxImageSize else {
            Logger.shared.error("Compressed image size exceeds maximum: \(imageData.count) bytes")
            return .failure(.sizeTooLarge)
        }
        
        Logger.shared.debug("Image compression successful. Size: \(imageData.count) bytes")
        return .success(imageData)
    }
    
    /// Performs initial ingredient detection on an image using Vision framework
    /// - Parameter image: The image to analyze
    /// - Returns: Result containing detected ingredient regions or error
    public func detectIngredients(image: UIImage) -> Result<[CGRect], ProcessingError> {
        guard let cgImage = image.cgImage else {
            Logger.shared.error("Invalid image format for ingredient detection")
            return .failure(.invalidImage)
        }
        
        let request = VNDetectRectanglesRequest()
        request.minimumAspectRatio = 0.3
        request.maximumAspectRatio = 1.0
        request.minimumSize = 0.1
        request.maximumObservations = 10
        
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        
        do {
            try handler.perform([request])
            
            guard let results = request.results as? [VNRectangleObservation] else {
                Logger.shared.error("No rectangles detected in image")
                return .failure(.processingFailed)
            }
            
            let detectedRegions = results.map { observation in
                observation.boundingBox
            }
            
            Logger.shared.debug("Detected \(detectedRegions.count) potential ingredient regions")
            return .success(detectedRegions)
            
        } catch {
            Logger.shared.error("Rectangle detection failed: \(error.localizedDescription)")
            return .failure(.processingFailed)
        }
    }
    
    /// Caches a processed image for future use to improve performance
    /// - Parameters:
    ///   - image: The image to cache
    ///   - key: Unique identifier for the cached image
    private func cacheImage(image: UIImage, key: String) {
        let cacheKey = NSString(string: key)
        imageCache.setObject(image, forKey: cacheKey)
        Logger.shared.debug("Cached image with key: \(key)")
    }
}