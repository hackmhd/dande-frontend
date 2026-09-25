'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProfilePhoto } from '@/components/ProfilePhoto';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit =
    name.trim().length >= 2 &&
    phone.length >= 8 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    password.length >= 6 &&
    adminCode.trim().length >= 6;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const { token } = await api.register({
        name: name.trim(),
        phone,
        email: email.trim(),
        password,
        adminCode: adminCode.trim().toUpperCase(),
        photo,
      });
      // Phase de test : le compte est créé et connecté directement,
      // sans double authentification.
      auth.setToken(token);
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
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

      <div className="mt-6">
        <h1 className="text-2xl font-semibold text-forest-700 dark:text-white">
          Créer un compte
        </h1>
        <p className="mt-1 text-sm t-soft">
          Quelques informations pour commencer à épargner.
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <ProfilePhoto
          photo={photo}
          initials={name.trim() ? name.trim().split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : '+'}
          size={88}
          editable
          onChange={setPhoto}
        />
        <p className="mt-2 text-xs t-faint">Photo de profil (facultatif)</p>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium t-title" htmlFor="name">
            Nom complet
          </label>
          <input
            id="name"
            type="text"
            placeholder="Aminata Kaboré"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium t-title" htmlFor="phone">
            Numéro de téléphone
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="70 00 00 00"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="field"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium t-title" htmlFor="email">
            Adresse e-mail
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            placeholder="nom@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
          {!emailValid && (
            <p className="mt-1 text-xs text-clay-600 dark:text-clay-100">
              Saisissez une adresse e-mail valide.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium t-title" htmlFor="pwd">
            Mot de passe
          </label>
          <input
            id="pwd"
            type="password"
            placeholder="Au moins 6 caractères"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium t-title" htmlFor="code">
            Code de votre agent
          </label>
          <input
            id="code"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            placeholder="Ex : A7X2K9P4"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
            maxLength={8}
            className="field uppercase tracking-widest"
          />
          <p className="mt-1.5 text-xs t-faint">
            Ce code vous est communiqué par l'agent qui gère votre épargne.
          </p>
        </div>
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
        {loading ? 'Création…' : 'Créer mon compte'}
      </Button>

      <p className="mt-4 text-center text-xs t-faint">
        En créant un compte, vous pourrez suivre votre épargne et vos défis.
      </p>

      <div className="mt-6 text-center text-sm t-soft">
        Déjà un compte ?{' '}
        <button
          onClick={() => router.push('/login')}
          className="font-medium text-forest-700 underline underline-offset-4 dark:text-iris-300"
        >
          Se connecter
        </button>
      </div>
    </main>
  );
}
