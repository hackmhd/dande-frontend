'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BalanceCard } from '@/components/BalanceCard';
import { StreakRow } from '@/components/StreakRow';
import { ProgressGauge } from '@/components/ProgressGauge';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { cacheGet, cacheSet } from '@/lib/offline';
import { OfflineBanner } from '@/components/OfflineBanner';

interface DashCache { balance: number; depositCount: number; clientName: string; village: string; photo: string | null }

export default function DashboardPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [depositCount, setDepositCount] = useState(0);
  const [clientName, setClientName] = useState('');
  const [village, setVillage] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineAt, setOfflineAt] = useState<number | null>(null);

  const DAILY = 500;
  const LOCK_TOTAL = 30;

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.replace('/login');
      return;
    }
    Promise.all([api.getWallet(), api.getProfile()])
      .then(([w, p]) => {
        setBalance(w.balanceFcfa);
        setDepositCount(w.depositCount ?? 0);
        setClientName(p.name);
        setVillage(p.village || 'Dande');
        setPhoto(p.photo ?? null);
        setOfflineAt(null);
        // Enregistre pour la consultation hors-ligne.
        cacheSet<DashCache>('dashboard', {
          balance: w.balanceFcfa, depositCount: w.depositCount ?? 0,
          clientName: p.name, village: p.village || 'Dande', photo: p.photo ?? null,
        });
      })
      .catch((e) => {
        // Réseau coupé : on affiche les dernières données connues si on en a.
        const cached = cacheGet<DashCache>('dashboard');
        if (cached) {
          setBalance(cached.value.balance);
          setDepositCount(cached.value.depositCount);
          setClientName(cached.value.clientName);
          setVillage(cached.value.village);
          setPhoto(cached.value.photo);
          setOfflineAt(cached.at);
        } else {
          setError(e instanceof Error ? e.message : 'Erreur de chargement.');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const lockDay = Math.min(depositCount, LOCK_TOTAL);

  // Initiales du client pour l'avatar.
  const initials = clientName
    ? clientName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '·';

  return (
    <main className="flex min-h-screen flex-col gap-3.5 px-4 py-5">
      <header className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-forest-600 text-xs font-medium text-forest-50">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Profil" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="text-sm font-medium t-title">{clientName || 'Mon épargne'}</p>
            <p className="text-[11px] t-soft">{village || 'Dande'}</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {offlineAt && <OfflineBanner at={offlineAt} />}

      {loading ? (
        <div className="surface p-8 text-center text-sm t-soft">
          Chargement de votre solde…
        </div>
      ) : error ? (
        <div className="surface p-5 text-center text-sm text-clay-600 dark:text-clay-100">
          {error}
          <p className="mt-2 text-xs t-faint">
            Vérifiez que le serveur est démarré.
          </p>
        </div>
      ) : (
        <>
          <BalanceCard
            balanceFcfa={balance}
            depositCount={depositCount}
            dailyAmountFcfa={DAILY}
          />
          <StreakRow filledDays={depositCount} totalDays={LOCK_TOTAL} onDeposit={() => router.push('/deposit')} />
          <ProgressGauge currentDay={lockDay} totalDays={LOCK_TOTAL} />
        </>
      )}

      <div className="mt-1 grid grid-cols-2 gap-2.5">
        <Button onClick={() => router.push('/deposit')}>+ Déposer</Button>
        <Button variant="secondary" onClick={() => router.push('/challenges')}>
          Défis
        </Button>
      </div>
    </main>
  );
}
