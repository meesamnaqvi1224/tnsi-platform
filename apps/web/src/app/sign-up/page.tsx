import { SignUp } from '@clerk/nextjs';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up — The Nervous System Institute',
  description: 'Create your TNSI account to access membership content and programs.',
  // Account pages: crawlable (not blocked in robots.txt, so Google can read this
  // tag) but kept out of the index; links on them may still be followed.
  robots: { index: false, follow: true },
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 'bg-neutral-900 hover:bg-neutral-800 text-white',
              card: 'shadow-lg border border-neutral-200 dark:border-neutral-800',
            },
          }}
          routing="hash"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </main>
  );
}
