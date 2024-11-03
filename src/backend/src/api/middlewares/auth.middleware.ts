// @ts-check
import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { verifyToken, TokenPayload } from '../../utils/security';
import { AppError } from '../../utils/errors';
import { User } from '../../interfaces/user.interface';

/*
HUMAN TASKS:
1. Configure JWT secret and expiration time in environment variables
2. Set up role-based access control matrix in configuration
3. Configure token refresh mechanism
4. Set up security monitoring for authentication failures
5. Configure rate limiting for authentication endpoints
*/

/**
 * Extended Express Request interface with authenticated user data
 * Requirement: Authentication Security - Type safety for authenticated requests
 */
export interface AuthenticatedRequest extends Request {
  user?: User;
  tokenPayload?: TokenPayload;
}

/**
 * Authentication middleware that validates JWT tokens
 * Requirement: Authentication Security - JWT token validation for protected routes
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(
        'No authentication token provided',
        401,
        'ERR_NO_TOKEN',
        { header: authHeader }
      );
    }

    // Get token from Bearer scheme
    const token = authHeader.split(' ')[1];

    // Verify token and decode payload
    const tokenPayload = await verifyToken(token);

    // Attach token payload to request for downstream use
    req.tokenPayload = tokenPayload;

    // Attach basic user info from token for convenience
    req.user = {
      id: tokenPayload.userId,
      email: tokenPayload.email,
      // Other User interface fields are populated by subsequent middleware if needed
    } as User;

    next();
  } catch (error) {
    // Handle specific token verification errors
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(
        'Authentication failed',
        401,
        'ERR_AUTH_FAILED',
        { error: error.message }
      ));
    }
  }
}

/**
 * Role-based authorization middleware factory
 * Requirement: Authorization Matrix - Role-based access control implementation
 */
export function authorize(allowedRoles: string[]): (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void> {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Ensure request is authenticated
      if (!req.tokenPayload || !req.tokenPayload.roles) {
        throw new AppError(
          'User not authenticated',
          401,
          'ERR_NOT_AUTHENTICATED'
        );
      }

      // Get user roles from token payload
      const userRoles = req.tokenPayload.roles;

      // Check if user has any of the required roles
      const hasAllowedRole = userRoles.some(role => 
        allowedRoles.includes(role)
      );

      if (!hasAllowedRole) {
        throw new AppError(
          'Insufficient permissions',
          403,
          'ERR_UNAUTHORIZED',
          {
            userRoles,
            requiredRoles: allowedRoles
          }
        );
      }

      next();
    } catch (error) {
      // Handle authorization errors
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(
          'Authorization failed',
          403,
          'ERR_AUTH_FAILED',
          { error: error.message }
        ));
      }
    }
  };
}

// Export interfaces and middleware functions
export {
  authenticate,
  authorize,
  AuthenticatedRequest
};