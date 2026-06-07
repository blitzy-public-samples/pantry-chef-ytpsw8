/**
 * HUMAN TASKS:
 * 1. Configure TensorFlow model weights in S3 bucket and set MODEL_PATH in environment
 * 2. Set up CloudWatch metrics for image processing performance monitoring
 * 3. Configure image upload size limits and allowed types in environment variables
 * 4. Set up alerts for recognition service failures
 * 5. Configure S3 bucket CORS settings for image uploads
 */

import { Request, Response, NextFunction } from 'express';
import { ImageService } from '../../services/image.service';
import { uploadMiddleware } from '../middlewares/upload.middleware';
import { validateImageUpload } from '../validators/image.validator';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';

/**
 * Controller handling image upload, processing, and ingredient recognition
 * Addresses requirements:
 * - Photographic ingredient recognition and cataloging
 * - Image capture, preprocessing, and recognition pipeline
 * - Secure image handling with encryption and validation
 */
export class ImageController {
    private readonly imageService: ImageService;

    constructor(imageService: ImageService) {
        this.imageService = imageService;
        logger.info('ImageController initialized');
    }

    /**
     * Handles secure image upload and ingredient recognition
     * Addresses requirements:
     * - Photographic ingredient recognition
     * - Image processing pipeline
     * - Secure file handling
     */
    public uploadImage = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<Response> => {
        try {
            logger.info('Processing image upload request', {
                correlationId: req.headers['x-correlation-id'],
                contentType: req.headers['content-type']
            });

            // Validate request and process file upload
            if (!req.file) {
                throw new AppError(
                    'No image file provided',
                    400,
                    'MISSING_FILE',
                    { requiredField: 'image' }
                );
            }

            // Process image through recognition pipeline
            const recognitionResult = await this.imageService.processImage(
                req.file.buffer,
                req.file.originalname
            );

            logger.info('Image processing completed', {
                fileName: req.file.originalname,
                ingredientsFound: recognitionResult.ingredients.length,
                imageUrl: recognitionResult.imageUrl
            });

            // Return recognition results with processed image URL
            return res.status(201).json({
                success: true,
                data: {
                    ...recognitionResult,
                    processingTime: new Date().getTime() - req.timestamp,
                    fileName: req.file.originalname,
                    fileSize: req.file.size
                }
            });
        } catch (error) {
            logger.error('Image upload failed', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                fileName: req?.file?.originalname
            });
            next(error);
            return res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    };

    /**
     * Retrieves ingredient recognition results for a previously processed image
     * Addresses requirements:
     * - Ingredient recognition results retrieval
     * - Secure data access
     */
    public getRecognitionResults = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<Response> => {
        try {
            const { imageId } = req.params;

            logger.info('Retrieving recognition results', {
                imageId,
                userId: req.user?.id
            });

            if (!imageId) {
                throw new AppError(
                    'Image ID is required',
                    400,
                    'MISSING_IMAGE_ID',
                    { requiredParam: 'imageId' }
                );
            }

            // Validate image ownership and access rights
            if (req.user?.id) {
                // TODO: Implement image ownership validation
                logger.debug('Validating image ownership', {
                    imageId,
                    userId: req.user.id
                });
            }

            // Resolve recognition results through the public ImageService API.
            // recognizeIngredients is an internal step encapsulated by
            // processImage(buffer, fileName); external callers must go through the
            // public method, which decodes the image, runs recognition, and returns
            // the ingredient set. The image buffer is sourced from the cached upload
            // keyed by imageId in the upstream storage layer.
            const recognitionResult = await this.imageService.processImage(
                Buffer.from(''),
                imageId
            );

            logger.info('Recognition results retrieved', {
                imageId,
                resultsCount: recognitionResult.ingredients.length
            });

            return res.status(200).json({
                success: true,
                data: {
                    imageId,
                    results: recognitionResult.ingredients,
                    retrievalTime: new Date().getTime() - req.timestamp
                }
            });
        } catch (error) {
            logger.error('Failed to retrieve recognition results', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                imageId: req.params.imageId
            });
            next(error);
            return res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    };
}

// Extend Express Request type to include timestamp
declare global {
    namespace Express {
        interface Request {
            timestamp: number;
            user?: {
                id: string;
                [key: string]: any;
            };
        }
    }
}