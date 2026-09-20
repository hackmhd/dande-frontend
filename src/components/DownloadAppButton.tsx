'use client';

import { useState, useEffect } from 'react';

/**
 * Bouton « Télécharger l'application » qui ne s'affiche que sur Android.
 * Le fichier dande.apk doit être placé dans le dossier `public/` de l'app ;
 * il sera alors servi à l'adresse /dande.apk.
 *
 * Sur iPhone et ordinateur, le bouton ne s'affiche pas (un .apk ne s'y
 * installe pas).
 */
export function DownloadAppButton() {
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsAndroid(/android/i.test(navigator.userAgent));
    }
  }, []);

  if (!isAndroid) return null;

  return (
    <a
      href="/dande.apk"
      download
      className="mt-6 flex items-center justify-center gap-2.5 rounded-xl border border-forest-600 bg-forest-50 px-5 py-3 text-sm font-medium text-forest-700 transition-all duration-200 hover:bg-forest-100 active:scale-[0.98] dark:border-iris-500 dark:bg-iris-500/10 dark:text-iris-200"
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v12M8 11l4 4 4-4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      Télécharger l'application
    </a>
  );
}
