/**
 * Authentication error classes for consistent error handling.
 * All errors follow RFC 9457 Problem Details format.
 */

import type { AuthErrorCode, AuthErrorData } from '../types';

/**
 * Base authentication error class.
 */
export class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(error: AuthErrorData) {
    super(error.message);
    this.name = 'AuthError';
    this.code = error.code;
    this.statusCode = error.statusCode;
    this.details = error.details;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }

  /**
   * Convert to RFC 9457 Problem Details format.
   */
  toProblemDetails(): Record<string, unknown> {
    return {
      type: `https://api.tnsi.app/errors/${this.code.toLowerCase()}`,
      title: this.code.replace(/_/g, ' ').toLowerCase(),
      status: this.statusCode,
      detail: this.message,
      code: this.code,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

/**
 * 401 - No valid authentication credentials provided.
 */
export class UnauthenticatedError extends AuthError {
  constructor(message = 'Authentication required', details?: Record<string, unknown>) {
    super({
      code: 'UNAUTHENTICATED',
      message,
      statusCode: 401,
      details,
    });
    this.name = 'UnauthenticatedError';
  }
}

/**
 * 401 - Token is invalid, expired, or malformed.
 */
export class TokenInvalidError extends AuthError {
  constructor(message = 'Token is invalid or expired', details?: Record<string, unknown>) {
    super({
      code: 'TOKEN_INVALID',
      message,
      statusCode: 401,
      details,
    });
    this.name = 'TokenInvalidError';
  }
}

/**
 * 401 - Session was revoked (e.g., password change, admin revoke).
 */
export class SessionRevokedError extends AuthError {
  constructor(message = 'Session has been revoked', details?: Record<string, unknown>) {
    super({
      code: 'SESSION_REVOKED',
      message,
      statusCode: 401,
      details,
    });
    this.name = 'SessionRevokedError';
  }
}

/**
 * 403 - Required entitlement not present.
 */
export class EntitlementRequiredError extends AuthError {
  constructor(
    required: string[],
    current: string[],
    message = 'Required entitlement not present',
    details?: Record<string, unknown>,
  ) {
    super({
      code: 'ENTITLEMENT_REQUIRED',
      message,
      statusCode: 403,
      details: { required, current, ...details },
    });
    this.name = 'EntitlementRequiredError';
  }
}

/**
 * 429 - Rate limit exceeded.
 */
export class RateLimitedError extends AuthError {
  constructor(
    retryAfter: number,
    message = 'Rate limit exceeded',
    details?: Record<string, unknown>,
  ) {
    super({
      code: 'RATE_LIMITED',
      message,
      statusCode: 429,
      details: { retryAfter, ...details },
    });
    this.name = 'RateLimitedError';
  }
}

/**
 * 404 - User not found in database.
 */
export class UserNotFoundError extends AuthError {
  constructor(identifier: string, message = 'User not found', details?: Record<string, unknown>) {
    super({
      code: 'USER_NOT_FOUND',
      message,
      statusCode: 404,
      details: { identifier, ...details },
    });
    this.name = 'UserNotFoundError';
  }
}

/**
 * 400 - Clerk webhook signature verification failed.
 */
export class WebhookVerificationFailedError extends AuthError {
  constructor(
    message = 'Webhook signature verification failed',
    details?: Record<string, unknown>,
  ) {
    super({
      code: 'WEBHOOK_VERIFICATION_FAILED',
      message,
      statusCode: 400,
      details,
    });
    this.name = 'WebhookVerificationFailedError';
  }
}

/**
 * Type guard to check if an error is an AuthError.
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Convert any error to an AuthError.
 */
export function toAuthError(error: unknown): AuthError {
  if (isAuthError(error)) {
    return error;
  }
  if (error instanceof Error) {
    return new AuthError({
      code: 'UNAUTHENTICATED',
      message: error.message,
      statusCode: 401,
    });
  }
  return new AuthError({
    code: 'UNAUTHENTICATED',
    message: 'Unknown authentication error',
    statusCode: 401,
  });
}
