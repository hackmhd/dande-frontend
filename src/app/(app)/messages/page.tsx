'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { api, dm } from '@/lib/api';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Conv { otherKind: string; otherId: string; otherName: string; otherPhoto: string | null; lastMessage: string; lastFromMe: boolean; lastAt: string; unread: number }

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}
function initials(name: string) { return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '·'; }

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-forest-600 font-semibold text-forest-50">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={name} className="h-full w-full object-cover" />
      ) : <span>{initials(name)}</span>}
    </div>
  );
}

export default function MessagesInboxPage() {
  const router = useRouter();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [agentUnread, setAgentUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([dm.list(), api.chatUnread()])
      .then(([list, a]) => { setConvs(list); setAgentUnread(a.unread); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    if (!auth.isAuthenticated()) { router.replace('/login'); return; }
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-sand-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-night-700 dark:bg-night-900/95">
        <h1 className="text-lg font-semibold text-forest-700 dark:text-white">Messages</h1>
        <ThemeToggle />
      </header>

      {/* Conversation avec l'agent (épinglée) */}
      <button onClick={() => router.push('/chat')} className="flex items-center gap-3 border-b border-sand-100 px-4 py-3 text-left transition-colors hover:bg-sand-50 dark:border-night-700 dark:hover:bg-night-800/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-600 text-forest-50">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold t-title">Mon agent</p>
          <p className="text-xs t-soft">Assistance & dépôts</p>
        </div>
        {agentUnread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold text-white">{agentUnread}</span>}
      </button>

      <p className="px-4 pb-1 pt-4 text-xs font-medium uppercase tracking-wide t-faint">Communauté</p>

      {loading ? (
        <p className="mt-8 text-center text-sm t-faint">Chargement…</p>
      ) : convs.length === 0 ? (
        <p className="mt-6 px-6 text-center text-sm t-faint">Aucune conversation. Depuis le fil, touchez le profil d'une personne pour lui écrire.</p>
      ) : (
        <div>
          {convs.map((c) => (
            <button key={`${c.otherKind}:${c.otherId}`} onClick={() => router.push(`/messages/${c.otherKind}/${c.otherId}`)} className="flex w-full items-center gap-3 border-b border-sand-100 px-4 py-3 text-left transition-colors hover:bg-sand-50 dark:border-night-700 dark:hover:bg-night-800/50">
              <Avatar name={c.otherName} photo={c.otherPhoto} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold t-title">{c.otherName}</p>
                  <span className="shrink-0 text-[11px] t-faint">{timeAgo(c.lastAt)}</span>
                </div>
                <p className={`truncate text-xs ${c.unread > 0 ? 'font-medium t-title' : 't-soft'}`}>{c.lastFromMe ? 'Vous : ' : ''}{c.lastMessage}</p>
              </div>
              {c.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold text-white">{c.unread}</span>}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
