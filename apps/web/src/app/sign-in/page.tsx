import { SignIn } from '@clerk/nextjs';
import { Metadata } from 'next';
import { parseAuthRedirect, signUpUrlFor } from '@/lib/auth-redirect';

export const metadata: Metadata = {
  title: 'Sign In — The Nervous System Institute',
  description: 'Sign in to access your TNSI account and membership content.',
  // Account pages: crawlable (not blocked in robots.txt, so Google can read this
  // tag) but kept out of the index; links on them may still be followed.
  robots: { index: false, follow: true },
};

interface SignInPageProps {
  searchParams: Promise<{ redirect_url?: string | string[] }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  // A validated membership destination (see `parseAuthRedirect`), or undefined.
  // Passed to Clerk explicitly because the component was not honouring the query
  // value itself; with none, behaviour is exactly what it was.
  const destination = parseAuthRedirect((await searchParams).redirect_url);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: 'bg-neutral-900 hover:bg-neutral-800 text-white',
              card: 'shadow-lg border border-neutral-200 dark:border-neutral-800',
            },
          }}
          routing="hash"
          signUpUrl={signUpUrlFor(destination)}
          fallbackRedirectUrl="/dashboard"
          forceRedirectUrl={destination}
        />
      </div>
    </main>
  );
}
