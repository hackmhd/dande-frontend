'use client';

import { useEffect, useRef, useState } from 'react';

/** Forme d'onde animée pendant l'enregistrement (barres verticales). */
function LiveWave({ analyser, paused, color = 'bg-forest-600' }: { analyser: AnalyserNode | null; paused: boolean; color?: string }) {
  const BARS = 28;
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.12));
  const rafRef = useRef<number | null>(null);
  const bufRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    if (!analyser) return;
    bufRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));
    function loop() {
      if (!analyser || !bufRef.current) return;
      if (paused) { rafRef.current = requestAnimationFrame(loop); return; }
      analyser.getByteTimeDomainData(bufRef.current);
      // Amplitude RMS -> un niveau, décalé dans le tableau (effet défilement).
      let sum = 0;
      for (let i = 0; i < bufRef.current.length; i++) {
        const v = (bufRef.current[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / bufRef.current.length);
      const lvl = Math.max(0.12, Math.min(1, rms * 3));
      setLevels((prev) => [...prev.slice(1), lvl]);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [analyser, paused]);

  return (
    <div className="flex h-8 min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
      {levels.map((l, i) => (
        <div key={i} className={`w-[3px] shrink-0 rounded-full ${color}`} style={{ height: `${Math.round(l * 100)}%`, opacity: 0.55 + l * 0.45 }} />
      ))}
    </div>
  );
}

/** Petit lecteur audio (bouton lecture/pause + forme d'onde de progression + durée). */
// --- Contrôleur audio global : une seule note vocale joue à la fois. -------
// Chaque lecteur s'enregistre ; quand l'un démarre, on met les autres en pause.
// Corrige le bug de deux vocaux qui jouaient en même temps, et sert à
// l'enchaînement automatique (la note suivante démarre à la fin de la précédente).
type AudioStopper = () => void;
const audioRegistry = new Set<AudioStopper>();
function registerAudio(stop: AudioStopper): () => void {
  audioRegistry.add(stop);
  return () => audioRegistry.delete(stop);
}
function stopOtherAudios(except: AudioStopper) {
  for (const stop of audioRegistry) if (stop !== except) stop();
}

// Enchaînement : quand une note finit, on signale son groupe + position pour que
// la suivante démarre. Les lecteurs d'un même groupe écoutent cet événement.
type ChainListener = (groupId: string, nextSeq: number) => void;
const chainListeners = new Set<ChainListener>();
function emitChain(groupId: string, nextSeq: number) {
  for (const l of chainListeners) l(groupId, nextSeq);
}

// Vitesse de lecture, mémorisée globalement.
const SPEEDS = [1, 1.5, 2] as const;
function loadSpeed(): number {
  try { const v = parseFloat(localStorage.getItem('dande_voice_speed') || '1'); return SPEEDS.includes(v as 1 | 1.5 | 2) ? v : 1; } catch { return 1; }
}

export function MiniPlayer({ src, accent = 'forest', onDark = false, groupId, seq }: { src: string; accent?: 'forest' | 'iris'; onDark?: boolean; groupId?: string; seq?: number }) {
  const BARS = 28;
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [speed, setSpeed] = useState(1);
  // Forme d'onde figée, déterministe (basée sur la source) pour un rendu stable.
  const bars = useRef<number[]>([]);
  if (bars.current.length === 0) {
    let seed = 0;
    for (let i = 0; i < Math.min(src.length, 400); i++) seed = (seed * 31 + src.charCodeAt(i)) & 0xffff;
    const arr: number[] = [];
    for (let i = 0; i < BARS; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; arr.push(0.25 + (seed % 1000) / 1000 * 0.75); }
    bars.current = arr;
  }

  useEffect(() => { setSpeed(loadSpeed()); }, []);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setCur(a.currentTime);
    const onDur = () => { if (isFinite(a.duration)) setDur(a.duration); };
    const onEnd = () => {
      setPlaying(false); setCur(0);
      // Enchaînement : demande le démarrage de la note suivante du groupe.
      if (groupId && typeof seq === 'number') emitChain(groupId, seq + 1);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onDur);
    a.addEventListener('durationchange', onDur);
    a.addEventListener('ended', onEnd);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    // S'enregistre dans le contrôleur global (pour être mis en pause par les autres).
    const unregister = registerAudio(() => { a.pause(); });
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onDur);
      a.removeEventListener('durationchange', onDur);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      unregister();
    };
  }, [groupId, seq]);

  // Applique la vitesse à l'élément audio dès qu'elle change.
  useEffect(() => { if (ref.current) ref.current.playbackRate = speed; }, [speed, playing]);

  // Écoute l'enchaînement : si c'est à mon tour (groupe + position), je démarre.
  useEffect(() => {
    if (!groupId || typeof seq !== 'number') return;
    const listener: ChainListener = (g, nextSeq) => {
      if (g === groupId && nextSeq === seq) { start(); }
    };
    chainListeners.add(listener);
    return () => { chainListeners.delete(listener); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, seq]);

  function start() {
    const a = ref.current;
    if (!a) return;
    const stopMe = () => a.pause();
    stopOtherAudios(stopMe); // coupe toute autre note en cours
    a.playbackRate = speed;
    a.play().then(() => setPlaying(true)).catch(() => {});
  }
  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (a.paused) start(); else a.pause();
  }
  function cycleSpeed() {
    const idx = SPEEDS.indexOf(speed as 1 | 1.5 | 2);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
    try { localStorage.setItem('dande_voice_speed', String(next)); } catch { /* */ }
  }

  function f(s: number) { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  const pct = dur > 0 ? cur / dur : 0;
  const played = Math.round(pct * BARS);
  const btn = onDark ? 'bg-white/25 text-white' : (accent === 'iris' ? 'bg-iris-500 text-white' : 'bg-forest-600 text-white');
  const onCol = onDark ? 'bg-white' : (accent === 'iris' ? 'bg-iris-500' : 'bg-forest-600');
  const offCol = onDark ? 'bg-white/35' : 'bg-black/15 dark:bg-white/20';
  const timeC = onDark ? 'text-white/80' : 'text-ink-soft dark:text-iris-100/60';
  const speedC = onDark ? 'bg-white/20 text-white' : 'bg-black/10 text-ink-soft dark:bg-white/15 dark:text-iris-100/70';

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
      <div className="flex h-7 min-w-0 flex-1 items-center gap-[2px] overflow-hidden">
        {bars.current.map((h, i) => (
          <div key={i} className={`w-[3px] shrink-0 rounded-full ${i < played ? onCol : offCol}`} style={{ height: `${Math.round(h * 100)}%` }} />
        ))}
      </div>
      <span className={`shrink-0 text-[11px] tabular-nums ${timeC}`}>{f(cur || dur)}</span>
      {/* Vitesse de lecture : visible seulement quand on écoute. */}
      {playing && (
        <button type="button" onClick={cycleSpeed} className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${speedC}`} aria-label="Vitesse de lecture">
          {speed}×
        </button>
      )}
    </div>
  );
}

/**
 * Enregistreur de note vocale style WhatsApp :
 * - Micro pour démarrer.
 * - Pendant l'enregistrement : forme d'onde animée + durée, puis une rangée
 *   Corbeille (supprimer) / Pause-Reprendre / Envoyer.
 * - À l'arrêt : aperçu (lecture) avec la même disposition.
 * - Stop + envoi automatique à 60 s.
 * La note n'est transmise à `onRecorded` qu'à la confirmation (bouton Envoyer).
 */
export function VoiceRecorder({ onRecorded, disabled, onActiveChange }: { onRecorded: (dataUri: string) => void; disabled?: boolean; onActiveChange?: (active: boolean) => void }) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'paused' | 'preview'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [pressed, setPressed] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const cancelledRef = useRef(false);

  const MAX_SECONDS = 60;

  useEffect(() => { onActiveChange?.(phase !== 'idle'); }, [phase, onActiveChange]);

  function stopTimer() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }
  function releaseStream() { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  function releaseAudioCtx() { try { audioCtxRef.current?.close(); } catch { /* */ } audioCtxRef.current = null; setAnalyser(null); }

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
      // Analyseur pour la forme d'onde animée.
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const srcNode = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 512;
        srcNode.connect(an);
        audioCtxRef.current = ctx;
        setAnalyser(an);
      } catch { /* la waveform restera plate si non supporté */ }
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        releaseStream();
        releaseAudioCtx();
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
  function cancel() { cancelledRef.current = true; stopTimer(); try { recRef.current?.stop(); } catch { /* */ } releaseStream(); releaseAudioCtx(); setSeconds(0); setPhase('idle'); }

  function discardPreview() { setPreview(null); setSeconds(0); setPhase('idle'); }
  function confirmSend() { if (preview) onRecorded(preview); setPreview(null); setSeconds(0); setPhase('idle'); }

  function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

  // Corbeille (rouge), à gauche.
  const TrashBtn = (
    <button type="button" onClick={phase === 'preview' ? discardPreview : cancel} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-600" aria-label="Supprimer">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" /></svg>
    </button>
  );
  // Envoyer (vert), à droite.
  const SendBtn = (
    <button type="button" onClick={phase === 'preview' ? confirmSend : finish} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white shadow-sm" aria-label="Envoyer">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
    </button>
  );

  // --- Rendu enregistrement / pause ---
  if (phase === 'recording' || phase === 'paused') {
    return (
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center gap-3 rounded-2xl bg-sand-100 px-4 py-3 dark:bg-night-700">
          <span className="shrink-0 text-sm font-medium tabular-nums text-ink dark:text-iris-100/90">{fmt(seconds)}</span>
          <LiveWave analyser={analyser} paused={phase === 'paused'} />
          <span className="shrink-0 text-xs tabular-nums text-ink-faint dark:text-iris-100/40">{fmt(MAX_SECONDS)}</span>
        </div>
        <div className="flex items-center gap-3">
          {TrashBtn}
          <button type="button" onClick={phase === 'recording' ? pause : resume} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-forest-600/10 font-medium text-forest-700 dark:bg-iris-500/15 dark:text-iris-300">
            {phase === 'recording' ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                Pause
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" /></svg>
                Reprendre
              </>
            )}
          </button>
          {SendBtn}
        </div>
      </div>
    );
  }

  // --- Rendu aperçu ---
  if (phase === 'preview' && preview) {
    return (
      <div className="flex w-full items-center gap-3">
        {TrashBtn}
        <div className="flex min-w-0 flex-1 items-center rounded-full bg-sand-100 py-1.5 pl-2 pr-3 dark:bg-night-700">
          <MiniPlayer src={preview} />
        </div>
        {SendBtn}
      </div>
    );
  }

  // --- Micro (repos) ---
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => { setPressed(true); setTimeout(() => setPressed(false), 450); start(); }}
        disabled={disabled}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-forest-700 transition-transform duration-150 active:scale-90 disabled:opacity-40 dark:text-iris-300"
        aria-label="Note vocale"
      >
        {/* Onde au clic du micro (retour visuel). */}
        {pressed && <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-forest-500/30 dark:bg-iris-400/30" />}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" /></svg>
      </button>
      {error && <span className="text-[10px] text-clay-600">{error}</span>}
    </div>
  );
}
