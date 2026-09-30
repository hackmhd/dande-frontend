'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { dm, DmMessage, PublicProfile } from '@/lib/api';
import { compressImage } from '@/components/ProfilePhoto';
import { VoiceRecorder, MiniPlayer } from '@/components/VoiceRecorder';

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
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  function load() {
    dm.conversation(kind, id).then((r) => { setMessages(r.messages); setProfile(r.profile); }).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => {
    if (!auth.isAuthenticated()) { router.replace('/login'); return; }
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [router, kind, id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setPhoto(await compressImage(f, 1024, 0.7)); } catch { /* ignore */ }
  }

  async function sendText() {
    if (!text.trim() && !photo) return;
    const body = text.trim(); const p = photo;
    setText(''); setPhoto(null);
    try { const m = await dm.send(kind, id, { body, photo: p }); setMessages((x) => [...x, m]); }
    catch { setText(body); setPhoto(p); }
  }

  async function sendVoice(dataUri: string) {
    try { const m = await dm.send(kind, id, { audio: dataUri }); setMessages((x) => [...x, m]); } catch { /* ignore */ }
  }

  async function removeMsg(id2: string) {
    if (!confirm('Supprimer ce message ?')) return;
    setMessages((x) => x.filter((m) => m.id !== id2));
    try { await dm.remove(id2); } catch { load(); }
  }

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
        <div className="flex-1">
          <p className="text-sm font-semibold t-title">{profile?.name ?? 'Conversation'}{profile?.isAdmin && <span className="ml-1.5 rounded bg-iris-500/15 px-1.5 py-0.5 text-[10px] font-medium text-iris-600 dark:text-iris-300">Dande</span>}</p>
          {profile?.village && <p className="text-xs t-faint">{profile.village}</p>}
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
          <div key={m.id} className={`group flex items-end gap-1 ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
            {m.fromMe && (
              <button onClick={() => removeMsg(m.id)} className="mb-1 shrink-0 text-red-500 opacity-0 transition-opacity group-hover:opacity-100" aria-label="Supprimer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
              </button>
            )}
            <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${m.fromMe ? 'bg-forest-600 text-white' : 'bg-white text-ink dark:bg-night-800 dark:text-iris-100/90'}`}>
              {m.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.photo} alt="" onClick={() => setZoom(m.photo)} className="mb-1 max-h-56 cursor-zoom-in rounded-lg object-cover" />
              )}
              {m.audio && <div className="my-1 w-56 max-w-full"><MiniPlayer src={m.audio} onDark={m.fromMe} /></div>}
              {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
              <p className={`mt-0.5 text-[10px] ${m.fromMe ? 'text-white/70' : 't-faint'}`}>{time(m.createdAt)}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-sand-200 bg-white px-3 py-2 pb-[env(safe-area-inset-bottom)] dark:border-night-700 dark:bg-night-900">
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
