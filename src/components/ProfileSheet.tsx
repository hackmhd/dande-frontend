'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dm, PublicProfile } from '@/lib/api';

function initials(name: string) { return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '·'; }

/**
 * Fiche profil affichée depuis le fil : nom, village, numéro (si l'utilisateur
 * l'a rendu visible), et boutons Message / Appeler. Passe `me` pour éviter
 * d'ouvrir sa propre fiche.
 */
export function ProfileSheet({
  author, me, onClose,
}: {
  author: { kind: string; id: string };
  me?: { kind: string; id: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dm.profile(author.kind, author.id).then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, [author.kind, author.id]);

  const isMe = me && me.kind === author.kind && me.id === author.id;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 dark:bg-night-800 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <p className="py-8 text-center text-sm t-faint">Chargement…</p>
        ) : profile ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-forest-600 text-2xl font-semibold text-forest-50">
              {profile.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photo} alt={profile.name} className="h-full w-full object-cover" />
              ) : initials(profile.name)}
            </div>
            <p className="mt-3 text-lg font-semibold t-title">
              {profile.name}
              {profile.isAdmin && <span className="ml-2 rounded bg-iris-500/15 px-1.5 py-0.5 text-[11px] font-medium text-iris-600 dark:text-iris-300">Dande</span>}
            </p>
            {profile.village && <p className="text-sm t-soft">📍 {profile.village}</p>}
            {profile.phone ? (
              <p className="mt-1 text-sm t-soft">📞 {profile.phone}</p>
            ) : (
              <p className="mt-1 text-xs t-faint">Numéro privé</p>
            )}

            {!isMe && (
              <div className="mt-5 flex w-full gap-2.5">
                <button
                  onClick={() => { onClose(); router.push(`/messages/${author.kind}/${author.id}`); }}
                  className="btn-primary flex-1"
                >
                  Message
                </button>
                {profile.phone && (
                  <a href={`tel:${profile.phone}`} className="flex flex-1 items-center justify-center rounded-xl border border-sand-200 py-3 text-sm font-medium text-forest-700 dark:border-night-600 dark:text-forest-400">
                    Appeler
                  </a>
                )}
              </div>
            )}
            <button onClick={onClose} className="mt-3 text-sm t-faint">Fermer</button>
          </div>
        ) : (
          <p className="py-8 text-center text-sm t-faint">Profil indisponible.</p>
        )}
      </div>
    </div>
  );
}
