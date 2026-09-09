'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit() {
    // Démo : le backend enverra une procédure sécurisée de réinitialisation.
    setSent(true);
  }

  return (
    <main className="flex min-h-screen flex-col px-6 py-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/login')}
          className="text-sm t-soft transition-colors hover:text-ink dark:hover:text-white"
        >
          ← Retour
        </button>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 flex-col justify-center">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-forest-50 text-2xl text-forest-600 dark:bg-forest-600/15 dark:text-forest-400">
              ✓
            </div>
            <h1 className="text-xl font-semibold t-title">Procédure envoyée</h1>
            <p className="mt-2 text-sm t-soft">
              Si un compte correspond à {identifier}, vous recevrez les
              instructions pour réinitialiser votre mot de passe.
            </p>
            <Button
              fullWidth
              className="mt-8"
              onClick={() => router.push('/login')}
            >
              Retour à la connexion
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-forest-700 dark:text-white">
              Mot de passe oublié
            </h1>
            <p className="mt-1 text-sm t-soft">
              Saisissez votre numéro ou e-mail pour recevoir une procédure de
              réinitialisation.
            </p>

            <label className="mb-2 mt-8 block text-sm font-medium t-title" htmlFor="id">
              Numéro de téléphone ou e-mail
            </label>
            <input
              id="id"
              type="text"
              placeholder="70 00 00 00 ou nom@exemple.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="field"
            />

            <Button
              fullWidth
              className="mt-6"
              disabled={identifier.trim().length < 4}
              onClick={handleSubmit}
            >
              Envoyer la procédure
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
