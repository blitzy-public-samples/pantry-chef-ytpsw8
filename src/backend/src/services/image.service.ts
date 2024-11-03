/**
 * HUMAN TASKS:
 * 1. Set up TensorFlow model weights in S3 bucket and configure access
 * 2. Configure image preprocessing parameters in environment variables
 * 3. Set up CloudWatch metrics for recognition performance monitoring
 * 4. Configure S3 bucket lifecycle policies for processed images
 * 5. Set up model retraining pipeline and versioning
 */

import * as tf from '@tensorflow/tfjs-node'; // ^4.0.0
import sharp from 'sharp'; // ^0.32.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { Ingredient, IngredientCategory } from '../interfaces/ingredient.interface';
import { s3Client } from '../config/aws';
import logger from '../utils/logger';
import { AppError, CommonErrors } from '../utils/errors';

// Constants for image processing and recognition
const IMAGE_SIZE = 224; // Standard input size for most CNN models
const CONFIDENCE_THRESHOLD = 0.75;
const S3_BUCKET = process.env.S3_BUCKET || 'pantrychef-images';
const MODEL_PATH = process.env.TF_MODEL_PATH || 's3://pantrychef-models/ingredient-recognition/v1';

/**
 * Interface for recognition results
 * Addresses requirement: Photographic Ingredient Recognition
 */
interface RecognitionResult {
    ingredients: Array<{
        name: string;
        confidence: number;
        category: IngredientCategory;
        recognitionTags: string[];
    }>;
    imageUrl: string;
}

/**
 * Core service for image processing and ingredient recognition
 * Addresses requirements:
 * - Photographic ingredient recognition and cataloging
 * - Image Recognition Service for processing ingredient photos
 * - S3 integration for image storage
 */
export class ImageService {
    private model: tf.LayersModel;
    private readonly confidenceThreshold: number;
    private readonly imageProcessor: sharp.Sharp;

    constructor() {
        this.confidenceThreshold = CONFIDENCE_THRESHOLD;
        this.imageProcessor = sharp().withMetadata();
        this.initializeModel();
    }

    /**
     * Initializes TensorFlow model for ingredient recognition
     * Addresses requirement: Image Processing - TensorFlow model initialization
     */
    private async initializeModel(): Promise<void> {
        try {
            logger.info('Loading TensorFlow model', { modelPath: MODEL_PATH });
            this.model = await tf.loadLayersModel(MODEL_PATH);
            logger.info('TensorFlow model loaded successfully');
        } catch (error) {
            logger.error('Failed to load TensorFlow model', {
                error: error.message,
                stack: error.stack
            });
            throw CommonErrors.ImageProcessingError({
                context: 'model_initialization',
                error: error.message
            });
        }
    }

    /**
     * Processes an uploaded image through the recognition pipeline
     * Addresses requirements:
     * - Photographic ingredient recognition
     * - Image preprocessing and optimization
     */
    public async processImage(
        imageBuffer: Buffer,
        fileName: string
    ): Promise<RecognitionResult> {
        try {
            logger.info('Starting image processing', { fileName });

            // Preprocess image for optimal recognition
            const processedImage = await this.preprocessImage(imageBuffer);
            
            // Run ingredient recognition
            const tensor = tf.node.decodeImage(processedImage, 3);
            const predictions = await this.recognizeIngredients(tensor);
            
            // Upload processed image to S3
            const imageUrl = await this.uploadToS3(processedImage, fileName);

            // Clean up tensor to prevent memory leaks
            tensor.dispose();

            logger.info('Image processing completed', {
                fileName,
                ingredientsFound: predictions.length
            });

            return {
                ingredients: predictions,
                imageUrl
            };
        } catch (error) {
            logger.error('Image processing failed', {
                error: error.message,
                fileName
            });
            throw CommonErrors.ImageProcessingError({
                context: 'image_processing',
                fileName,
                error: error.message
            });
        }
    }

    /**
     * Preprocesses image for optimal recognition using sharp
     * Addresses requirement: Image Processing - Preprocessing optimization
     */
    private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
        try {
            return await this.imageProcessor
                .clone()
                .resize(IMAGE_SIZE, IMAGE_SIZE, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                })
                .normalize()
                .removeAlpha()
                .toFormat('jpeg', { quality: 90 })
                .toBuffer();
        } catch (error) {
            logger.error('Image preprocessing failed', {
                error: error.message
            });
            throw CommonErrors.ImageProcessingError({
                context: 'preprocessing',
                error: error.message
            });
        }
    }

    /**
     * Performs ingredient recognition using TensorFlow model
     * Addresses requirement: Photographic Ingredient Recognition
     */
    private async recognizeIngredients(
        processedImage: tf.Tensor3D
    ): Promise<Array<{
        name: string;
        confidence: number;
        category: IngredientCategory;
        recognitionTags: string[];
    }>> {
        try {
            // Prepare image tensor for model input
            const batchedImage = tf.expandDims(processedImage, 0);
            const normalizedImage = tf.div(batchedImage, 255.0);

            // Run inference
            const predictions = await this.model.predict(normalizedImage) as tf.Tensor;
            const results = await predictions.array();

            // Clean up tensors
            batchedImage.dispose();
            normalizedImage.dispose();
            predictions.dispose();

            // Process and filter results
            return this.processRecognitionResults(results[0]);
        } catch (error) {
            logger.error('Ingredient recognition failed', {
                error: error.message
            });
            throw CommonErrors.ImageProcessingError({
                context: 'recognition',
                error: error.message
            });
        }
    }

    /**
     * Processes and filters recognition results
     * Addresses requirement: Confidence scoring and result filtering
     */
    private processRecognitionResults(
        predictions: number[]
    ): Array<{
        name: string;
        confidence: number;
        category: IngredientCategory;
        recognitionTags: string[];
    }> {
        // Map of class indices to ingredient names and categories
        const ingredientClasses = this.getIngredientClasses();

        return predictions
            .map((confidence, index) => ({
                ...ingredientClasses[index],
                confidence
            }))
            .filter(result => result.confidence >= this.confidenceThreshold)
            .sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Uploads processed image to S3 with encryption
     * Addresses requirement: S3 integration for image storage
     */
    private async uploadToS3(
        imageBuffer: Buffer,
        originalFileName: string
    ): Promise<string> {
        try {
            const fileExtension = originalFileName.split('.').pop();
            const uniqueFileName = `${uuidv4()}.${fileExtension}`;
            const key = `processed/${uniqueFileName}`;

            await s3Client.upload({
                Bucket: S3_BUCKET,
                Key: key,
                Body: imageBuffer,
                ContentType: `image/${fileExtension}`,
                ServerSideEncryption: 'AES256'
            }).promise();

            logger.info('Image uploaded to S3', {
                bucket: S3_BUCKET,
                key
            });

            return `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
        } catch (error) {
            logger.error('S3 upload failed', {
                error: error.message,
                fileName: originalFileName
            });
            throw CommonErrors.ImageProcessingError({
                context: 's3_upload',
                error: error.message
            });
        }
    }

    /**
     * Returns mapping of model class indices to ingredient information
     * Addresses requirement: Ingredient classification and categorization
     */
    private getIngredientClasses(): Array<{
        name: string;
        category: IngredientCategory;
        recognitionTags: string[];
    }> {
        // This would typically be loaded from a configuration file or database
        return [
            {
                name: 'tomato',
                category: IngredientCategory.PRODUCE,
                recognitionTags: ['tomato', 'roma', 'cherry']
            },
            {
                name: 'onion',
                category: IngredientCategory.PRODUCE,
                recognitionTags: ['onion', 'yellow onion', 'red onion']
            },
            // Additional ingredients would be defined here
        ];
    }
}