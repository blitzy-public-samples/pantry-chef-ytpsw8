// @ts-check
import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { check, validationResult } from 'express-validator'; // ^6.14.0
import multer from 'multer';
import sharp from 'sharp'; // ^0.32.0
import path from 'path';
import { promisify } from 'util';
import { STORAGE_CONSTANTS } from '../../utils/constants';
import { ValidationError } from '../../utils/errors';

/*
HUMAN TASKS:
1. Create uploads directory at STORAGE_CONSTANTS.IMAGE_UPLOAD_PATH
2. Configure file system permissions for upload directory
3. Set up monitoring for disk space usage
4. Configure CDN for serving uploaded images
5. Set up backup policy for uploaded images
*/

// Requirement: Photographic Ingredient Recognition - Configure multer for image uploads
const configureMulter = (): multer.Multer => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(process.cwd(), STORAGE_CONSTANTS.IMAGE_UPLOAD_PATH));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });

  const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (STORAGE_CONSTANTS.ALLOWED_FILE_TYPES.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new ValidationError('Invalid file type', [
          {
            field: 'image',
            constraint: `File type must be one of: ${STORAGE_CONSTANTS.ALLOWED_FILE_TYPES.join(
              ', '
            )}`,
          },
        ])
      );
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: STORAGE_CONSTANTS.MAX_FILE_SIZE,
    },
  });
};

// Requirement: Data Validation - Validate image upload requests
const validateImageUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate file presence
    if (!req.file) {
      throw new ValidationError('No image file provided', [
        {
          field: 'image',
          constraint: 'Image file is required',
        },
      ]);
    }

    // Validate file size
    if (req.file.size > STORAGE_CONSTANTS.MAX_FILE_SIZE) {
      throw new ValidationError('File too large', [
        {
          field: 'image',
          constraint: `File size must not exceed ${
            STORAGE_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)
          }MB`,
        },
      ]);
    }

    // Validate image integrity and format using sharp
    const image = sharp(req.file.path);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height || !metadata.format) {
      throw new ValidationError('Invalid image file', [
        {
          field: 'image',
          constraint: 'File must be a valid image',
        },
      ]);
    }

    // Validate minimum dimensions for accurate recognition
    if (metadata.width < 300 || metadata.height < 300) {
      throw new ValidationError('Image dimensions too small', [
        {
          field: 'image',
          constraint: 'Image must be at least 300x300 pixels',
        },
      ]);
    }

    // Store metadata in request for later use
    req.imageMetadata = metadata;
    next();
  } catch (error: any) {
    next(error);
  }
};

// Requirement: Image Processing Security - Validate image metadata
const validateImageMetadata = async (metadata: any): Promise<boolean> => {
  const validationErrors = [];

  // Validate image capture timestamp if available
  if (metadata.exif?.timestamp) {
    const captureTime = new Date(metadata.exif.timestamp);
    const now = new Date();
    const timeDiff = now.getTime() - captureTime.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (timeDiff > maxAge) {
      validationErrors.push({
        field: 'timestamp',
        constraint: 'Image must have been captured within the last 24 hours',
      });
    }
  }

  // Validate image quality metrics
  if (metadata.density && metadata.density < 72) {
    validationErrors.push({
      field: 'quality',
      constraint: 'Image resolution too low for accurate recognition',
    });
  }

  // Validate color profile for ingredient recognition
  if (metadata.space && !['srgb', 'rgb'].includes(metadata.space.toLowerCase())) {
    validationErrors.push({
      field: 'colorSpace',
      constraint: 'Image must use sRGB or RGB color space',
    });
  }

  // Check for required EXIF data completeness
  if (!metadata.exif || Object.keys(metadata.exif).length === 0) {
    validationErrors.push({
      field: 'exif',
      constraint: 'Image must contain basic EXIF data',
    });
  }

  if (validationErrors.length > 0) {
    throw new ValidationError('Invalid image metadata', validationErrors);
  }

  return true;
};

// Configure multer middleware instance
const uploadMiddleware = configureMulter();

export { validateImageUpload, validateImageMetadata, uploadMiddleware };
