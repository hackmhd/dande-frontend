'use client';

import { useRef, useState } from 'react';

/**
 * Bouton d'enregistrement de note vocale. Appuie pour démarrer, ré-appuie
 * pour arrêter (ou s'arrête tout seul à 30 s). Produit un data URI audio
 * (webm/opus) transmis à `onRecorded`. Nécessite l'autorisation micro.
 */
export function VoiceRecorder({ onRecorded, disabled }: { onRecorded: (dataUri: string) => void; disabled?: boolean }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const MAX_SECONDS = 30;

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Enregistrement non supporté sur cet appareil.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const reader = new FileReader();
        reader.onload = () => onRecorded(reader.result as string);
        reader.readAsDataURL(blob);
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) { stop(); return MAX_SECONDS; }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('Micro non autorisé.');
    }
  }

  function stop() {
    stopTimer();
    setRecording(false);
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={disabled}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${recording ? 'animate-pulse bg-red-600 text-white' : 'text-forest-700 dark:text-iris-300'} disabled:opacity-40`}
        aria-label={recording ? 'Arrêter' : 'Note vocale'}
      >
        {recording ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" /></svg>
        )}
      </button>
      {recording && <span className="mt-0.5 text-[10px] font-medium text-red-600">{seconds}s / {MAX_SECONDS}s</span>}
      {error && <span className="mt-0.5 text-[10px] text-clay-600">{error}</span>}
    </div>
  );
}
