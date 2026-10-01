'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { api, dm, DmMessage, PublicProfile, presenceLabel } from '@/lib/api';
import { compressImage } from '@/components/ProfilePhoto';
import { VoiceRecorder, MiniPlayer } from '@/components/VoiceRecorder';
import { saveDraft, loadDraft, clearDraft } from '@/lib/draft';

function time(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function initials(name: string) { return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '·'; }

export default function DmPage({ params }: { params: { kind: string; id: string } }) {
  const { kind, id } = params;
  const router = useRouter();
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [replyTo, setReplyTo] = useState<DmMessage | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null); // message dont le menu réactions est ouvert
  const [myPhoto, setMyPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const EMOJIS = ['👍', '❤️', '😂', '😮', '🙏', '🔥'];

  function load() {
    dm.conversation(kind, id)
      .then((r) => {
        // On conserve les messages locaux encore en cours d'envoi ou en échec
        // (ils ne sont pas encore côté serveur) et on les remet à la fin.
        setMessages((prev) => {
          const localPending = prev.filter((m) => m.status === 'sending' || m.status === 'failed');
          return [...r.messages, ...localPending];
        });
        setProfile(r.profile);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  const draftKey = `dm-${kind}-${id}`;
  useEffect(() => {
    if (!auth.isAuthenticated()) { router.replace('/login'); return; }
    load();
    // Ma photo de profil (pour afficher mon avatar sur mes notes vocales).
    api.getProfile().then((p) => setMyPhoto(p.photo ?? null)).catch(() => {});
    // Restaure le brouillon non envoyé pour cette conversation.
    setText(loadDraft(draftKey));
    const t = setInterval(load, 15000);
    // Ping de présence (« en ligne ») tant que la conversation est ouverte.
    dm.presence().catch(() => {});
    const p = setInterval(() => { dm.presence().catch(() => {}); }, 45000);
    return () => { clearInterval(t); clearInterval(p); };
  }, [router, kind, id]);
  // Sauvegarde le brouillon à chaque frappe (et le vide quand le champ l'est).
  useEffect(() => { saveDraft(draftKey, text); }, [text, draftKey]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setPhoto(await compressImage(f, 1024, 0.7)); } catch { /* ignore */ }
  }

  // Envoi optimiste : le message apparaît tout de suite avec un statut
  // « en cours d'envoi », puis « envoyé » (remplacé par la version serveur) ou
  // « échec » (avec bouton Réessayer) si le réseau a coupé.
  async function sendPayload(payload: { body?: string; photo?: string | null; audio?: string | null; replyToId?: string | null }) {
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    // Aperçu local de la citation (pour affichage immédiat).
    const quoted = payload.replyToId ? messages.find((m) => m.id === payload.replyToId) : null;
    const optimistic: DmMessage = {
      id: tempId, fromMe: true,
      body: payload.body ?? '', photo: payload.photo ?? null, audio: payload.audio ?? null,
      readAt: null, createdAt: new Date().toISOString(),
      replyTo: quoted ? { id: quoted.id, text: (quoted.body || (quoted.photo ? '📷 Photo' : quoted.audio ? '🎤 Note vocale' : '')).slice(0, 120) } : null,
      reactions: [],
      status: 'sending', _payload: payload,
    };
    setMessages((x) => [...x, optimistic]);
    try {
      const m = await dm.send(kind, id, payload);
      setMessages((x) => x.map((it) => (it.id === tempId ? m : it)));
    } catch {
      setMessages((x) => x.map((it) => (it.id === tempId ? { ...it, status: 'failed' } : it)));
    }
  }

  async function sendText() {
    if (!text.trim() && !photo) return;
    const body = text.trim(); const p = photo; const rid = replyTo?.id ?? null;
    setText(''); setPhoto(null); setReplyTo(null);
    await sendPayload({ body, photo: p, replyToId: rid });
  }

  async function sendVoice(dataUri: string) {
    const rid = replyTo?.id ?? null;
    setReplyTo(null);
    await sendPayload({ audio: dataUri, replyToId: rid });
  }

  // Réagir à un message (optimiste côté serveur : on applique le retour).
  async function react(messageId: string, emoji: string) {
    setMenuFor(null);
    try {
      const r = await dm.react(messageId, emoji);
      setMessages((x) => x.map((it) => (it.id === messageId ? { ...it, reactions: r.reactions } : it)));
    } catch { /* ignore */ }
  }

  // Réessayer un message échoué : on le repasse en « en cours » puis on renvoie.
  async function retry(m: DmMessage) {
    if (!m._payload) return;
    setMessages((x) => x.map((it) => (it.id === m.id ? { ...it, status: 'sending' } : it)));
    try {
      const sent = await dm.send(kind, id, m._payload);
      setMessages((x) => x.map((it) => (it.id === m.id ? sent : it)));
    } catch {
      setMessages((x) => x.map((it) => (it.id === m.id ? { ...it, status: 'failed' } : it)));
    }
  }

  async function removeMsg(id2: string) {
    const target = messages.find((m) => m.id === id2);
    // Un message local (non envoyé / échoué) se retire sans appel serveur.
    if (target && (target.status === 'sending' || target.status === 'failed')) {
      setMessages((x) => x.filter((m) => m.id !== id2));
      return;
    }
    if (!confirm('Supprimer ce message ?')) return;
    setMessages((x) => x.filter((m) => m.id !== id2));
    try { await dm.remove(id2); } catch { load(); }
  }

  // Numérote les notes vocales dans l'ordre (pour l'enchaînement automatique).
  const audioSeq = new Map<string, number>();
  let an = 0;
  for (const m of messages) if (m.audio) audioSeq.set(m.id, an++);
  const voiceGroup = `dm-${kind}-${id}`;

  return (
    <main className="flex h-[calc(100dvh-5rem)] flex-col">
      <header className="flex items-center gap-3 border-b border-sand-200 bg-white px-4 py-3 dark:border-night-700 dark:bg-night-900">
        <button onClick={() => router.back()} className="t-soft" aria-label="Retour">←</button>
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-forest-600 text-sm font-semibold text-forest-50">
          {profile?.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo} alt="" className="h-full w-full object-cover" />
          ) : initials(profile?.name ?? '·')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold t-title">{profile?.name ?? 'Conversation'}{profile?.isAdmin && <span className="ml-1.5 rounded bg-iris-500/15 px-1.5 py-0.5 text-[10px] font-medium text-iris-600 dark:text-iris-300">Dande</span>}</p>
          {(() => {
            const pr = presenceLabel(profile?.lastSeen);
            if (pr) return (
              <p className="flex items-center gap-1 text-xs t-faint">
                {pr.online && <span className="h-2 w-2 rounded-full bg-green-500" />}
                <span className={pr.online ? 'text-green-600 dark:text-green-400' : ''}>{pr.text}</span>
              </p>
            );
            return profile?.village ? <p className="truncate text-xs t-faint">{profile.village}</p> : null;
          })()}
        </div>
        {profile?.phone && (
          <a href={`tel:${profile.phone}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-600 text-white" aria-label="Appeler">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" /></svg>
          </a>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-sand-50 px-3 py-4 dark:bg-night-950">
        {loading ? (
          <p className="mt-8 text-center text-sm t-faint">Chargement…</p>
        ) : messages.length === 0 ? (
          <p className="mt-8 text-center text-sm t-faint">Démarrez la conversation.</p>
        ) : messages.map((m) => (
          <div key={m.id} className={`group flex flex-col ${m.fromMe ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-end gap-1 ${m.fromMe ? 'justify-end' : 'justify-start'} w-full`}>
              {m.fromMe && (
                <button onClick={() => removeMsg(m.id)} className="mb-1 shrink-0 text-red-500 opacity-0 transition-opacity group-hover:opacity-100" aria-label="Supprimer">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                </button>
              )}
              {/* Répondre (citer) */}
              {!m.status && (
                <button onClick={() => { setReplyTo(m); setMenuFor(null); }} className={`mb-1 shrink-0 t-faint opacity-0 transition-opacity group-hover:opacity-100 ${m.fromMe ? 'order-first' : ''}`} aria-label="Répondre">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17l-6-6 6-6" /><path d="M3 11h11a6 6 0 0 1 6 6v1" /></svg>
                </button>
              )}
              <div className={`relative max-w-[78%] cursor-pointer rounded-2xl px-3 py-2 text-sm ${m.fromMe ? 'bg-forest-600 text-white' : 'bg-white text-ink dark:bg-night-800 dark:text-iris-100/90'}`} onClick={() => !m.status && setMenuFor(menuFor === m.id ? null : m.id)}>
                {/* Citation du message auquel on répond */}
                {m.replyTo && (
                  <div className={`mb-1 rounded-lg border-l-2 px-2 py-1 text-xs ${m.fromMe ? 'border-white/60 bg-white/15 text-white/90' : 'border-forest-500 bg-sand-50 t-soft dark:bg-night-700'}`}>
                    {m.replyTo.text || '(message)'}
                  </div>
                )}
                {m.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photo} alt="" onClick={(e) => { e.stopPropagation(); setZoom(m.photo); }} className="mb-1 max-h-56 cursor-zoom-in rounded-lg object-cover" />
                )}
                {m.audio && <div className="my-1 w-64 max-w-full"><MiniPlayer src={m.audio} onDark={m.fromMe} groupId={voiceGroup} seq={audioSeq.get(m.id)} avatar={m.fromMe ? myPhoto : (profile?.photo ?? null)} avatarName={m.fromMe ? 'Moi' : (profile?.name ?? '')} /></div>}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${m.fromMe ? 'text-white/70' : 't-faint'}`}>
                  <span>{time(m.createdAt)}</span>
                  {m.status === 'sending' && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-label="Envoi en cours"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  )}
                  {m.status === 'failed' && <span className="font-medium text-red-200">Échec</span>}
                  {m.fromMe && !m.status && (
                    m.readAt ? (
                      <svg width="16" height="12" viewBox="0 0 20 12" fill="none" stroke="#7CC6FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Lu"><path d="M1 6.5 4.5 10 11 2.5" /><path d="M8 10 14.5 2.5" /></svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 14 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Envoyé"><path d="M1 6.5 4.5 10 11 2.5" /></svg>
                    )
                  )}
                </div>
                {m.status === 'failed' && (
                  <button onClick={(e) => { e.stopPropagation(); retry(m); }} className="mt-1 flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5" /></svg>
                    Réessayer
                  </button>
                )}
                {/* Menu de réactions (ouvert au clic sur la bulle) */}
                {menuFor === m.id && (
                  <div className="absolute -top-10 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-sand-200 bg-white px-2 py-1 shadow-lg dark:border-night-600 dark:bg-night-700" onClick={(e) => e.stopPropagation()}>
                    {EMOJIS.map((e) => (
                      <button key={e} onClick={() => react(m.id, e)} className="text-lg transition-transform hover:scale-125">{e}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Pastilles de réactions sous la bulle */}
            {m.reactions && m.reactions.length > 0 && (
              <div className={`mt-0.5 flex flex-wrap gap-1 ${m.fromMe ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
                {m.reactions.map((rc) => (
                  <button key={rc.emoji} onClick={() => react(m.id, rc.emoji)} className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] ${rc.mine ? 'border-forest-400 bg-forest-50 dark:border-iris-400 dark:bg-iris-500/15' : 'border-sand-200 bg-white dark:border-night-600 dark:bg-night-800'}`}>
                    <span>{rc.emoji}</span>{rc.count > 1 && <span className="t-soft">{rc.count}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-sand-200 bg-white px-3 py-2 pb-[env(safe-area-inset-bottom)] dark:border-night-700 dark:bg-night-900">
        {/* Aperçu de la réponse en cours (citation) */}
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-forest-500 bg-sand-50 px-2 py-1.5 dark:bg-night-800">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-forest-700 dark:text-iris-300">Réponse à {replyTo.fromMe ? 'vous' : (profile?.name ?? '')}</p>
              <p className="truncate text-xs t-soft">{replyTo.body || (replyTo.photo ? '📷 Photo' : replyTo.audio ? '🎤 Note vocale' : '')}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="shrink-0 t-faint" aria-label="Annuler la réponse">✕</button>
          </div>
        )}
        {photo && (
          <div className="mb-2 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" className="h-14 w-14 rounded-lg object-cover" />
            <button onClick={() => setPhoto(null)} className="text-xs text-red-600">Retirer</button>
          </div>
        )}
        <div className="flex items-end gap-1.5">
          {/* Pendant l'enregistrement / l'aperçu, l'enregistreur prend toute la barre. */}
          {!recording && (
            <>
              <button onClick={() => fileRef.current?.click()} className="flex h-10 w-10 shrink-0 items-center justify-center text-forest-700 dark:text-iris-300" aria-label="Photo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
              </button>
              <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }} rows={1} placeholder="Message…" className="max-h-28 flex-1 resize-none rounded-2xl border border-sand-200 bg-sand-50 px-3 py-2 text-sm outline-none focus:border-forest-400 dark:border-night-600 dark:bg-night-800 dark:text-white" />
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
          {/* Un seul bouton : micro quand rien à envoyer, sinon bouton Envoyer. */}
          {!recording && (text.trim() || photo) ? (
            <button onClick={sendText} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white" aria-label="Envoyer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
            </button>
          ) : (
            <VoiceRecorder onRecorded={sendVoice} onActiveChange={setRecording} />
          )}
        </div>
      </div>

      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-h-[85dvh] max-w-full rounded-xl object-contain" />
        </div>
      )}
    </main>
  );
}
