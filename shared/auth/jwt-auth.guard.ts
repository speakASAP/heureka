/**
 * JWT Auth Guard
 * Validates JWT tokens locally (fast, no HTTP calls to auth-microservice)
 * Falls back to auth-microservice for token refresh operations
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { AuthUser } from './auth.interface';

type HttpStatusError = Error & { status?: number; statusCode?: number };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor(
    private readonly authService: AuthService, // Keep for potential fallback
  ) {
    // Get JWT_SECRET from environment directly (ConfigModule is global, but this is more reliable)
    this.jwtSecret = process.env.JWT_SECRET || this.throwConfigError('JWT_SECRET');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    const path = request.url || request.path || 'unknown';
    
    console.log(`[${timestamp}] [TIMING] JwtAuthGuard.canActivate START - Guard execution started`, {
      path,
      method: request.method,
    });
    
    try {
      const tokenExtractStartTime = Date.now();
      const token = this.extractTokenFromHeader(request);
      const tokenExtractDuration = Date.now() - tokenExtractStartTime;

      if (!token) {
        throw this.unauthorized('No token provided');
      }

      // Validate JWT token locally (fast, no HTTP calls)
      const validationStartTime = Date.now();
      let decoded: any;
      
      try {
        // Verify token signature and expiration locally
        decoded = jwt.verify(token, this.jwtSecret);
        
        // Check if token is expired (jwt.verify already does this, but double-check)
        if (decoded.exp && decoded.exp < Date.now() / 1000) {
          throw this.unauthorized('Token expired');
        }

        const validationDuration = Date.now() - validationStartTime;
        const totalGuardDuration = Date.now() - startTime;

        console.log(`[${new Date().toISOString()}] [TIMING] JwtAuthGuard.canActivate COMPLETE (${totalGuardDuration}ms total, token extract: ${tokenExtractDuration}ms, validation: ${validationDuration}ms)`, {
          path,
          method: request.method,
          totalDurationMs: totalGuardDuration,
          tokenExtractDurationMs: tokenExtractDuration,
          validationDurationMs: validationDuration,
        });

        // Log decoded token structure for debugging (temporarily enabled to diagnose issue)
        console.log('[JwtAuthGuard] Decoded token structure', {
          keys: Object.keys(decoded),
          hasId: !!decoded.id,
          hasSub: !!decoded.sub,
          hasUserId: !!decoded.userId,
          hasEmail: !!decoded.email,
          decodedSample: {
            id: decoded.id,
            sub: decoded.sub,
            userId: decoded.userId,
            email: decoded.email,
            iat: decoded.iat,
            exp: decoded.exp,
          },
        });

        // Transform decoded token to AuthUser format
        // Try multiple possible field names for user ID
        const userId = decoded.id || decoded.sub || decoded.userId || decoded.user?.id || decoded.user?.userId || decoded.user?.sub;
        const userEmail = decoded.email || decoded.user?.email || decoded.userEmail || '';

        // Ensure userId is a valid string
        const userIdString = userId ? String(userId) : '';
        
        const user: AuthUser = {
          id: userIdString, // Ensure it's a string
          email: userEmail,
          firstName: decoded.firstName || decoded.user?.firstName || decoded.first_name,
          lastName: decoded.lastName || decoded.user?.lastName || decoded.last_name,
          phone: decoded.phone || decoded.user?.phone,
          isActive: decoded.isActive !== false && decoded.user?.isActive !== false, // Default to true if not specified
          isVerified: decoded.isVerified !== false && decoded.user?.isVerified !== false, // Default to true if not specified
          roles: this.extractRoles(decoded),
          createdAt: decoded.createdAt || decoded.user?.createdAt || decoded.iat ? new Date(decoded.iat * 1000).toISOString() : undefined,
          updatedAt: decoded.updatedAt || decoded.user?.updatedAt,
        };

        // Validate that we have at least an ID (email can be optional for some tokens)
        if (!user.id || user.id === 'undefined' || user.id === 'null') {
          if (process.env.NODE_ENV === 'development') {
            console.error('[JwtAuthGuard] Invalid token payload - missing user ID', {
              decoded,
              extractedUserId: userId,
            });
          }
          throw this.unauthorized('Invalid token payload: missing user ID');
        }

        // Email is preferred but not strictly required if we have a valid ID
        // Some tokens might not include email in the payload
        if (!user.email) {
          // Try to extract from user object if present
          if (decoded.user && decoded.user.email) {
            user.email = decoded.user.email;
          } else {
            // If still no email, use a placeholder (some systems don't include email in JWT)
            user.email = `user-${user.id}@unknown`;
            if (process.env.NODE_ENV === 'development') {
              console.warn('[JwtAuthGuard] Token missing email, using placeholder', { userId: user.id });
            }
          }
        }

        // Attach user to request
        request.user = user;

        // Log successful validation (only in debug mode to avoid log spam)
        if (process.env.NODE_ENV === 'development') {
          console.log(`[JwtAuthGuard] Token validated locally for ${path}`, {
            userId: user.id,
            email: user.email,
            validationDuration: `${validationDuration}ms`,
            totalDuration: `${Date.now() - startTime}ms`,
          });
        }

        return true;
      } catch (jwtError: any) {
        // JWT verification failed (invalid signature, expired, malformed, etc.)
        const validationDuration = Date.now() - validationStartTime;
        
        if (process.env.NODE_ENV === 'development') {
          console.error(`[JwtAuthGuard] Local token validation failed for ${path}`, {
            error: jwtError.message,
            errorType: jwtError.name,
            validationDuration: `${validationDuration}ms`,
            totalDuration: `${Date.now() - startTime}ms`,
          });
        }

        // Throw UnauthorizedException for any JWT verification errors
        if (this.isUnauthorizedError(jwtError)) {
          throw jwtError;
        }
        if (jwtError.name === 'TokenExpiredError') {
          throw this.unauthorized('Token expired');
        } else if (jwtError.name === 'JsonWebTokenError') {
          throw this.unauthorized('Invalid token');
        } else {
          throw this.unauthorized('Token validation failed');
        }
      }
    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      
      // Only log errors in development or if it's not a standard auth failure
      if (process.env.NODE_ENV === 'development' || !(this.isUnauthorizedError(error))) {
        console.error(`[JwtAuthGuard] Authentication failed for ${path}`, {
          error: error.message,
          errorType: error.constructor?.name,
          totalDuration: `${totalDuration}ms`,
          timestamp: new Date().toISOString(),
        });
      }

      // Ensure we always throw UnauthorizedException for auth failures
      if (this.isUnauthorizedError(error)) {
        throw error;
      }
      // If any other error occurs, throw UnauthorizedException
      throw this.unauthorized('Authentication failed');
    }
  }

  private unauthorized(message: string): HttpStatusError {
    const error = new Error(message) as HttpStatusError;
    error.name = 'UnauthorizedError';
    error.status = 401;
    error.statusCode = 401;
    return error;
  }

  private isUnauthorizedError(error: unknown): error is HttpStatusError {
    return Boolean(
      error &&
        typeof error === 'object' &&
        ((error as HttpStatusError).status === 401 || (error as HttpStatusError).statusCode === 401),
    );
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractRoles(decoded: any): string[] {
    const candidates = [
      decoded?.roles,
      decoded?.role,
      decoded?.user?.roles,
      decoded?.user?.role,
      decoded?.scope,
      decoded?.scopes,
      decoded?.permissions,
    ];

    const roles = new Set<string>();
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        candidate.forEach((role) => this.addRole(roles, role));
      } else if (typeof candidate === 'string') {
        candidate.split(/[,\s]+/).forEach((role) => this.addRole(roles, role));
      }
    }
    return Array.from(roles);
  }

  private addRole(roles: Set<string>, role: unknown): void {
    const normalized = String(role || '').trim();
    if (normalized) {
      roles.add(normalized);
    }
  }

  private throwConfigError(key: string): never {
    throw new Error(`Missing required environment variable: ${key}. Please set JWT_SECRET in your .env file (must match auth-microservice JWT_SECRET).`);
  }
}

