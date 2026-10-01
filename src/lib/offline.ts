'use client';

/**
 * Cache local léger pour un fonctionnement hors-ligne de consultation :
 * on garde la dernière réponse réussie (solde, profil, historique) pour pouvoir
 * l'afficher quand le réseau est coupé. Lecture seule : aucune opération
 * d'argent ne se fait hors-ligne.
 */

const PREFIX = 'dande_cache_';

export function cacheSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), value }));
  } catch { /* quota / privé : on ignore */ }
}

export function cacheGet<T>(key: string): { value: T; at: number } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; value: T };
    return { value: parsed.value, at: parsed.at };
  } catch { return null; }
}

/** Le navigateur se déclare-t-il hors-ligne ? */
export function isOffline(): boolean {
  try { return typeof navigator !== 'undefined' && navigator.onLine === false; } catch { return false; }
}

/** « il y a X » lisible, pour dater une donnée mise en cache. */
export function cacheAgeLabel(at: number): string {
  const s = Math.floor((Date.now() - at) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}
