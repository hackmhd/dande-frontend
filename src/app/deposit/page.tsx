'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { formatFcfa, api } from '@/lib/api';

type State = 'idle' | 'sending' | 'sent' | 'failed';

const PRESETS = [500, 1000, 2000, 5000];

export default function DepositPage() {
  const router = useRouter();
  const [amount, setAmount] = useState(500);
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);

  async function sendRequest() {
    setState('sending');
    setError(null);
    try {
      await api.createDeposit(amount);
      setState('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
      setState('failed');
    }
  }

  if (state === 'sent') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-clay-50 text-2xl text-clay-600 dark:bg-clay-600/15 dark:text-clay-100">
          ⏳
        </div>
        <h1 className="mt-5 text-xl font-semibold t-title">Demande envoyée</h1>
        <p className="mt-2 max-w-xs text-sm t-soft">
          Votre demande de dépôt de {formatFcfa(amount)} a été envoyée. Elle est
          en attente de confirmation par un administrateur.
        </p>
        <div className="mt-6 w-full max-w-xs rounded-card border border-sand-200 bg-white p-4 text-left dark:border-night-700 dark:bg-night-800">
          <div className="flex justify-between text-sm">
            <span className="t-soft">Montant demandé</span>
            <span className="font-medium t-title">{formatFcfa(amount)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="t-soft">Statut</span>
            <span className="rounded-md bg-clay-50 px-2 py-0.5 text-xs font-medium text-clay-600 dark:bg-clay-600/15 dark:text-clay-100">
              En attente de confirmation
            </span>
          </div>
        </div>
        <div className="mt-8 w-full max-w-xs space-y-2.5">
          <Button fullWidth onClick={() => router.push('/history')}>
            Voir mes demandes
          </Button>
          <Button variant="secondary" fullWidth onClick={() => router.push('/dashboard')}>
            Retour à l'accueil
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col px-4 py-5">
      <button
        onClick={() => router.back()}
        className="mb-6 self-start text-sm t-soft transition-colors hover:text-ink dark:hover:text-white"
      >
        ← Retour
      </button>

      <h1 className="text-xl font-semibold t-title">Déposer</h1>
      <p className="mt-1 text-sm t-soft">
        Choisissez un montant. Votre demande sera confirmée par un administrateur.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setAmount(preset)}
            className={`rounded-xl border py-4 text-base font-medium transition-all duration-200 active:scale-[0.98] ${
              amount === preset
                ? 'border-forest-600 bg-forest-50 text-forest-700 dark:border-iris-500 dark:bg-iris-500/15 dark:text-iris-200'
                : 'border-sand-200 bg-white t-title hover:border-forest-400 dark:border-night-600 dark:bg-night-800 dark:hover:border-iris-500'
            }`}
          >
            {formatFcfa(preset)}
          </button>
        ))}
      </div>

      <label className="mb-2 mt-6 block text-sm font-medium t-title" htmlFor="custom">
        Ou un autre montant
      </label>
      <input
        id="custom"
        type="number"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
        className="field"
      />

      {error && <p className="mt-3 text-sm text-clay-600 dark:text-clay-100">{error}</p>}

      <Button
        fullWidth
        className="mt-6"
        disabled={amount < 100 || state === 'sending'}
        onClick={sendRequest}
      >
        {state === 'sending' ? 'Envoi…' : `Confirmer le dépôt de ${formatFcfa(amount)}`}
      </Button>

      <p className="mt-3 text-center text-xs t-faint">
        Le montant sera ajouté à votre épargne après confirmation.
      </p>
    </main>
  );
}
