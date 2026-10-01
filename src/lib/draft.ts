'use client';

/**
 * Brouillons de conversation : garde le texte tapé mais non envoyé, par
 * conversation, pour le restaurer quand on y revient. Stockage local léger.
 */
const PREFIX = 'dande_draft_';

export function saveDraft(key: string, text: string): void {
  try {
    if (text && text.trim()) localStorage.setItem(PREFIX + key, text);
    else localStorage.removeItem(PREFIX + key);
  } catch { /* ignore */ }
}

export function loadDraft(key: string): string {
  try { return localStorage.getItem(PREFIX + key) || ''; } catch { return ''; }
}

export function clearDraft(key: string): void {
  try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
}
