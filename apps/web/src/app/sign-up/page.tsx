import { SignUp } from '@clerk/nextjs';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up — The Nervous System Institute',
  description: 'Create your TNSI account to access membership content and programs.',
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <SignUp
          path="/sign-up"
          appearance={{
            elements: {
              formButtonPrimary: 'bg-neutral-900 hover:bg-neutral-800 text-white',
              card: 'shadow-lg border border-neutral-200 dark:border-neutral-800',
            },
          }}
          routing="path"
          signInUrl="/sign-in"
        />
      </div>
    </main>
  );
}
