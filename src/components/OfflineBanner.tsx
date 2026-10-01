'use client';

/** Bandeau « hors-ligne » : données en cache, consultation seule. */
export function OfflineBanner({ at }: { at?: number }) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-lg border border-clay-100 bg-clay-50 px-3 py-2 text-xs text-clay-800 dark:border-clay-600/30 dark:bg-clay-600/15 dark:text-clay-100">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M1 1l22 22M16.7 11.1a6 6 0 0 1 3.3 1.6M5 12.5a9 9 0 0 1 4-2.3M8.5 16a4 4 0 0 1 4-1M12 20h.01" /></svg>
      <span>Hors-ligne — données enregistrées{at ? ` (${age(at)})` : ''}. La consultation seule est possible.</span>
    </div>
  );
}

function age(at: number): string {
  const s = Math.floor((Date.now() - at) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}
