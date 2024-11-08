/**
 * HUMAN TASKS:
 * 1. Set up environment variables for OAuth providers:
 *    - GOOGLE_CLIENT_ID
 *    - GOOGLE_CLIENT_SECRET
 *    - FACEBOOK_CLIENT_ID
 *    - FACEBOOK_CLIENT_SECRET
 * 2. Configure JWT secrets:
 *    - JWT_SECRET
 *    - JWT_SIGNING_KEY
 *    - JWT_ENCRYPTION_KEY
 * 3. Set up SSL certificates for secure authentication
 * 4. Configure rate limiting for authentication endpoints
 */

// @version next-auth ^4.22.1
import NextAuth from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';

// Internal dependencies
import { AuthService } from '../../../services/auth.service';
import { LoginCredentials, AuthResponse } from '../../../interfaces/auth.interface';
import { APP_ROUTES } from '../../../config/constants';

// Initialize auth service
const authService = new AuthService();

/**
 * NextAuth.js configuration
 * Implements requirements:
 * - Authentication Service (5.1)
 * - Security Protocols (9.3.1)
 * - Access Control (9.2.1)
 * - OAuth Integration (5.1)
 */
export default NextAuth({
  // Configure authentication providers
  providers: [
    // Credentials Provider for email/password authentication
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: {
          label: 'Email',
          type: 'text',
          placeholder: 'email@example.com'
        },
        password: {
          label: 'Password',
          type: 'password'
        }
      },
      // Authorize function for credentials validation
      async authorize(credentials): Promise<any> {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Invalid credentials');
          }

          // Authenticate using AuthService
          const loginCredentials: LoginCredentials = {
            email: credentials.email,
            password: credentials.password,
            rememberMe: true
          };

          const response: AuthResponse = await authService.login(loginCredentials);

          if (!response || !response.token) {
            throw new Error('Authentication failed');
          }

          // Return user object with tokens
          return {
            id: response.user.id,
            email: response.user.email,
            name: `${response.user.firstName} ${response.user.lastName}`,
            // image: response.user.avatar,
            accessToken: response.token,
            refreshToken: response.refreshToken
          };
        } catch (error) {
          throw new Error('Authentication failed');
        }
      }
    }),

    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),

    // Facebook OAuth Provider
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'email'
        }
      }
    })
  ],

  // Session configuration
  session: {
    strategy: 'jwt',
    maxAge: 2592000, // 30 days
    updateAge: 86400 // 24 hours
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    // signingKey: process.env.JWT_SIGNING_KEY,
    // encryptionKey: process.env.JWT_ENCRYPTION_KEY,
    maxAge: 2592000, // 30 days
    // encryption: true,
  },

  // Pages configuration
  pages: {
    signIn: APP_ROUTES.LOGIN,
    error: APP_ROUTES.LOGIN,
  },

  // Callbacks configuration
  callbacks: {
    // JWT callback for token customization
    async jwt({ token, user, account }): Promise<JWT> {
      if (user && account) {
        // token.accessToken = user.accessToken;
        // token.refreshToken = user.refreshToken;
        // token.provider = account.provider;
      }

      // Check token expiration and refresh if needed
      if (token && authService.isAuthenticated()) {
        try {
          const response = await authService.refreshToken();
          token.accessToken = response.token;
          token.refreshToken = response.refreshToken;
        } catch (error) {
          return token;
        }
      }

      return token;
    },

    // Session callback for client-side session handling
    async session({ session, token }): Promise<any> {
      if (token) {
        // session.accessToken = token.accessToken;
        // session.refreshToken = token.refreshToken;
        // session.provider = token.provider;
      }
      return session;
    },

    // Sign in callback for additional validation
    async signIn({ user, account }): Promise<boolean> {
      try {
        if (account?.provider === 'credentials') {
          return !!user;
        }

        // Validate OAuth sign in
        if (account?.access_token) {
          // Additional OAuth validation could be implemented here
          return true;
        }

        return false;
      } catch (error) {
        return false;
      }
    }
  },

  // Enable debug logs in development
  debug: process.env.NODE_ENV === 'development',

  // Security options
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: APP_ROUTES.HOME,
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
});