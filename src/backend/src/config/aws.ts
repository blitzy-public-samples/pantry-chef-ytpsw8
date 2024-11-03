import { S3, CloudWatch } from 'aws-sdk'; // ^2.1.0
import dotenv from 'dotenv'; // ^16.0.0
import { STORAGE_CONSTANTS } from '../utils/constants';
import logger from '../utils/logger';

// HUMAN TASKS:
// 1. Set up AWS credentials in .env file:
//    - AWS_ACCESS_KEY_ID
//    - AWS_SECRET_ACCESS_KEY
//    - AWS_REGION
// 2. Create S3 bucket and configure CORS policy
// 3. Set up CloudWatch log groups and retention policies
// 4. Configure CloudWatch alarms and notifications
// 5. Set up IAM roles with appropriate permissions
// 6. Configure VPC endpoints for AWS services if using private subnets

// Load environment variables
dotenv.config();

// Requirement: Cloud Infrastructure - AWS service configurations for ECS, S3, CloudWatch
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Configures global AWS SDK settings and credentials for all AWS services
 * Requirement: Cloud Infrastructure - AWS service configurations
 */
export const configureAWS = (): void => {
    try {
        // Configure AWS SDK with region and credentials
        AWS.config.update({
            region: AWS_REGION,
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
            maxRetries: 3
        });

        // Set up default retry policy for API calls
        AWS.config.apiVersions = {
            s3: '2006-03-01',
            cloudwatch: '2010-08-01'
        };

        // Configure SDK-wide encryption settings
        AWS.config.sslEnabled = true;
        AWS.config.paramValidation = true;

        // Set up CloudWatch logging options
        AWS.config.logger = console;

        logger.info('AWS SDK configured successfully', {
            region: AWS_REGION,
            environment: NODE_ENV
        });
    } catch (error) {
        logger.error('Failed to configure AWS SDK', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Creates and configures an S3 client instance with encryption and security settings
 * Requirement: Storage Service - S3 configuration for image and static asset storage with AES-256 encryption
 */
export const createS3Client = (): S3 => {
    try {
        const s3Client = new S3({
            region: AWS_REGION,
            apiVersion: '2006-03-01',
            signatureVersion: 'v4',
            // Configure server-side encryption with AES-256
            serverSideEncryption: STORAGE_CONSTANTS.ENCRYPTION_ALGORITHM,
            // Set up bucket parameters
            params: {
                Bucket: STORAGE_CONSTANTS.S3_BUCKET_NAME
            }
        });

        // Configure upload parameters and limits
        s3Client.config.update({
            httpOptions: {
                timeout: 300000, // 5 minutes
                connectTimeout: 5000 // 5 seconds
            },
            maxRetries: 3,
            // Set up CORS and security policies
            cors: {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                AllowedOrigins: ['*'],
                ExposeHeaders: ['ETag']
            }
        });

        logger.info('S3 client configured successfully', {
            bucket: STORAGE_CONSTANTS.S3_BUCKET_NAME,
            encryption: STORAGE_CONSTANTS.ENCRYPTION_ALGORITHM
        });

        return s3Client;
    } catch (error) {
        logger.error('Failed to create S3 client', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Creates and configures a CloudWatch client instance for metrics and logging
 * Requirement: Monitoring - CloudWatch configuration for logging and monitoring with AWS CloudWatch
 */
export const createCloudWatchClient = (): CloudWatch => {
    try {
        const cloudWatchClient = new CloudWatch({
            region: AWS_REGION,
            apiVersion: '2010-08-01'
        });

        // Configure logging parameters and retention policies
        const logGroupConfig = {
            logGroupName: `/pantrychef/${NODE_ENV}`,
            retentionInDays: 14
        };

        // Set up metric namespaces and dimensions
        const metricConfig = {
            namespace: 'PantryChef/Backend',
            dimensions: [
                {
                    Name: 'Environment',
                    Value: NODE_ENV
                }
            ]
        };

        // Configure alarm thresholds and notifications
        const alarmConfig = {
            evaluationPeriods: 2,
            datapointsToAlarm: 2,
            treatMissingData: 'notBreaching'
        };

        // Set up log stream settings
        cloudWatchClient.config.update({
            maxRetries: 3,
            httpOptions: {
                timeout: 5000
            },
            customUserAgent: 'PantryChef/1.0'
        });

        logger.info('CloudWatch client configured successfully', {
            logGroup: logGroupConfig.logGroupName,
            namespace: metricConfig.namespace
        });

        return cloudWatchClient;
    } catch (error) {
        logger.error('Failed to create CloudWatch client', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

// Initialize AWS clients
export const s3Client = createS3Client();
export const cloudWatchClient = createCloudWatchClient();

// Configure AWS SDK on module import
configureAWS();