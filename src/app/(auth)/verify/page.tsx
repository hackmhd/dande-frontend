'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';

export default function VerifyPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('dande_phone');
    if (!stored) {
      router.replace('/login');
      return;
    }
    setPhone(stored);
  }, [router]);

  async function handleVerify() {
    setError(null);
    setLoading(true);
    try {
      const { token } = await api.verifyOtp(phone, code);
      auth.setToken(token);
      sessionStorage.removeItem('dande_phone');
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Code incorrect.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col px-6 py-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm t-soft transition-colors hover:text-ink dark:hover:text-white"
        >
          ← Retour
        </button>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <h1 className="text-2xl font-semibold text-forest-700 dark:text-white">
          Vérification
        </h1>
        <p className="mt-1 text-sm t-soft">
          Saisissez le code envoyé au {phone}.
        </p>

        <label className="mb-2 mt-8 block text-sm font-medium t-title" htmlFor="code">
          Code à 6 chiffres
        </label>
        <input
          id="code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="field text-center text-2xl tracking-[0.5em]"
        />

        {error && (
          <p className="mt-2 text-sm text-clay-600 dark:text-clay-100">{error}</p>
        )}

        <Button
          fullWidth
          className="mt-6"
          disabled={loading || code.length < 6}
          onClick={handleVerify}
        >
          {loading ? 'Vérification…' : 'Me connecter'}
        </Button>
      </div>
    </main>
  );
}
