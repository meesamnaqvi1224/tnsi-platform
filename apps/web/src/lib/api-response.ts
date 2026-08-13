import { NextResponse } from 'next/server';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function error(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
) {
  const err: ApiError = { code, message, details };
  return NextResponse.json({ error: err }, { status });
}

export function unauthorized(message = 'Authentication required') {
  return error('UNAUTHENTICATED', message, 401);
}

export function forbidden(message = 'Access denied') {
  return error('FORBIDDEN', message, 403);
}

export function notFound(message = 'Resource not found') {
  return error('NOT_FOUND', message, 404);
}

export function badRequest(message = 'Invalid request', details?: Record<string, unknown>) {
  return error('BAD_REQUEST', message, 400, details);
}

export function internalError(message = 'Internal server error') {
  return error('INTERNAL_ERROR', message, 500);
}
