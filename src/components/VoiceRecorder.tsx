'use client';

import { useRef, useState } from 'react';

/**
 * Enregistreur de note vocale complet :
 * - Appui pour démarrer.
 * - Pendant l'enregistrement : Pause / Reprendre, ou Annuler.
 * - À l'arrêt : aperçu (lecture) puis Envoyer, ou Supprimer (recommencer).
 * - Stop automatique à 60 s.
 * La note n'est transmise à `onRecorded` que lorsque l'utilisateur confirme.
 */
export function VoiceRecorder({ onRecorded, disabled }: { onRecorded: (dataUri: string) => void; disabled?: boolean }) {
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
      <div className="flex w-full items-center gap-2 rounded-full bg-sand-100 px-2 py-1 dark:bg-night-700">
        <audio controls src={preview} className="h-8 min-w-0 flex-1" />
        <button type="button" onClick={discardPreview} className="shrink-0 rounded-full p-1.5 text-red-600" aria-label="Supprimer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
        </button>
        <button type="button" onClick={confirmSend} className="shrink-0 rounded-full bg-forest-600 p-2 text-white" aria-label="Envoyer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
        </button>
      </div>
    );
  }

  if (phase === 'recording' || phase === 'paused') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-red-50 px-2 py-1 dark:bg-red-500/10">
        <span className={`h-2.5 w-2.5 rounded-full bg-red-600 ${phase === 'recording' ? 'animate-pulse' : ''}`} />
        <span className="text-xs font-medium tabular-nums text-red-600">{fmt(seconds)}</span>
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
