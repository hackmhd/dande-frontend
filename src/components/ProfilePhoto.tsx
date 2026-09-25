'use client';

import { useRef, useState } from 'react';

/**
 * Compresse une image (fichier choisi) en un data URI JPEG de petite taille
 * (max ~256px de côté), pour que la photo reste légère en base et à l'envoi.
 * Renvoie une promesse avec le data URI, ou rejette si le fichier n'est pas
 * une image lisible.
 */
export function compressImage(file: File, maxSize = 256, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Veuillez choisir une image.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire ce fichier.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height >= width && height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Traitement d’image indisponible.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface ProfilePhotoProps {
  /** Photo actuelle (data URI) ou null. */
  photo: string | null;
  /** Initiales à afficher quand il n'y a pas de photo. */
  initials: string;
  /** Taille en pixels du cercle. */
  size?: number;
  /** Appelé avec le nouveau data URI quand l'utilisateur choisit une image. */
  onChange?: (dataUri: string) => void;
  /** Autorise la modification (bouton appareil photo + galerie). */
  editable?: boolean;
  /** Autorise l'agrandissement au clic (aperçu plein écran). */
  enlargeable?: boolean;
}

/**
 * Avatar de profil : affiche la photo (ou les initiales), permet de
 * l'importer depuis la galerie OU l'appareil photo, et de l'agrandir au clic.
 *
 * IMPORTANT : le champ fichier n'a PAS d'attribut `capture`, donc le
 * téléphone propose bien « Galerie » ET « Appareil photo » au choix.
 */
export function ProfilePhoto({
  photo,
  initials,
  size = 96,
  onChange,
  editable = false,
  enlargeable = true,
}: ProfilePhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de re-choisir le même fichier
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const dataUri = await compressImage(file);
      onChange?.(dataUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setBusy(false);
    }
  }

  const dim = { width: size, height: size };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={dim}>
        <button
          type="button"
          onClick={() => {
            if (photo && enlargeable) setZoom(true);
            else if (editable) inputRef.current?.click();
          }}
          className="flex items-center justify-center overflow-hidden rounded-full bg-forest-600 font-semibold text-forest-50 shadow-sm"
          style={dim}
          aria-label={photo ? 'Voir la photo' : 'Ajouter une photo'}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Photo de profil" className="h-full w-full object-cover" />
          ) : (
            <span style={{ fontSize: size * 0.34 }}>{initials}</span>
          )}
        </button>

        {editable && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-forest-600 text-white shadow-md transition-transform active:scale-90 disabled:opacity-60 dark:border-night-800"
            aria-label="Changer la photo"
          >
            {busy ? (
              <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              // icône appareil photo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )}
          </button>
        )}

        {/* Pas d'attribut capture → galerie ET appareil photo proposés. */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {error && <p className="mt-2 text-center text-xs text-clay-600 dark:text-clay-100">{error}</p>}

      {/* Aperçu agrandi plein écran */}
      {zoom && photo && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setZoom(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Photo de profil agrandie" className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl" />
          <button
            type="button"
            onClick={() => setZoom(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
