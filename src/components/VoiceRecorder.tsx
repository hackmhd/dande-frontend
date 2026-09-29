'use client';

import { useEffect, useRef, useState } from 'react';

/** Petit lecteur audio compact (bouton lecture/pause + durée), adapté au mobile. */
export function MiniPlayer({ src, accent = 'forest', onDark = false }: { src: string; accent?: 'forest' | 'iris'; onDark?: boolean }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setCur(a.currentTime);
    const onDur = () => { if (isFinite(a.duration)) setDur(a.duration); };
    const onEnd = () => { setPlaying(false); setCur(0); };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onDur);
    a.addEventListener('durationchange', onDur);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onDur);
      a.removeEventListener('durationchange', onDur);
      a.removeEventListener('ended', onEnd);
    };
  }, []);

  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  }
  function f(s: number) { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;
  // Sur fond coloré (bulle envoyée), on passe en blanc ; sinon couleur d'accent.
  const btn = onDark ? 'bg-white/25 text-white' : (accent === 'iris' ? 'bg-iris-500 text-white' : 'bg-forest-600 text-white');
  const track = onDark ? 'bg-white/25' : 'bg-black/10 dark:bg-white/15';
  const fill = onDark ? 'bg-white' : (accent === 'iris' ? 'bg-iris-500' : 'bg-forest-600');
  const timeC = onDark ? 'text-white/80' : 'text-ink-soft dark:text-iris-100/60';

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <audio ref={ref} src={src} preload="metadata" className="hidden" />
      <button type="button" onClick={toggle} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${btn}`} aria-label={playing ? 'Pause' : 'Lire'}>
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l11-7z" /></svg>
        )}
      </button>
      <div className={`h-1.5 min-w-0 flex-1 overflow-hidden rounded-full ${track}`}>
        <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`shrink-0 text-[11px] tabular-nums ${timeC}`}>{f(cur || dur)}</span>
    </div>
  );
}

/**
 * Enregistreur de note vocale complet :
 * - Appui pour démarrer.
 * - Pendant l'enregistrement : Pause / Reprendre, ou Annuler.
 * - À l'arrêt : aperçu (lecture) puis Envoyer, ou Supprimer (recommencer).
 * - Stop automatique à 60 s.
 * La note n'est transmise à `onRecorded` que lorsque l'utilisateur confirme.
 */
export function VoiceRecorder({ onRecorded, disabled, onActiveChange }: { onRecorded: (dataUri: string) => void; disabled?: boolean; onActiveChange?: (active: boolean) => void }) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'paused' | 'preview'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);

  const MAX_SECONDS = 60;

  // Signale au parent quand l'enregistreur occupe toute la barre (pour masquer
  // la photo + la zone de texte pendant l'enregistrement / l'aperçu).
  useEffect(() => { onActiveChange?.(phase !== 'idle'); }, [phase, onActiveChange]);

  function stopTimer() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }
  function releaseStream() { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; }

  function tick() {
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) { finish(); return MAX_SECONDS; }
        return s + 1;
      });
    }, 1000);
  }

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Enregistrement non supporté.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        releaseStream();
        if (cancelledRef.current) { setPhase('idle'); setSeconds(0); return; }
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => { setPreview(reader.result as string); setPhase('preview'); };
        reader.readAsDataURL(blob);
      };
      rec.start();
      recRef.current = rec;
      setPhase('recording');
      setSeconds(0);
      tick();
    } catch {
      setError('Micro non autorisé.');
    }
  }

  function pause() {
    if (recRef.current?.state === 'recording') { recRef.current.pause(); stopTimer(); setPhase('paused'); }
  }
  function resume() {
    if (recRef.current?.state === 'paused') { recRef.current.resume(); tick(); setPhase('recording'); }
  }
  function finish() { stopTimer(); try { recRef.current?.stop(); } catch { /* */ } }
  function cancel() { cancelledRef.current = true; stopTimer(); try { recRef.current?.stop(); } catch { /* */ } releaseStream(); setSeconds(0); setPhase('idle'); }

  function discardPreview() { setPreview(null); setSeconds(0); setPhase('idle'); }
  function confirmSend() { if (preview) onRecorded(preview); setPreview(null); setSeconds(0); setPhase('idle'); }

  function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

  // --- Rendu ---
  if (phase === 'preview' && preview) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-sand-100 py-1 pl-2 pr-1 dark:bg-night-700">
        <MiniPlayer src={preview} />
        <button type="button" onClick={discardPreview} className="shrink-0 rounded-full p-1.5 text-red-600" aria-label="Supprimer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
        </button>
        <button type="button" onClick={confirmSend} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white" aria-label="Envoyer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
        </button>
      </div>
    );
  }

  if (phase === 'recording' || phase === 'paused') {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 dark:bg-red-500/10">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-red-600 ${phase === 'recording' ? 'animate-pulse' : ''}`} />
        <span className="flex-1 text-xs font-medium tabular-nums text-red-600">{fmt(seconds)}</span>
        <button type="button" onClick={cancel} className="rounded-full p-1 text-ink-soft dark:text-iris-100/60" aria-label="Annuler">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        {phase === 'recording' ? (
          <button type="button" onClick={pause} className="rounded-full p-1 text-forest-700 dark:text-iris-300" aria-label="Pause">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          </button>
        ) : (
          <button type="button" onClick={resume} className="rounded-full p-1 text-forest-700 dark:text-iris-300" aria-label="Reprendre">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l11-7z" /></svg>
          </button>
        )}
        <button type="button" onClick={finish} className="rounded-full bg-forest-600 p-1.5 text-white" aria-label="Terminer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={start} disabled={disabled} className="flex h-10 w-10 items-center justify-center rounded-full text-forest-700 disabled:opacity-40 dark:text-iris-300" aria-label="Note vocale">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" /></svg>
      </button>
      {error && <span className="text-[10px] text-clay-600">{error}</span>}
    </div>
  );
}
