'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      console.error('No token received from OAuth callback');
      router.push('/login?error=no_token');
      return;
    }

    // Fetch user data with token
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch user data');
        }
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          console.log('✅ OAuth login successful:', data.user.email);
          setAuth(token, data.user);
          router.push('/dashboard');
        } else {
          console.error('No user data in response');
          router.push('/login?error=invalid_user');
        }
      })
      .catch((error) => {
        console.error('Auth error:', error);
        router.push('/login?error=fetch_failed');
      });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-ps-primary-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Completing sign in...</p>
        <p className="text-gray-500 text-sm mt-2">Please wait while we authenticate you</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-ps-primary-600 animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
