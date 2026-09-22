'use client';

import { useRef, useState } from 'react';

/**
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
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas indisponible'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Image illisible'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Lecture impossible'));
    reader.readAsDataURL(file);
  });
}

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
        capture="user"
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
      )}
    </div>
  );
}
