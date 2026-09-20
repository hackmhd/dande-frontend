'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DownloadAppButton } from '@/components/DownloadAppButton';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = identifier.trim().length >= 4 && password.length >= 1;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const { token } = await api.login(identifier.trim(), password);
      auth.setToken(token);
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Identifiant ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col px-6 py-6">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-forest-700 dark:text-white">
            Dande
          </h1>
          <p className="mt-1 text-sm t-soft">
            Épargnez chaque jour, atteignez vos objectifs.
          </p>
        </div>

        <label className="mb-2 block text-sm font-medium t-title" htmlFor="id">
          Numéro de téléphone ou e-mail
        </label>
        <input
          id="id"
          type="text"
          inputMode="text"
          autoComplete="username"
          placeholder="70 00 00 00 ou nom@exemple.com"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="field"
        />

        <label className="mb-2 mt-4 block text-sm font-medium t-title" htmlFor="pwd">
          Mot de passe
        </label>
        <input
          id="pwd"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
          className="field"
        />

        <div className="mt-2 text-right">
          <button
            onClick={() => router.push('/forgot-password')}
            className="text-xs t-soft underline underline-offset-4"
          >
            Mot de passe oublié ?
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-clay-600 dark:text-clay-100">{error}</p>
        )}

        <Button
          fullWidth
          className="mt-6"
          disabled={loading || !canSubmit}
          onClick={handleSubmit}
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </Button>

        <div className="mt-8 text-center text-sm t-soft">
          Pas encore de compte ?{' '}
          <button
            onClick={() => router.push('/register')}
            className="font-medium text-forest-700 underline underline-offset-4 dark:text-iris-300"
          >
            Créer un compte
          </button>
        </div>

        <DownloadAppButton />
      </div>
    </main>
  );
}
