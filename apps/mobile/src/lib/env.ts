/**
 * All EXPO_PUBLIC_* variables are inlined into the client bundle at build
 * time and are visible to anyone who inspects the app - never put a secret
 * here. See apps/mobile/.env.example.
 */
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy apps/mobile/.env.example to apps/mobile/.env.local and fill it in.`,
    );
  }
  return value;
}

export const env = {
  clerkPublishableKey: requireEnv(
    'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  ),
  apiBaseUrl: requireEnv('EXPO_PUBLIC_API_BASE_URL', process.env.EXPO_PUBLIC_API_BASE_URL),
};
