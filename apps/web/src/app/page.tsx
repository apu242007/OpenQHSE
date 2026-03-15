'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(AUTH_DISABLED ? '/dashboard' : '/login');
  }, [router]);
  return null;
}
