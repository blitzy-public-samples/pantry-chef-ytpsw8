// @ts-check
import crypto, { CipherKey } from 'crypto'; // built-in
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // ^9.0.0
import { jwtConfig } from '../config/jwt';
import { getKMSClient } from '../config/aws';
import { AppError } from './errors';
import configs from '../config/configs';

const AWS_KMS_KEY_ID = configs.providers.aws.kmsKeyId;
const ALGORITHM = 'aes-256-gcm';

/*
HUMAN TASKS:
1. Set up AWS KMS key for encryption in production environment
2. Configure bcrypt salt rounds based on security requirements
3. Set up JWT secret rotation policy
4. Configure rate limiting thresholds
5. Set up security monitoring and alerting
6. Review and update encryption standards periodically
*/

// Requirement: Data Security - Interface for encryption configuration
export interface EncryptionOptions {
  algorithm: string;
  keySize: number;
  ivLength: number;
}

// Requirement: Authentication Security - Interface for JWT token payload
export interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

// Default encryption configuration using AES-256-GCM
const DEFAULT_ENCRYPTION_OPTIONS: EncryptionOptions = {
  algorithm: 'aes-256-gcm',
  keySize: 32, // 256 bits
  ivLength: 16, // 128 bits
};

/**
 * Hashes a password using bcrypt with appropriate salt rounds
 * Requirement: Authentication Security - Secure password hashing
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const saltRounds = 12; // Industry standard for bcrypt
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error: any) {
    throw new AppError('Password hashing failed', 500, 'ERR_PASSWORD_HASH', {
      error: error.message,
    });
  }
}

/**
 * Compares a plain text password with a hashed password
 * Requirement: Authentication Security - Secure password verification
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error: any) {
    throw new AppError('Password comparison failed', 500, 'ERR_PASSWORD_COMPARE', {
      error: error.message,
    });
  }
}

/**
 * Encrypts data using AES-256-GCM with AWS KMS
 * Requirement: Data Security - AES-256 encryption implementation
 */
export async function encryptData(
  data: string,
  options: EncryptionOptions = DEFAULT_ENCRYPTION_OPTIONS
): Promise<string> {
  try {
    const kmsClient = getKMSClient();

    // Generate data key using KMS
    const { Plaintext: keyBuffer } = await kmsClient
      .generateDataKey({
        KeyId: AWS_KMS_KEY_ID,
        KeySpec: 'AES_256',
      })
      .promise();

    // Generate random IV
    const iv = crypto.randomBytes(options.ivLength);

    // Create cipher using key and IV
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer as CipherKey, iv);

    // Encrypt data
    let encryptedData = cipher.update(data, 'utf8', 'base64');
    encryptedData += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine IV, encrypted data, and auth tag
    const combined = Buffer.concat([iv, Buffer.from(encryptedData, 'base64'), authTag]);

    return combined.toString('base64');
  } catch (error: any) {
    throw new AppError('Data encryption failed', 500, 'ERR_ENCRYPTION', { error: error.message });
  }
}

/**
 * Decrypts AES-256-GCM encrypted data using AWS KMS
 * Requirement: Data Security - AES-256 decryption implementation
 */
export async function decryptData(
  encryptedData: string,
  options: EncryptionOptions = DEFAULT_ENCRYPTION_OPTIONS
): Promise<string> {
  try {
    const kmsClient = getKMSClient();
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract IV, encrypted data, and auth tag
    const iv = combined.slice(0, options.ivLength);
    const authTag = combined.slice(-16); // GCM auth tag is always 16 bytes
    const data = combined.slice(options.ivLength, combined.length - 16);

    // Get decryption key from KMS
    const { Plaintext: keyBuffer } = await kmsClient
      .decrypt({
        CiphertextBlob: Buffer.from(encryptedData, 'base64'),
        KeyId: process.env.AWS_KMS_KEY_ID,
      })
      .promise();

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer as CipherKey, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    let decryptedData = decipher.update(data.toString('base64'), 'base64', 'utf8');
    decryptedData += decipher.final('utf8');

    return decryptedData;
  } catch (error: any) {
    throw new AppError('Data decryption failed', 500, 'ERR_DECRYPTION', { error: error.message });
  }
}

/**
 * Generates a JWT token with provided payload
 * Requirement: Authentication Security - JWT token generation
 */
export async function generateToken(payload: TokenPayload): Promise<string> {
  try {
    // Validate payload structure
    if (!payload.userId || !payload.email || !Array.isArray(payload.roles)) {
      throw new Error('Invalid token payload structure');
    }

    // Add timestamp claims
    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiry
    };

    // Sign token
    return jwt.sign(tokenPayload, jwtConfig.secret, {
      algorithm: jwtConfig.algorithm as jwt.Algorithm,
    });
  } catch (error: any) {
    throw new AppError('Token generation failed', 500, 'ERR_TOKEN_GENERATION', {
      error: error.message,
    });
  }
}

/**
 * Verifies and decodes a JWT token
 * Requirement: Authentication Security - JWT token validation
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    // Verify token signature and decode payload
    const decoded = jwt.verify(token, jwtConfig.secret, {
      algorithms: jwtConfig.allowedAlgorithms as jwt.Algorithm[],
    }) as TokenPayload;

    // Validate decoded payload structure
    if (!decoded.userId || !decoded.email || !Array.isArray(decoded.roles)) {
      throw new Error('Invalid token payload structure');
    }

    return decoded;
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token has expired', 401, 'ERR_TOKEN_EXPIRED', { error: error.message });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', 401, 'ERR_TOKEN_INVALID', { error: error.message });
    }
    throw new AppError('Token verification failed', 500, 'ERR_TOKEN_VERIFICATION', {
      error: error.message,
    });
  }
}
