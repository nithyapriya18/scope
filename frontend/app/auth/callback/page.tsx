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
    const error = searchParams.get('error');

    // Check for auth errors from backend
    if (error) {
      console.error('OAuth error from backend:', error);
      router.push(`/login?error=${error}`);
      return;
    }

    if (!token) {
      console.error('No token received from OAuth callback');
      router.push('/login?error=no_token');
      return;
    }

    console.log('🔐 Received token, fetching user data...');
    console.log('🔗 Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL);

    // Safety timeout - if auth takes > 10 seconds, something is wrong
    const timeoutId = setTimeout(() => {
      console.error('⏱️ Auth callback timeout - backend not responding');
      router.push('/login?error=timeout');
    }, 10000);

    // Fetch user data with token
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const responseText = await res.text();
        console.log('Auth response status:', res.status, 'body:', responseText);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${responseText}`);
        }

        try {
          return JSON.parse(responseText);
        } catch (e) {
          throw new Error(`Invalid JSON: ${responseText}`);
        }
      })
      .then((data) => {
        clearTimeout(timeoutId);
        console.log('✅ Auth response received:', data);

        if (data.user) {
          console.log('✅ OAuth login successful:', data.user.email);
          setAuth(token, data.user);

          // Small delay to ensure localStorage is set before redirect
          setTimeout(() => {
            router.push('/dashboard');
          }, 100);
        } else {
          console.error('No user data in response:', data);
          router.push('/login?error=invalid_user');
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.error('Auth error:', error.message || error);
        router.push('/login?error=fetch_failed');
      });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-ps-primary-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Completing sign in...</p>
        <p className="text-gray-500 text-sm mt-2">Please wait while we authenticate you</p>
        <p className="text-gray-400 text-xs mt-4">Check browser console for details if this takes too long</p>
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
