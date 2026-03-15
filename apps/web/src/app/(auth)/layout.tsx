'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

/**
 * Auth layout — wraps register, forgot-password, reset-password.
 * Redirects already-authenticated users to the dashboard.
 * Uses NextAuth useSession() as source of truth (not Zustand store).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return <AuthLayoutInner router={router}>{children}</AuthLayoutInner>;
}

function AuthLayoutInner({
  children,
  router,
}: {
  children: React.ReactNode;
  router: ReturnType<typeof useRouter>;
}) {
  const { status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  // Show spinner only while NextAuth is resolving the session
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Already authenticated → redirect (returning null avoids flash)
  if (status === 'authenticated') {
    return null;
  }

  return <>{children}</>;
}
