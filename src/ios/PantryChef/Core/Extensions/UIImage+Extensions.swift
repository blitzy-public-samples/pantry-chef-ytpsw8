//
// UIImage+Extensions.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify TensorFlow model input requirements match the image processing parameters
// 2. Test image compression quality on various device types to optimize size/quality ratio
// 3. Monitor memory usage during batch image processing
// 4. Validate color space conversion accuracy for ingredient recognition

import UIKit // iOS 13.0+
import CoreImage // iOS 13.0+

// MARK: - UIImage Extension
extension UIImage {
    
    // MARK: - Image Recognition Preparation
    // Requirement: Image Recognition Component - Implements image preprocessing and optimization for ingredient recognition pipeline
    public func prepareForRecognition(targetSize: CGFloat = Layout.iconSize) -> UIImage? {
        guard let normalized = normalized(),
              let resized = resized(CGSize(width: targetSize, height: targetSize)) else {
            return nil
        }
        
        guard let ciImage = CIImage(image: resized) else { return nil }
        let context = CIContext(options: [.useSoftwareRenderer: false])
        
        // Apply contrast enhancement
        let parameters = [
            kCIInputImageKey: ciImage,
            kCIInputContrastKey: NSNumber(value: 1.1)
        ]
        
        guard let filter = CIFilter(name: "CIColorControls", parameters: parameters),
              let outputImage = filter.outputImage,
              let cgImage = context.createCGImage(outputImage, from: outputImage.extent) else {
            return nil
        }
        
        // Convert to RGB color space required by TensorFlow
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        guard let bitmapContext = CGContext(
            data: nil,
            width: Int(targetSize),
            height: Int(targetSize),
            bitsPerComponent: 8,
            bytesPerRow: Int(targetSize) * 4,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            return nil
        }
        
        bitmapContext.draw(cgImage, in: CGRect(x: 0, y: 0, width: targetSize, height: targetSize))
        guard let processedImage = bitmapContext.makeImage() else { return nil }
        
        return UIImage(cgImage: processedImage)
    }
    
    // MARK: - Image Compression
    // Requirement: Image Processing Pipeline - Implements image preprocessing steps including optimization
    public func compressed(quality: CGFloat = 0.7) -> Data? {
        guard quality >= 0, quality <= 1 else { return nil }
        
        // Apply progressive JPEG encoding for large images
        if size.width > 1024 || size.height > 1024 {
            let scale = 1024 / max(size.width, size.height)
            let newSize = CGSize(width: size.width * scale, height: size.height * scale)
            guard let resized = resized(newSize) else { return nil }
            return resized.jpegData(compressionQuality: quality)
        }
        
        return jpegData(compressionQuality: quality)
    }
    
    // MARK: - Image Resizing
    // Requirement: Image Processing Pipeline - Implements image preprocessing steps including resizing
    public func resized(_ targetSize: CGSize) -> UIImage? {
        let size = self.size
        let widthRatio = targetSize.width / size.width
        let heightRatio = targetSize.height / size.height
        let ratio = min(widthRatio, heightRatio)
        
        let newSize = CGSize(
            width: size.width * ratio,
            height: size.height * ratio
        )
        
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        
        let renderer = UIGraphicsImageRenderer(size: newSize, format: format)
        let resizedImage = renderer.image { context in
            context.cgContext.interpolationQuality = .high
            context.cgContext.setShouldAntialias(true)
            context.cgContext.setAllowsAntialiasing(true)
            
            let rect = CGRect(
                x: (newSize.width - size.width * ratio) / 2,
                y: (newSize.height - size.height * ratio) / 2,
                width: size.width * ratio,
                height: size.height * ratio
            ).insetBy(dx: Layout.margins, dy: Layout.margins)
            
            draw(in: rect)
        }
        
        return resizedImage
    }
    
    // MARK: - Image Normalization
    // Requirement: Image Processing Pipeline - Implements image preprocessing steps including normalization
    public func normalized() -> UIImage? {
        guard let ciImage = CIImage(image: self) else { return nil }
        let context = CIContext(options: [.workingColorSpace: CGColorSpaceCreateDeviceRGB()])
        
        // Apply auto-enhancement filter
        guard let autoEnhance = CIFilter(name: "CIAutoEnhance") else { return nil }
        autoEnhance.setValue(ciImage, forKey: kCIInputImageKey)
        
        // Apply lighting normalization
        guard let lighting = CIFilter(name: "CIToneCurve") else { return nil }
        lighting.setValue(autoEnhance.outputImage, forKey: kCIInputImageKey)
        lighting.setValue(CIVector(x: 0, y: 0), forKey: "inputPoint0")
        lighting.setValue(CIVector(x: 0.25, y: 0.25), forKey: "inputPoint1")
        lighting.setValue(CIVector(x: 0.5, y: 0.5), forKey: "inputPoint2")
        lighting.setValue(CIVector(x: 0.75, y: 0.75), forKey: "inputPoint3")
        lighting.setValue(CIVector(x: 1, y: 1), forKey: "inputPoint4")
        
        // Apply noise reduction if needed
        guard let noiseReduction = CIFilter(name: "CINoiseReduction") else { return nil }
        noiseReduction.setValue(lighting.outputImage, forKey: kCIInputImageKey)
        noiseReduction.setValue(0.02, forKey: "inputNoiseLevel")
        noiseReduction.setValue(0.40, forKey: "inputSharpness")
        
        guard let outputImage = noiseReduction.outputImage,
              let cgImage = context.createCGImage(outputImage, from: outputImage.extent) else {
            return nil
        }
        
        return UIImage(cgImage: cgImage)
    }
}