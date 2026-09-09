'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(auth.isAuthenticated() ? '/dashboard' : '/login');
  }, [router]);
  return null;
}
