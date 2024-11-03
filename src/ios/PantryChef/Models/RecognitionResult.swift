//
// RecognitionResult.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify confidence threshold values with ML team
// 2. Review manual verification criteria with product team
// 3. Confirm supported image formats in metadata

import Foundation // iOS 13.0+
import CoreGraphics // iOS 13.0+

// MARK: - Recognition Result Model
// Requirements:
// - Photographic Ingredient Recognition: Comprehensive result tracking from image processing
// - Image Recognition Component: Handles recognition pipeline results with confidence scoring
// - Recognition Results Processing: Processes results with manual verification support

@objc
@objcMembers
class RecognitionResult: NSObject {
    // MARK: - Properties
    let id: String
    let detectedIngredients: [DetectedIngredient]
    let timestamp: Date
    let processingTime: Double
    let isSuccessful: Bool
    let errorMessage: String?
    let metadata: ImageMetadata
    private(set) var requiresManualVerification: Bool
    
    // MARK: - Initialization
    init(id: String,
         detectedIngredients: [DetectedIngredient],
         processingTime: Double,
         isSuccessful: Bool,
         errorMessage: String? = nil,
         metadata: ImageMetadata) {
        // Input validation
        guard !id.isEmpty else {
            fatalError("Recognition result ID cannot be empty")
        }
        
        self.id = id
        self.detectedIngredients = detectedIngredients
        self.processingTime = processingTime
        self.isSuccessful = isSuccessful
        self.errorMessage = errorMessage
        self.metadata = metadata
        self.timestamp = Date()
        
        // Initialize verification flag based on confidence scores
        self.requiresManualVerification = false
        super.init()
        
        // Set initial verification requirement
        self.requiresManualVerification = needsManualVerification(minimumConfidence: 0.7)
    }
    
    // MARK: - Public Methods
    
    /// Returns ingredients detected with high confidence above specified threshold
    /// Requirement: Image Recognition Component - Confidence scoring
    /// - Parameter confidenceThreshold: Minimum confidence score threshold (0.0 to 1.0)
    /// - Returns: Array of high confidence detected ingredients
    func getHighConfidenceIngredients(confidenceThreshold: Double) -> [DetectedIngredient] {
        guard confidenceThreshold >= 0.0 && confidenceThreshold <= 1.0 else {
            return []
        }
        
        return detectedIngredients
            .filter { $0.confidenceScore >= confidenceThreshold }
            .sorted { $0.confidenceScore > $1.confidenceScore }
    }
    
    /// Converts detection results to Ingredient models
    /// Requirement: Recognition Results Processing - Convert to core ingredient models
    /// - Returns: Array of converted Ingredient models
    func toIngredients() -> [Ingredient] {
        return detectedIngredients.map { detected in
            Ingredient(
                id: UUID().uuidString,
                name: detected.name,
                category: detected.category,
                quantity: 1.0,
                unit: "unit",
                location: "default",
                imageUrl: nil
            )
        }
    }
    
    /// Checks if the recognition result requires manual verification
    /// Requirement: Recognition Results Processing - Manual verification handling
    /// - Parameter minimumConfidence: Minimum required confidence score
    /// - Returns: True if any detected ingredient has confidence below threshold
    func needsManualVerification(minimumConfidence: Double) -> Bool {
        let needsVerification = detectedIngredients.contains { 
            $0.confidenceScore < minimumConfidence 
        }
        requiresManualVerification = needsVerification
        return needsVerification
    }
}

// MARK: - Detected Ingredient Structure
struct DetectedIngredient {
    let name: String
    let category: String
    let confidenceScore: Double
    let boundingBox: CGRect
    let additionalMetadata: [String: Any]
    
    init(name: String,
         category: String,
         confidenceScore: Double,
         boundingBox: CGRect,
         additionalMetadata: [String: Any] = [:]) {
        // Validate inputs
        guard !name.isEmpty,
              confidenceScore >= 0.0 && confidenceScore <= 1.0 else {
            fatalError("Invalid detected ingredient parameters")
        }
        
        self.name = name
        self.category = category
        self.confidenceScore = confidenceScore
        self.boundingBox = boundingBox
        self.additionalMetadata = additionalMetadata
    }
}

// MARK: - Image Metadata Structure
struct ImageMetadata {
    let dimensions: CGSize
    let format: String
    let quality: Double
    let captureTime: Date
    let processingParameters: [String: Any]
    let deviceModel: String
    let osVersion: String
    
    init(dimensions: CGSize,
         format: String,
         quality: Double,
         captureTime: Date,
         processingParameters: [String: Any],
         deviceModel: String,
         osVersion: String) {
        // Validate quality
        guard quality >= 0.0 && quality <= 1.0 else {
            fatalError("Image quality must be between 0 and 1")
        }
        
        // Validate format
        let supportedFormats = ["JPEG", "PNG", "HEIC"]
        guard supportedFormats.contains(format.uppercased()) else {
            fatalError("Unsupported image format: \(format)")
        }
        
        self.dimensions = dimensions
        self.format = format.uppercased()
        self.quality = quality
        self.captureTime = captureTime
        self.processingParameters = processingParameters
        self.deviceModel = deviceModel
        self.osVersion = osVersion
    }
}

// MARK: - CustomStringConvertible
extension RecognitionResult: CustomStringConvertible {
    var description: String {
        return "RecognitionResult(id: \(id), ingredients: \(detectedIngredients.count), successful: \(isSuccessful))"
    }
}

// MARK: - Equatable
extension DetectedIngredient: Equatable {
    static func == (lhs: DetectedIngredient, rhs: DetectedIngredient) -> Bool {
        return lhs.name == rhs.name &&
               lhs.category == rhs.category &&
               lhs.confidenceScore == rhs.confidenceScore &&
               lhs.boundingBox == rhs.boundingBox
    }
}