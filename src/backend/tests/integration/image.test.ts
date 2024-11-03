/**
 * HUMAN TASKS:
 * 1. Configure test TensorFlow model weights in test S3 bucket
 * 2. Set up test environment variables for image processing
 * 3. Configure test S3 bucket with appropriate permissions
 * 4. Set up test database with sample recognition data
 * 5. Configure test image files with known ingredients
 */

import request from 'supertest'; // ^6.3.0
import { Express } from 'express';
import path from 'path';
import fs from 'fs';
import MockS3 from 'mock-aws-s3'; // ^4.0.0
import { ImageController } from '../../src/api/controllers/image.controller';
import { ImageService } from '../../src/services/image.service';
import { AppError } from '../../src/utils/errors';
import { app } from '../../src/app';

// Mock AWS S3 for testing
MockS3.config.basePath = path.join(__dirname, '../.tmp/buckets');

// Test data setup
const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
const invalidImagePath = path.join(__dirname, '../fixtures/invalid-image.txt');
const testImageBuffer = fs.readFileSync(testImagePath);
const invalidImageBuffer = fs.readFileSync(invalidImagePath);

// Mock recognition response
const mockRecognitionResponse = {
    ingredients: [
        {
            name: 'tomato',
            confidence: 0.95,
            category: 'PRODUCE',
            recognitionTags: ['tomato', 'roma', 'cherry']
        },
        {
            name: 'onion',
            confidence: 0.88,
            category: 'PRODUCE',
            recognitionTags: ['onion', 'yellow onion']
        }
    ],
    imageUrl: 'https://test-bucket.s3.amazonaws.com/processed/test-image.jpg'
};

describe('Image Recognition Integration Tests', () => {
    let expressApp: Express;
    let imageService: ImageService;
    let imageController: ImageController;
    let s3ClientMock: any;

    beforeAll(async () => {
        // Initialize test environment
        process.env.NODE_ENV = 'test';
        process.env.S3_BUCKET = 'test-bucket';
        process.env.TF_MODEL_PATH = 'test-models/ingredient-recognition/v1';

        // Initialize mock S3
        s3ClientMock = new MockS3();
        await s3ClientMock.createBucket({ Bucket: 'test-bucket' });

        // Initialize services and controllers
        imageService = new ImageService();
        imageController = new ImageController(imageService);

        // Initialize express app with test configuration
        expressApp = app;
    });

    afterAll(async () => {
        // Clean up test resources
        await s3ClientMock.deleteBucket({ Bucket: 'test-bucket' });
        fs.rmdirSync(path.join(__dirname, '../.tmp'), { recursive: true });
    });

    describe('POST /api/images/upload', () => {
        // Test: Successful image upload and recognition
        it('should successfully process and recognize ingredients in an image', async () => {
            // Requirement: Image Recognition Testing - Complete flow test
            const response = await request(expressApp)
                .post('/api/images/upload')
                .attach('image', testImageBuffer, 'test-image.jpg')
                .set('Content-Type', 'multipart/form-data')
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('ingredients');
            expect(response.body.data).toHaveProperty('imageUrl');
            expect(response.body.data.ingredients).toBeInstanceOf(Array);
            expect(response.body.data.ingredients.length).toBeGreaterThan(0);
            expect(response.body.data.processingTime).toBeDefined();
        });

        // Test: Invalid file format
        it('should return 400 for invalid file format', async () => {
            // Requirement: Quality Assurance - Error handling test
            const response = await request(expressApp)
                .post('/api/images/upload')
                .attach('image', invalidImageBuffer, 'invalid.txt')
                .set('Content-Type', 'multipart/form-data')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
        });

        // Test: Missing file
        it('should return 400 when no file is provided', async () => {
            // Requirement: Quality Assurance - Validation test
            const response = await request(expressApp)
                .post('/api/images/upload')
                .set('Content-Type', 'multipart/form-data')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('MISSING_FILE');
        });

        // Test: Oversized file
        it('should return 400 for oversized files', async () => {
            // Create large test file buffer
            const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

            const response = await request(expressApp)
                .post('/api/images/upload')
                .attach('image', largeBuffer, 'large-image.jpg')
                .set('Content-Type', 'multipart/form-data')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('FILE_TOO_LARGE');
        });

        // Test: S3 upload failure
        it('should handle S3 upload failures gracefully', async () => {
            // Mock S3 upload failure
            s3ClientMock.upload = jest.fn().mockRejectedValue(new Error('S3 Error'));

            const response = await request(expressApp)
                .post('/api/images/upload')
                .attach('image', testImageBuffer, 'test-image.jpg')
                .set('Content-Type', 'multipart/form-data')
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('ERR_IMG_PROCESS');
            expect(response.body.error.context.context).toBe('s3_upload');
        });

        // Test: TensorFlow recognition failure
        it('should handle recognition failures gracefully', async () => {
            // Mock TensorFlow recognition failure
            jest.spyOn(imageService, 'recognizeIngredients')
                .mockRejectedValue(new AppError('Recognition failed', 500, 'ERR_IMG_PROCESS'));

            const response = await request(expressApp)
                .post('/api/images/upload')
                .attach('image', testImageBuffer, 'test-image.jpg')
                .set('Content-Type', 'multipart/form-data')
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('ERR_IMG_PROCESS');
        });
    });

    describe('GET /api/images/:id/recognition', () => {
        let testImageId: string;

        beforeEach(async () => {
            // Upload test image to get ID
            const uploadResponse = await request(expressApp)
                .post('/api/images/upload')
                .attach('image', testImageBuffer, 'test-image.jpg')
                .set('Content-Type', 'multipart/form-data');

            testImageId = uploadResponse.body.data.imageId;
        });

        // Test: Successful recognition results retrieval
        it('should successfully retrieve recognition results', async () => {
            // Requirement: Image Recognition Testing - Results retrieval test
            const response = await request(expressApp)
                .get(`/api/images/${testImageId}/recognition`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('results');
            expect(response.body.data.results).toBeInstanceOf(Array);
            expect(response.body.data.imageId).toBe(testImageId);
        });

        // Test: Invalid image ID
        it('should return 400 for invalid image ID', async () => {
            const response = await request(expressApp)
                .get('/api/images/invalid-id/recognition')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('INVALID_IMAGE_ID');
        });

        // Test: Non-existent image
        it('should return 404 for non-existent image', async () => {
            const response = await request(expressApp)
                .get('/api/images/non-existent-id/recognition')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('NOT_FOUND');
        });

        // Test: Unauthorized access
        it('should return 401 for unauthorized access', async () => {
            const response = await request(expressApp)
                .get(`/api/images/${testImageId}/recognition`)
                .set('Authorization', 'invalid-token')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('UNAUTHORIZED');
        });
    });

    describe('Image Processing Pipeline', () => {
        // Test: Image preprocessing
        it('should preprocess images correctly', async () => {
            const processedImage = await imageService.preprocessImage(testImageBuffer);
            
            expect(processedImage).toBeInstanceOf(Buffer);
            expect(processedImage.length).toBeLessThan(testImageBuffer.length);
        });

        // Test: TensorFlow recognition
        it('should perform TensorFlow recognition successfully', async () => {
            const results = await imageService.recognizeIngredients(testImageBuffer);
            
            expect(results).toBeInstanceOf(Array);
            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result).toHaveProperty('name');
                expect(result).toHaveProperty('confidence');
                expect(result).toHaveProperty('category');
                expect(result).toHaveProperty('recognitionTags');
                expect(result.confidence).toBeGreaterThanOrEqual(0.75);
            });
        });

        // Test: S3 storage integration
        it('should store processed images in S3 correctly', async () => {
            const imageUrl = await imageService.uploadToS3(
                testImageBuffer,
                'test-image.jpg'
            );

            expect(imageUrl).toMatch(/^https:\/\/test-bucket\.s3\.amazonaws\.com\/processed\//);
            
            // Verify file exists in mock S3
            const storedFile = await s3ClientMock.getObject({
                Bucket: 'test-bucket',
                Key: imageUrl.split('/').pop()
            });
            expect(storedFile).toBeDefined();
            expect(storedFile.Body).toBeInstanceOf(Buffer);
        });

        // Test: End-to-end processing
        it('should complete the entire processing pipeline successfully', async () => {
            const result = await imageService.processImage(
                testImageBuffer,
                'test-image.jpg'
            );

            expect(result).toHaveProperty('ingredients');
            expect(result).toHaveProperty('imageUrl');
            expect(result.ingredients).toBeInstanceOf(Array);
            expect(result.ingredients.length).toBeGreaterThan(0);
            expect(result.imageUrl).toMatch(/^https:\/\/test-bucket\.s3\.amazonaws\.com\/processed\//);
        });
    });
});