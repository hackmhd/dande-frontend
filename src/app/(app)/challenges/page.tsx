'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatFcfa, api } from '@/lib/api';
import { auth } from '@/lib/auth';

type Tontine = Awaited<ReturnType<typeof api.getTontines>>[number];
type MyTontine = Awaited<ReturnType<typeof api.getMyTontine>>;

export default function ChallengesPage() {
  const router = useRouter();
  const [mine, setMine] = useState<MyTontine>(null);
  const [available, setAvailable] = useState<Tontine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);

  function load() {
    Promise.all([api.getMyTontine(), api.getTontines()])
      .then(([m, all]) => { setMine(m); setAvailable(all); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!auth.isAuthenticated()) { router.replace('/login'); return; }
    load();
  }, [router]);

  async function join(t: Tontine) {
    setJoining(t.id); setError(null);
    try {
      await api.joinTontine(t.id);
      setLoading(true);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally { setJoining(null); }
  }

  return (
    <main className="flex min-h-screen flex-col px-4 py-5">
      <header className="mb-4 flex items-center gap-2.5">
        <button onClick={() => router.back()} className="t-soft transition-colors hover:text-ink dark:hover:text-white">←</button>
        <h1 className="text-lg font-semibold t-title">Tontines d'épargne</h1>
      </header>

      {loading ? (
        <div className="surface p-8 text-center text-sm t-soft">Chargement…</div>
      ) : (
        <>
          {error && <div className="mb-4 rounded-lg border border-clay-100 bg-clay-50 px-4 py-2.5 text-sm text-clay-800 dark:border-clay-600/30 dark:bg-clay-600/10 dark:text-clay-100">{error}</div>}

          {mine ? (
            <>
              <p className="mb-2 text-sm font-medium t-soft">Ma tontine</p>
              <div className="mb-5 rounded-card bg-forest-600 p-4 text-white dark:bg-night-900 dark:ring-1 dark:ring-iris-700/40">
                <div className="mb-2.5 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{mine.name}</p>
                    <p className="mt-0.5 text-xs text-forest-100 dark:text-iris-100/60">
                      {mine.dailyAmountFcfa ? `${formatFcfa(mine.dailyAmountFcfa)} chaque jour` : 'Montant libre'}
                    </p>
                  </div>
                  <span className="rounded-md bg-forest-100 px-2 py-0.5 text-xs font-medium text-forest-700 dark:bg-iris-500/20 dark:text-iris-200">
                    Jour {mine.paidCount}{mine.durationDays ? `/${mine.durationDays}` : ''}
                  </span>
                </div>
                {mine.durationDays && (
                  <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-clay-100 transition-all duration-500" style={{ width: `${Math.min(100, Math.round((mine.paidCount / mine.durationDays) * 100))}%` }} />
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-forest-100 dark:text-iris-100/60">{formatFcfa(mine.savedFcfa)} épargnés</span>
                  {mine.durationDays && <span className="font-medium">Plus que {Math.max(0, mine.durationDays - mine.paidCount)} jours</span>}
                </div>
              </div>
              <p className="text-xs t-faint">Vous participez déjà à une tontine. Vous pourrez en rejoindre une autre une fois celle-ci terminée.</p>
            </>
          ) : (
            <>
              <p className="mb-2 text-sm font-medium t-soft">Choisissez une tontine à rejoindre</p>
              <div className="flex flex-col gap-2.5">
                {available.map((t) => (
                  <div key={t.id} className="surface p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium t-title">{t.name}</p>
                        <p className="mt-0.5 text-xs t-soft">
                          {t.isFlexible ? 'Montant et durée libres' : `${formatFcfa(t.dailyAmountFcfa ?? 0)} / jour · ${t.durationDays} jours`}
                        </p>
                        <p className="mt-0.5 text-xs t-faint">{t.memberCount} participant{t.memberCount !== 1 ? 's' : ''}</p>
                      </div>
                      <button onClick={() => join(t)} disabled={joining === t.id} className="btn-primary disabled:opacity-50">
                        {joining === t.id ? '…' : 'Rejoindre'}
                      </button>
                    </div>
                  </div>
                ))}
                {available.length === 0 && (
                  <div className="surface p-8 text-center text-sm t-soft">Aucune tontine disponible pour le moment.</div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
