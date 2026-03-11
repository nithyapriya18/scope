'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';

export default function CleanLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Demo login
    if (email === 'demo@verity.com' && password === 'demo123') {
      // Store in localStorage
      const user = {
        id: 'a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0',
        email: 'demo@verity.com',
        name: 'Demo User',
      };
      localStorage.setItem('user', JSON.stringify(user));
      router.push('/dashboard');
    } else {
      setError('Invalid credentials. Try demo@verity.com / demo123');
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-0.5 tracking-[0.2em]">
              <span className="text-sm font-normal text-muted-foreground">PETA</span>
              <span className="text-sm font-bold text-foreground">SIGHT</span>
            </div>
            <div className="text-lg font-bold text-foreground">Verity Scope</div>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="mb-6 text-center text-xl font-semibold text-foreground">
            Sign In
          </h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@verity.com"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="demo123"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            Demo credentials: demo@verity.com / demo123
          </div>
        </div>
      </div>
    </div>
  );
}
