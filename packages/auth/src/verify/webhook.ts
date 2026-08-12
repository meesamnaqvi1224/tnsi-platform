/**
 * Clerk webhook signature verification.
 * Uses svix for secure webhook verification.
 * Server-side only.
 */

import { Webhook } from 'svix';
import type { ClerkWebhookEventType } from '../types';
import { WebhookVerificationFailedError } from '../errors/auth';

/**
 * Clerk user webhook data structure.
 */
export interface ClerkUserWebhookData {
  id: string;
  email_addresses: Array<{ email_address: string; id: string }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string;
  public_metadata: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

/**
 * Verified webhook payload with typed event.
 */
export interface VerifiedWebhookEvent<T = unknown> {
  type: ClerkWebhookEventType;
  data: T;
  timestamp: number;
}

/**
 * Verify a Clerk webhook payload.
 *
 * @param payload - Raw request body as string
 * @param headers - Request headers (must contain svix-id, svix-timestamp, svix-signature)
 * @returns Verified webhook event
 * @throws WebhookVerificationFailedError if verification fails
 */
export function verifyWebhook(
  payload: string,
  headers: Record<string, string | undefined>,
): VerifiedWebhookEvent {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('CLERK_WEBHOOK_SECRET environment variable is not set');
  }

  const svixId = headers['svix-id'];
  const svixTimestamp = headers['svix-timestamp'];
  const svixSignature = headers['svix-signature'];

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new WebhookVerificationFailedError('Missing required svix headers');
  }

  const webhook = new Webhook(webhookSecret);

  let event: { type: ClerkWebhookEventType; data: ClerkUserWebhookData };
  try {
    event = webhook.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: ClerkWebhookEventType; data: ClerkUserWebhookData };
  } catch (error) {
    throw new WebhookVerificationFailedError('Webhook signature verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return {
    type: event.type,
    data: event.data,
    timestamp: event.data.created_at,
  };
}

/**
 * Type guard to check if a webhook event is a user event.
 */
export function isUserEvent(
  event: VerifiedWebhookEvent,
): event is VerifiedWebhookEvent<ClerkUserWebhookData> {
  return event.type.startsWith('user.');
}

/**
 * Extract user ID from a verified user event.
 */
export function getUserIdFromEvent(event: VerifiedWebhookEvent): string {
  if (!isUserEvent(event)) {
    throw new Error('Event is not a user event');
  }
  return event.data.id;
}

/**
 * Extract email from a verified user event.
 */
export function getEmailFromEvent(event: VerifiedWebhookEvent): string {
  if (!isUserEvent(event)) {
    throw new Error('Event is not a user event');
  }
  const primaryEmail = event.data.email_addresses.find(
    (e) => e.id === event.data.email_addresses[0]?.id,
  );
  return primaryEmail?.email_address || event.data.email_addresses[0]?.email_address || '';
}

/**
 * Extract full name from a verified user event.
 */
export function getFullNameFromEvent(event: VerifiedWebhookEvent): string | null {
  if (!isUserEvent(event)) {
    throw new Error('Event is not a user event');
  }
  const first = event.data.first_name;
  const last = event.data.last_name;
  if (!first && !last) return null;
  return [first, last].filter(Boolean).join(' ');
}

/**
 * Extract avatar URL from a verified user event.
 */
export function getAvatarUrlFromEvent(event: VerifiedWebhookEvent): string {
  if (!isUserEvent(event)) {
    throw new Error('Event is not a user event');
  }
  return event.data.image_url;
}

/**
 * Extract public metadata from a verified user event.
 */
export function getMetadataFromEvent(event: VerifiedWebhookEvent): Record<string, unknown> {
  if (!isUserEvent(event)) {
    throw new Error('Event is not a user event');
  }
  return event.data.public_metadata || {};
}
