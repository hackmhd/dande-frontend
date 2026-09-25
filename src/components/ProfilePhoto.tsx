'use client';

import { useRef, useState } from 'react';

/**
<<<<<<< HEAD
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
=======
 * Avatar du client avec possibilité de charger une photo depuis le téléphone.
 * L'image est automatiquement réduite (max 256px, JPEG qualité 0.8) avant
 * l'envoi, pour rester légère en base. Affiche les initiales si pas de photo.
 */
interface ProfilePhotoProps {
  photo: string | null;
  name: string;
  onChange: (dataUri: string) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
}

/** Réduit une image (fichier) en data URI JPEG de petite taille. */
function resizeImage(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
>>>>>>> c94a73b59a1631a50fd76ac3d632bcd6b425bc58
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
<<<<<<< HEAD
        } else if (height >= width && height > maxSize) {
=======
        } else if (height > maxSize) {
>>>>>>> c94a73b59a1631a50fd76ac3d632bcd6b425bc58
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
<<<<<<< HEAD
        if (!ctx) {
          reject(new Error('Traitement d’image indisponible.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
=======
        if (!ctx) return reject(new Error('Canvas indisponible'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Image illisible'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Lecture impossible'));
>>>>>>> c94a73b59a1631a50fd76ac3d632bcd6b425bc58
    reader.readAsDataURL(file);
  });
}

<<<<<<< HEAD
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
=======
export function ProfilePhoto({ photo, name, onChange, onRemove }: ProfilePhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const initials = name
    ? name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '·';

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const dataUri = await resizeImage(file);
      await onChange(dataUri);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="relative h-20 w-20 overflow-hidden rounded-full bg-forest-600 transition active:scale-95"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Photo de profil" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-forest-50">
            {initials}
          </span>
        )}
        <span className="absolute bottom-0 left-0 right-0 bg-black/40 py-0.5 text-[10px] text-white">
          {busy ? '…' : 'Modifier'}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {photo && (
        <button
          type="button"
          onClick={() => onRemove()}
          className="mt-2 text-xs text-clay-600 underline underline-offset-2 dark:text-clay-100"
        >
          Retirer la photo
        </button>
>>>>>>> c94a73b59a1631a50fd76ac3d632bcd6b425bc58
      )}
    </div>
  );
}
