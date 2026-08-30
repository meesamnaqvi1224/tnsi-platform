/**
 * Clerk middleware for Next.js App Router.
 * Protects routes and handles authentication state.
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Define public routes that don't require authentication.
 * Add routes here that should be accessible without authentication.
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/about(.*)',
  '/programs(.*)',
  '/articles(.*)',
  '/resources(.*)',
  '/research(.*)',
  '/faculty(.*)',
  '/method(.*)',
  '/contact',
  '/book-a-call',
  '/privacy(.*)',
  '/terms(.*)',
  '/cookies(.*)',
  '/accessibility(.*)',
  '/search(.*)',
  '/assessment(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk',
  '/api/webhooks/sanity',
  '/api/health',
  '/api/newsletter',
  '/api/contact',
  '/api/assessments(.*)',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.ico',
  '/studio(.*)', // Sanity Studio has its own auth
]);

/**
 * Define routes that should be ignored by Clerk middleware entirely.
 * These routes won't have any Clerk middleware processing.
 */
const isIgnoredRoute = createRouteMatcher([
  '/api/webhooks/clerk', // Webhook endpoint must be accessible without Clerk middleware
  '/api/webhooks/sanity', // Webhook endpoint must be accessible without Clerk middleware
]);

export default clerkMiddleware(async (auth, request) => {
  // Skip Clerk middleware for ignored routes
  if (isIgnoredRoute(request)) {
    return;
  }

  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
