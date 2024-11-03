import { s3Client } from '../config/aws';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid'; // ^8.3.2
import mime from 'mime-types'; // ^2.1.35
import sharp from 'sharp'; // ^0.32.0

// HUMAN TASKS:
// 1. Configure S3 bucket CORS policy for allowed origins
// 2. Set up bucket lifecycle rules for object expiration
// 3. Configure bucket versioning for file history
// 4. Set up bucket event notifications for file operations
// 5. Configure bucket encryption settings with AWS KMS
// 6. Set up IAM roles with appropriate S3 permissions
// 7. Configure VPC endpoints for S3 access if using private subnets

// Requirement: Storage Security - S3 bucket configuration
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'pantrychef-storage';
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const IMAGE_QUALITY = 80;

/**
 * Service class handling secure file storage operations using AWS S3 with encryption
 * Requirement: File Storage - S3 storage for image and static asset storage with AES-256 encryption
 */
export class StorageService {
    private readonly S3: typeof s3Client;
    private readonly bucketName: string;

    constructor() {
        // Requirement: Storage Security - Initialize S3 client with encryption
        this.S3 = s3Client;
        this.bucketName = S3_BUCKET;

        // Validate S3 client and bucket configuration
        this.validateConfiguration();
        logger.info('StorageService initialized', { bucket: this.bucketName });
    }

    /**
     * Validates S3 client and bucket configuration
     * Requirement: Storage Security - Validate storage configuration
     */
    private async validateConfiguration(): Promise<void> {
        try {
            await this.S3.headBucket({ Bucket: this.bucketName }).promise();
            logger.info('S3 bucket configuration validated', { bucket: this.bucketName });
        } catch (error) {
            logger.error('Failed to validate S3 configuration', { error });
            throw new AppError(
                'Storage service configuration error',
                500,
                'STORAGE_CONFIG_ERROR',
                { bucket: this.bucketName }
            );
        }
    }

    /**
     * Uploads and processes an image file to S3 with encryption
     * Requirement: Image Storage - Storage service for handling image uploads with secure access controls
     */
    public async uploadImage(
        fileBuffer: Buffer,
        fileName: string,
        mimeType: string
    ): Promise<string> {
        try {
            // Validate file type and size
            if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
                throw new AppError(
                    'Invalid file type',
                    400,
                    'INVALID_FILE_TYPE',
                    { allowedTypes: ALLOWED_MIME_TYPES }
                );
            }

            if (fileBuffer.length > MAX_FILE_SIZE) {
                throw new AppError(
                    'File size exceeds limit',
                    400,
                    'FILE_SIZE_EXCEEDED',
                    { maxSize: MAX_FILE_SIZE }
                );
            }

            // Process image using Sharp
            const processedImage = await sharp(fileBuffer)
                .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: IMAGE_QUALITY })
                .toBuffer();

            // Generate unique file name
            const uniqueFileName = `${uuidv4()}-${fileName}`;
            const fileExtension = mime.extension(mimeType);
            const key = `images/${uniqueFileName}.${fileExtension}`;

            // Configure upload with server-side encryption
            const uploadParams = {
                Bucket: this.bucketName,
                Key: key,
                Body: processedImage,
                ContentType: mimeType,
                ServerSideEncryption: 'AES256',
                Metadata: {
                    originalName: fileName,
                    processedAt: new Date().toISOString()
                }
            };

            // Upload to S3
            await this.S3.putObject(uploadParams).promise();

            logger.info('Image uploaded successfully', {
                key,
                size: processedImage.length,
                mimeType
            });

            return key;
        } catch (error) {
            logger.error('Failed to upload image', { error, fileName });
            throw new AppError(
                'Image upload failed',
                500,
                'IMAGE_UPLOAD_ERROR',
                { fileName }
            );
        }
    }

    /**
     * Retrieves an encrypted file from S3 storage
     * Requirement: Storage Security - Secure file retrieval with encryption
     */
    public async getFile(fileKey: string): Promise<Buffer> {
        try {
            const params = {
                Bucket: this.bucketName,
                Key: fileKey
            };

            const { Body } = await this.S3.getObject(params).promise();
            
            logger.info('File retrieved successfully', { fileKey });
            return Body as Buffer;
        } catch (error) {
            logger.error('Failed to retrieve file', { error, fileKey });
            throw new AppError(
                'File retrieval failed',
                500,
                'FILE_RETRIEVAL_ERROR',
                { fileKey }
            );
        }
    }

    /**
     * Securely deletes a file from S3 storage
     * Requirement: Storage Security - Secure file deletion
     */
    public async deleteFile(fileKey: string): Promise<void> {
        try {
            const params = {
                Bucket: this.bucketName,
                Key: fileKey
            };

            await this.S3.deleteObject(params).promise();
            
            logger.info('File deleted successfully', { fileKey });
        } catch (error) {
            logger.error('Failed to delete file', { error, fileKey });
            throw new AppError(
                'File deletion failed',
                500,
                'FILE_DELETION_ERROR',
                { fileKey }
            );
        }
    }

    /**
     * Generates a time-limited signed URL for secure file access
     * Requirement: Storage Security - Secure temporary file access
     */
    public async generateSignedUrl(
        fileKey: string,
        expirationTime: number = 3600
    ): Promise<string> {
        try {
            // Validate expiration time
            if (expirationTime <= 0 || expirationTime > 604800) {
                throw new AppError(
                    'Invalid expiration time',
                    400,
                    'INVALID_EXPIRATION',
                    { maxExpiration: 604800 }
                );
            }

            const params = {
                Bucket: this.bucketName,
                Key: fileKey,
                Expires: expirationTime
            };

            const signedUrl = await this.S3.getSignedUrlPromise('getObject', params);

            logger.info('Signed URL generated', {
                fileKey,
                expirationTime
            });

            return signedUrl;
        } catch (error) {
            logger.error('Failed to generate signed URL', { error, fileKey });
            throw new AppError(
                'Signed URL generation failed',
                500,
                'SIGNED_URL_ERROR',
                { fileKey }
            );
        }
    }
}