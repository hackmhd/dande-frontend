'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';

type Step = 'intro' | 'requested' | 'form' | 'done';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('intro');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestReset() {
    setLoading(true); setError(null);
    try {
      await api.requestPasswordReset();
      setStep('requested');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally { setLoading(false); }
  }

  async function submitNew() {
    setError(null);
    if (newPassword.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return; }
    if (newPassword !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      await api.completePasswordReset(code, newPassword);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Code incorrect.');
    } finally { setLoading(false); }
  }

  return (
    <main className="flex min-h-screen flex-col px-6 py-6">
      <button onClick={() => router.push('/profile')} className="mb-6 self-start text-sm t-soft transition-colors hover:text-ink dark:hover:text-white">← Profil</button>

      <h1 className="text-2xl font-semibold text-forest-700 dark:text-white">Changer mon mot de passe</h1>

      {step === 'intro' && (
        <div className="mt-4">
          <p className="text-sm t-soft">
            Pour des raisons de sécurité, le changement de mot de passe se fait avec l'aide d'un administrateur.
            En cliquant ci-dessous, une demande lui sera envoyée. Il vous communiquera un code à 6 chiffres à saisir ensuite.
          </p>
          {error && <p className="mt-3 text-sm text-clay-600 dark:text-clay-100">{error}</p>}
          <Button fullWidth className="mt-6" disabled={loading} onClick={requestReset}>
            {loading ? 'Envoi…' : 'Demander un changement de mot de passe'}
          </Button>
          <button onClick={() => setStep('form')} className="mt-4 w-full text-center text-sm t-soft underline underline-offset-4">
            J'ai déjà reçu un code
          </button>
        </div>
      )}

      {step === 'requested' && (
        <div className="mt-4">
          <div className="rounded-card border border-clay-100 bg-clay-50 p-5 dark:border-clay-600/30 dark:bg-clay-600/10">
            <p className="text-sm font-medium text-clay-800 dark:text-clay-100">Demande envoyée</p>
            <p className="mt-1 text-sm text-clay-800/80 dark:text-clay-100/70">
              Un administrateur va valider votre demande et vous communiquer un code à 6 chiffres.
              Dès que vous l'avez, saisissez-le ci-dessous.
            </p>
          </div>
          <Button fullWidth className="mt-6" onClick={() => setStep('form')}>
            J'ai reçu mon code
          </Button>
        </div>
      )}

      {step === 'form' && (
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium t-title">Code reçu (6 chiffres)</label>
          <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" className="field text-center text-2xl tracking-[0.5em]" />

          <label className="mb-2 mt-5 block text-sm font-medium t-title">Nouveau mot de passe</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Au moins 6 caractères" className="field" />

          <label className="mb-2 mt-4 block text-sm font-medium t-title">Confirmer le mot de passe</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ressaisissez le mot de passe" className="field" />

          {error && <p className="mt-3 text-sm text-clay-600 dark:text-clay-100">{error}</p>}

          <Button fullWidth className="mt-6" disabled={loading || code.length < 6} onClick={submitNew}>
            {loading ? 'Validation…' : 'Changer mon mot de passe'}
          </Button>
        </div>
      )}

      {step === 'done' && (
        <div className="mt-8 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest-50 text-2xl text-forest-600 dark:bg-forest-600/15 dark:text-forest-400">✓</div>
          <h2 className="mt-5 text-lg font-semibold t-title">Mot de passe modifié</h2>
          <p className="mt-2 max-w-xs text-sm t-soft">
            Votre mot de passe a été changé. Reconnectez-vous avec votre nouveau mot de passe.
          </p>
          <Button fullWidth className="mt-8 max-w-xs" onClick={() => { auth.clear(); router.replace('/login'); }}>
            Aller à la connexion
          </Button>
        </div>
      )}
    </main>
  );
}
