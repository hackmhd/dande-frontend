'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { api, formatFcfa } from '@/lib/api';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProfilePhoto } from '@/components/ProfilePhoto';
import { enablePush, disablePush, pushPermission } from '@/lib/push';

interface Row { label: string; value?: string; action?: () => void; }

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
function formatMonth(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ name: string; phone: string; email: string; village: string; photo: string | null; photoHidden: boolean; memberSince: string } | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated()) { router.replace('/login'); return; }
    Promise.all([api.getProfile(), api.getWallet()])
      .then(([p, w]) => { setProfile(p); setBalance(w.balanceFcfa); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  function openEditProfile() {
    if (!profile) return;
    setEditName(profile.name);
    setEditVillage(profile.village);
    setEditError(null);
    setEditOpen(true);
  }

  async function saveProfile() {
    setSaving(true);
    setEditError(null);
    try {
      const result = await api.updateProfile({ name: editName, village: editVillage });
      setProfile((p) => (p ? { ...p, name: result.name, village: result.village } : p));
      setEditOpen(false);
      setToast('Informations mises à jour.');
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(dataUri: string) {
    // Affichage optimiste, puis envoi au serveur.
    setProfile((p) => (p ? { ...p, photo: dataUri } : p));
    try {
      await api.updatePhoto(dataUri);
      setToast('Photo mise à jour ✓');
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Erreur lors de l’envoi de la photo.');
      // Recharge le vrai état en cas d'échec.
      api.getProfile().then(setProfile).catch(() => {});
    }
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRemovePhoto() {
    setProfile((p) => (p ? { ...p, photo: null } : p));
    try {
      await api.updatePhoto(null);
      setToast('Photo retirée.');
    } catch {
      setToast('Erreur.');
    }
    setTimeout(() => setToast(null), 3000);
  }

  async function toggleHidden() {
    if (!profile) return;
    const next = !profile.photoHidden;
    setProfile({ ...profile, photoHidden: next });
    try {
      await api.updatePhoto(profile.photo, next);
      setToast(next ? 'Photo masquée aux autres clients.' : 'Photo visible.');
    } catch {
      setProfile({ ...profile, photoHidden: !next });
      setToast('Erreur.');
    }
    setTimeout(() => setToast(null), 3000);
  }

  async function handleNotifications() {
    const perm = pushPermission();
    if (perm === 'unsupported') {
      setToast('Votre appareil ne supporte pas les notifications.');
      setTimeout(() => setToast(null), 3500);
      return;
    }
    const result = await enablePush();
    setToast(result.ok ? 'Notifications activées ✓' : (result.reason ?? 'Impossible d\u2019activer les notifications.'));
    setTimeout(() => setToast(null), 3500);
  }

  function handleLogout() {
    auth.clear();
    router.replace('/login');
  }

  const initials = profile?.name
    ? profile.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '·';

  const infoRows: Row[] = profile ? [
    { label: 'Téléphone', value: profile.phone },
    { label: 'E-mail', value: profile.email || '—' },
    { label: 'Village', value: profile.village || '—' },
    { label: 'Membre depuis', value: formatMonth(profile.memberSince) },
    { label: 'Total épargné', value: formatFcfa(balance) },
  ] : [];

  const settingRows: Row[] = [
    { label: 'Modifier mes informations', action: openEditProfile },
    { label: 'Changer mon mot de passe', action: () => router.push('/change-password') },
    { label: 'Activer les notifications', action: handleNotifications },
    { label: 'Aide et support', action: () => router.push('/help') },
  ];

  return (
    <main className="flex min-h-screen flex-col px-4 py-5">
      <header className="mb-5 flex items-start justify-between">
        <div className="flex flex-1 flex-col items-center">
          <ProfilePhoto
            photo={profile?.photo ?? null}
            initials={initials}
            size={80}
            editable
            onChange={handlePhotoChange}
          />
          <p className="mt-2.5 text-base font-medium t-title">{profile?.name ?? 'Chargement…'}</p>
          <p className="text-sm t-soft">{profile?.village || 'Dande'}</p>
          {profile?.photo && (
            <div className="mt-2 flex items-center gap-3 text-xs">
              <button onClick={toggleHidden} className="t-soft underline-offset-2 hover:underline">
                {profile.photoHidden ? 'Rendre visible aux autres' : 'Masquer aux autres clients'}
              </button>
              <span className="t-faint">·</span>
              <button onClick={handleRemovePhoto} className="text-red-600 underline-offset-2 hover:underline dark:text-red-300">
                Retirer
              </button>
            </div>
          )}
        </div>
        <ThemeToggle />
      </header>

      {toast && (
        <div className="mb-4 rounded-lg border border-forest-100 bg-forest-50 px-4 py-2.5 text-sm text-forest-700 dark:border-iris-500/30 dark:bg-iris-500/10 dark:text-iris-200">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="surface p-8 text-center text-sm t-soft">Chargement…</div>
      ) : (
        <>
          <section className="mb-4">
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide t-faint">Mes informations</p>
            <div className="surface overflow-hidden">
              {infoRows.map((row, i) => (
                <div key={row.label} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-sand-100 dark:border-night-700' : ''}`}>
                  <span className="text-sm t-soft">{row.label}</span>
                  <span className="text-sm font-medium t-title">{row.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide t-faint">Réglages</p>
            <div className="surface overflow-hidden">
              {settingRows.map((row, i) => (
                <button key={row.label} onClick={row.action} className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-sand-50 dark:hover:bg-night-700/50 ${i > 0 ? 'border-t border-sand-100 dark:border-night-700' : ''}`}>
                  <span className="text-sm t-title">{row.label}</span>
                  <span className="t-faint">›</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <button onClick={handleLogout} className="w-full rounded-xl border border-sand-200 bg-white py-3 text-sm font-medium text-red-600 transition-all duration-200 hover:bg-red-50 active:scale-[0.98] dark:border-night-600 dark:bg-night-800 dark:text-red-300 dark:hover:bg-night-700">
        Se déconnecter
      </button>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center" onClick={() => setEditOpen(false)}>
          <div className="w-full max-w-md rounded-t-card bg-white p-5 dark:bg-night-800 sm:rounded-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold t-title">Modifier mes informations</h3>
              <button onClick={() => setEditOpen(false)} aria-label="Fermer" className="t-faint">✕</button>
            </div>

            <label className="mb-1.5 block text-sm font-medium t-title">Nom complet</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="field mb-4" />

            <label className="mb-1.5 block text-sm font-medium t-title">Village</label>
            <input value={editVillage} onChange={(e) => setEditVillage(e.target.value)} placeholder="Votre village" className="field mb-2" />

            <p className="mb-4 text-xs t-faint">
              Le téléphone et l'e-mail ne sont pas modifiables ici. Contactez un administrateur si besoin.
            </p>

            {editError && <p className="mb-3 text-sm text-clay-600 dark:text-clay-100">{editError}</p>}

            <div className="flex gap-2.5">
              <button onClick={() => setEditOpen(false)} className="flex-1 rounded-xl border border-sand-200 py-3 text-sm font-medium t-soft dark:border-night-600">Annuler</button>
              <button onClick={saveProfile} disabled={saving || editName.trim().length < 2} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
