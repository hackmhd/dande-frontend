'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatFcfa, formatDateTime, api } from '@/lib/api';
import { CopyChip } from '@/components/CopyChip';
import { auth } from '@/lib/auth';
import { cacheGet, cacheSet } from '@/lib/offline';
import { OfflineBanner } from '@/components/OfflineBanner';

const MONTHS = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'Réussi', pending: 'En attente', late: 'En retard', failed: 'Échoué',
};
const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-forest-50 text-forest-700 dark:bg-forest-600/15 dark:text-forest-400',
  pending: 'bg-clay-50 text-clay-600 dark:bg-clay-600/15 dark:text-clay-100',
  late: 'bg-clay-50 text-clay-600 dark:bg-clay-600/15 dark:text-clay-100',
  failed: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
};

interface Tx { id: string; type: string; amountFcfa: number; status: string; date: string; at: string; ticket: string | null; }

export default function HistoryPage() {
  const router = useRouter();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineAt, setOfflineAt] = useState<number | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated()) { router.replace('/login'); return; }
    api.getHistory()
      .then((data) => { setTxs(data); setOfflineAt(null); cacheSet<Tx[]>('history', data); })
      .catch((e) => {
        const cached = cacheGet<Tx[]>('history');
        if (cached) { setTxs(cached.value); setOfflineAt(cached.at); }
        else setError(e instanceof Error ? e.message : 'Erreur de chargement.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const total = txs
    .filter((t) => t.status === 'paid')
    .reduce((sum, t) => sum + t.amountFcfa, 0);

  return (
    <main className="flex min-h-screen flex-col px-4 py-5">
      <header className="mb-4">
        <h1 className="text-lg font-semibold t-title">Historique</h1>
        <p className="mt-0.5 text-sm t-soft">Total épargné : {formatFcfa(total)}</p>
      </header>

      {offlineAt && <OfflineBanner at={offlineAt} />}

      {loading ? (
        <div className="surface p-8 text-center text-sm t-soft">Chargement…</div>
      ) : error ? (
        <div className="surface p-5 text-center text-sm text-clay-600 dark:text-clay-100">{error}</div>
      ) : txs.length === 0 ? (
        <div className="surface p-8 text-center text-sm t-soft">
          Aucun mouvement pour le moment. Vos dépôts apparaîtront ici.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {txs.map((tx) => (
            <div key={tx.id} className="surface flex items-center justify-between gap-2 p-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-600 dark:bg-forest-600/15 dark:text-forest-400">
                  ↓
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium t-title">Dépôt</p>
                  <p className="text-xs t-soft">{formatDateTime(tx.at)}</p>
                  {tx.ticket && (
                    <div className="mt-0.5 flex items-center gap-1 text-[11px]">
                      <span className="shrink-0 t-faint">Ticket :</span>
                      <CopyChip value={tx.ticket} className="break-all text-[11px] font-semibold text-forest-700 dark:text-forest-400" />
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-medium ${tx.status === 'failed' ? 'text-ink-faint line-through dark:text-iris-100/40' : 't-title'}`}>
                  + {formatFcfa(tx.amountFcfa)}
                </p>
                <span className={`mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[tx.status] ?? STATUS_STYLE.pending}`}>
                  {STATUS_LABEL[tx.status] ?? tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
