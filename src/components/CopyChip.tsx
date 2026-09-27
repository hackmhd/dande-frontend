'use client';

import { useState } from 'react';

interface CopyChipProps {
  /** La valeur à copier (ticket, code…). */
  value: string;
  /** Libellé affiché (défaut : la valeur elle-même). */
  label?: string;
  /** Classe pour le style du texte (couleur, police mono…). */
  className?: string;
}

/**
 * Puce cliquable : au tap, copie la valeur dans le presse-papiers et affiche
 * « Copié ✓ » un court instant. Pratique pour communiquer un numéro de ticket
 * ou un code d'agent sans le retaper à la main.
 */
export function CopyChip({ value, label, className = '' }: CopyChipProps) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Repli pour les navigateurs sans API clipboard (contexte non sécurisé).
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* silencieux : si la copie échoue, l'utilisateur peut sélectionner à la main */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copier"
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono transition-colors hover:bg-forest-50 active:scale-95 dark:hover:bg-night-700 ${className}`}
    >
      <span>{label ?? value}</span>
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
      )}
      {copied && <span className="text-[10px] font-medium not-italic">Copié</span>}
    </button>
  );
}
