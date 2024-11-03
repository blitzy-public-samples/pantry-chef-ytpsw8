import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import multer from 'multer'; // ^1.4.5-lts.1
import sharp from 'sharp'; // ^0.32.0
import { StorageService } from '../../services/storage.service';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';

// HUMAN TASKS:
// 1. Configure multer memory limits in environment variables
// 2. Set up monitoring for file upload metrics
// 3. Configure image optimization parameters based on infrastructure capacity
// 4. Set up alerts for upload failures and processing errors
// 5. Configure CORS settings for file upload endpoints

// Requirement: Image Upload - File type and size restrictions
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5242880; // 5MB
const IMAGE_QUALITY = 80;
const MAX_IMAGE_DIMENSION = 2048;

// Initialize storage service
const storageService = new StorageService();

/**
 * Validates file type against allowed MIME types
 * Requirement: Security - File type validation
 */
const validateFileType = (mimeType: string): boolean => {
    return ALLOWED_MIME_TYPES.includes(mimeType);
};

/**
 * Validates file size against maximum allowed limit
 * Requirement: Security - File size validation
 */
const validateFileSize = (fileSize: number): boolean => {
    return fileSize <= MAX_FILE_SIZE;
};

/**
 * Optimizes image for storage and processing using Sharp
 * Requirement: Image Upload - Image optimization and preprocessing
 */
const optimizeImage = async (imageBuffer: Buffer): Promise<Buffer> => {
    try {
        const processedImage = await sharp(imageBuffer)
            .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: IMAGE_QUALITY })
            .toBuffer();

        logger.info('Image optimized successfully', {
            originalSize: imageBuffer.length,
            processedSize: processedImage.length
        });

        return processedImage;
    } catch (error) {
        logger.error('Image optimization failed', { error });
        throw new AppError(
            'Failed to optimize image',
            500,
            'IMAGE_OPTIMIZATION_ERROR',
            { error: error.message }
        );
    }
};

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        if (!validateFileType(file.mimetype)) {
            cb(new AppError(
                'Invalid file type',
                400,
                'INVALID_FILE_TYPE',
                { 
                    allowedTypes: ALLOWED_MIME_TYPES,
                    receivedType: file.mimetype
                }
            ));
            return;
        }
        cb(null, true);
    }
});

/**
 * Express middleware for handling secure file uploads with validation and storage
 * Requirement: Image Upload - Secure file upload handling with validation
 */
export const uploadMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Handle file upload using multer
        upload.single('image')(req, res, async (err) => {
            if (err) {
                if (err instanceof multer.MulterError) {
                    logger.error('Multer upload error', { error: err });
                    next(new AppError(
                        'File upload failed',
                        400,
                        'UPLOAD_ERROR',
                        { error: err.message }
                    ));
                    return;
                }
                next(err);
                return;
            }

            if (!req.file) {
                next(new AppError(
                    'No file uploaded',
                    400,
                    'NO_FILE_ERROR',
                    { requiredField: 'image' }
                ));
                return;
            }

            try {
                // Validate file size
                if (!validateFileSize(req.file.size)) {
                    throw new AppError(
                        'File size exceeds limit',
                        400,
                        'FILE_SIZE_ERROR',
                        {
                            maxSize: MAX_FILE_SIZE,
                            receivedSize: req.file.size
                        }
                    );
                }

                // Optimize image
                const optimizedImage = await optimizeImage(req.file.buffer);

                // Upload to S3 using StorageService
                const fileKey = await storageService.uploadImage(
                    optimizedImage,
                    req.file.originalname,
                    req.file.mimetype
                );

                // Add file URL to request object for next middleware
                req.fileKey = fileKey;

                // Log successful upload
                logger.info('File upload successful', {
                    fileName: req.file.originalname,
                    fileSize: optimizedImage.length,
                    fileKey
                });

                next();
            } catch (error) {
                logger.error('Upload processing error', { error });
                next(error);
            }
        });
    } catch (error) {
        logger.error('Upload middleware error', { error });
        next(new AppError(
            'Upload middleware failed',
            500,
            'UPLOAD_MIDDLEWARE_ERROR',
            { error: error.message }
        ));
    }
};

// Extend Express Request type to include fileKey
declare global {
    namespace Express {
        interface Request {
            fileKey?: string;
        }
    }
}