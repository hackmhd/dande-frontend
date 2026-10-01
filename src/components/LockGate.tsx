'use client';

import { useEffect, useState } from 'react';
import { isPinEnabled, verifyPin, isBiometricEnabled, verifyBiometric } from '@/lib/applock';

/**
 * Verrou affiché AU LANCEMENT de l'app si l'utilisateur a activé un PIN.
 * Demande le PIN (ou la biométrie si activée). Une fois déverrouillé, l'app
 * reste accessible pour la session (pas redemandé à chaque retour).
 */
export function LockGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    const on = isPinEnabled();
    setLocked(on);
    setBioEnabled(isBiometricEnabled());
    setReady(true);
    // Si la biométrie est activée, on la propose tout de suite.
    if (on && isBiometricEnabled()) {
      verifyBiometric().then((ok) => { if (ok) setLocked(false); }).catch(() => {});
    }
  }, []);

  async function submit() {
    if (await verifyPin(pin)) {
      setLocked(false); setPin(''); setError(false);
    } else {
      setError(true); setPin('');
    }
  }

  async function useBiometric() {
    if (await verifyBiometric()) setLocked(false);
  }

  if (!ready) return null;
  if (!locked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-sand-50 px-6 dark:bg-night-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-600 text-2xl font-bold text-white">D</div>
      <h1 className="mt-4 text-lg font-semibold t-title">Dande est verrouillée</h1>
      <p className="mb-6 text-sm t-soft">Entrez votre code pour continuer</p>

      <input
        type="password"
        inputMode="numeric"
        autoFocus
        value={pin}
        onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(false); }}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        placeholder="••••"
        className={`w-40 rounded-xl border-2 bg-white px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none dark:bg-night-900 dark:text-white ${error ? 'border-red-500' : 'border-sand-200 focus:border-forest-400 dark:border-night-600'}`}
      />
      {error && <p className="mt-2 text-xs text-red-600">Code incorrect. Réessayez.</p>}

      <button onClick={submit} disabled={pin.length < 4} className="mt-5 w-40 rounded-xl bg-forest-600 py-3 font-medium text-white disabled:opacity-40">
        Déverrouiller
      </button>

      {bioEnabled && (
        <button onClick={useBiometric} className="mt-4 flex items-center gap-2 text-sm font-medium text-forest-700 dark:text-iris-300">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11v2m-6-2a6 6 0 0 1 12 0M4 13a8 8 0 0 1 16 0M7 16a5 5 0 0 1 10 0M9 19a3 3 0 0 1 6 0" /></svg>
          Utiliser la biométrie
        </button>
      )}
    </div>
  );
}
