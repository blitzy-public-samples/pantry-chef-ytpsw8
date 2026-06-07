// @ts-check
import crypto from 'crypto'; // built-in
import bcrypt from 'bcryptjs'; // ^2.4.3
import jwt from 'jsonwebtoken'; // ^9.0.0
import { jwtConfig } from '../config/jwt';
import { getKMSClient } from '../config/aws';
import { AppError } from './errors';

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
  ivLength: 16 // 128 bits
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
  } catch (error) {
    throw new AppError(
      'Password hashing failed',
      500,
      'ERR_PASSWORD_HASH',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Compares a plain text password with a hashed password
 * Requirement: Authentication Security - Secure password verification
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new AppError(
      'Password comparison failed',
      500,
      'ERR_PASSWORD_COMPARE',
      { error: error instanceof Error ? error.message : String(error) }
    );
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
    const { Plaintext: keyBuffer } = await kmsClient.generateDataKey({
      KeyId: process.env.AWS_KMS_KEY_ID ?? '',
      KeySpec: 'AES_256'
    }).promise();

    // Generate random IV
    const iv = crypto.randomBytes(options.ivLength);
    
    // Create cipher using key and IV. The KMS plaintext key is a Buffer at runtime;
    // it is narrowed to crypto.CipherKey for the strict createCipheriv key parameter.
    const cipher = crypto.createCipheriv(
      options.algorithm,
      keyBuffer as crypto.CipherKey,
      iv
    );
    
    // Encrypt data
    let encryptedData = cipher.update(data, 'utf8', 'base64');
    encryptedData += cipher.final('base64');
    
    // Get authentication tag. `createCipheriv` is typed to the generic `Cipher` when the
    // algorithm is a string; GCM mode exposes `getAuthTag()` on `CipherGCM`, so the cipher
    // is narrowed to `CipherGCM` (the configured algorithm is AES-256-GCM).
    const authTag = (cipher as crypto.CipherGCM).getAuthTag();
    
    // Combine IV, encrypted data, and auth tag
    const combined = Buffer.concat([
      iv,
      Buffer.from(encryptedData, 'base64'),
      authTag
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    throw new AppError(
      'Data encryption failed',
      500,
      'ERR_ENCRYPTION',
      { error: error instanceof Error ? error.message : String(error) }
    );
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
    const data = combined.slice(
      options.ivLength,
      combined.length - 16
    );
    
    // Get decryption key from KMS
    const { Plaintext: keyBuffer } = await kmsClient.decrypt({
      CiphertextBlob: Buffer.from(encryptedData, 'base64'),
      KeyId: process.env.AWS_KMS_KEY_ID
    }).promise();
    
    // Create decipher. The KMS plaintext key is a Buffer at runtime; it is narrowed to
    // crypto.CipherKey for the strict createDecipheriv key parameter.
    const decipher = crypto.createDecipheriv(
      options.algorithm,
      keyBuffer as crypto.CipherKey,
      iv
    );
    // GCM mode exposes `setAuthTag()` on `DecipherGCM`; narrow from the generic `Decipher`
    // returned by `createDecipheriv` with a string algorithm.
    (decipher as crypto.DecipherGCM).setAuthTag(authTag);
    
    // Decrypt data
    let decryptedData = decipher.update(data.toString('base64'), 'base64', 'utf8');
    decryptedData += decipher.final('utf8');
    
    return decryptedData;
  } catch (error) {
    throw new AppError(
      'Data decryption failed',
      500,
      'ERR_DECRYPTION',
      { error: error instanceof Error ? error.message : String(error) }
    );
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
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
    };
    
    // Sign token
    return jwt.sign(
      tokenPayload,
      jwtConfig.secret,
      {
        algorithm: jwtConfig.algorithm as jwt.Algorithm
      }
    );
  } catch (error) {
    throw new AppError(
      'Token generation failed',
      500,
      'ERR_TOKEN_GENERATION',
      { error: error instanceof Error ? error.message : String(error) }
    );
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
      algorithms: jwtConfig.allowedAlgorithms as jwt.Algorithm[]
    }) as TokenPayload;
    
    // Validate decoded payload structure. A correctly-signed token missing required claims
    // (email/roles) is an invalid-token (client) condition, not a server fault: throw a 401
    // AppError (FINDING-AUTH-01) — not a plain Error that would fall through to a 500 below.
    if (!decoded.userId || !decoded.email || !Array.isArray(decoded.roles)) {
      throw new AppError('Invalid token', 401, 'ERR_TOKEN_INVALID');
    }
    
    return decoded;
  } catch (error) {
    // An AppError thrown above (e.g. the 401 invalid-payload case) is already client-safe and
    // correctly classified — re-throw it unchanged so it is not re-wrapped as a 500 below
    // (FINDING-AUTH-01).
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(
        'Token has expired',
        401,
        'ERR_TOKEN_EXPIRED',
        { error: error.message }
      );
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError(
        'Invalid token',
        401,
        'ERR_TOKEN_INVALID',
        { error: error.message }
      );
    }
    throw new AppError(
      'Token verification failed',
      500,
      'ERR_TOKEN_VERIFICATION',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}