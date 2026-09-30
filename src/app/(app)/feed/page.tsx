'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { api, FeedPost, FeedComment } from '@/lib/api';
import { compressImage } from '@/components/ProfilePhoto';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProfileSheet } from '@/components/ProfileSheet';

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '·';
}

function Avatar({ name, photo, size = 40 }: { name: string; photo: string | null; size?: number }) {
  return (
    <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-forest-600 font-semibold text-forest-50" style={{ width: size, height: size }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.36 }}>{initials(name)}</span>
      )}
    </div>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [viewProfile, setViewProfile] = useState<{ kind: string; id: string } | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    api.getFeed().then(setPosts).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => {
    if (!auth.isAuthenticated()) { router.replace('/login'); return; }
    load();
    api.getProfile().then((p) => setMeId(p.id)).catch(() => {});
  }, [router]);

  async function pickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    for (const f of files.slice(0, 4 - photos.length)) {
      try { const c = await compressImage(f, 1024, 0.7); setPhotos((p) => [...p, c].slice(0, 4)); } catch { /* ignore */ }
    }
  }

  async function submitPost() {
    if ((!text.trim() && photos.length === 0) || posting) return;
    setPosting(true);
    try {
      await api.createPost(text.trim(), photos);
      setText(''); setPhotos([]); setComposing(false);
      setLoading(true); load();
    } catch { /* ignore */ } finally { setPosting(false); }
  }

  async function toggleLike(p: FeedPost) {
    // Optimiste
    setPosts((list) => list.map((x) => x.id === p.id ? { ...x, liked: !x.liked, likeCount: x.likeCount + (x.liked ? -1 : 1) } : x));
    try { await api.likePost(p.id); } catch { load(); }
  }

  async function remove(p: FeedPost) {
    if (!confirm('Supprimer cette publication ?')) return;
    setPosts((list) => list.filter((x) => x.id !== p.id));
    try { await api.deletePost(p.id); } catch { load(); }
  }

  async function report(p: FeedPost) {
    try { await api.reportContent({ postId: p.id }, 'Signalé depuis le fil'); alert('Signalement envoyé. Merci.'); } catch { /* ignore */ }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-sand-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-night-700 dark:bg-night-900/95">
        <h1 className="text-lg font-semibold text-forest-700 dark:text-white">Communauté Dande</h1>
        <ThemeToggle />
      </header>

      {/* Barre « Créer une publication » */}
      <button onClick={() => setComposing(true)} className="mx-3 mt-3 rounded-full border border-sand-200 bg-white px-4 py-2.5 text-left text-sm t-faint dark:border-night-700 dark:bg-night-800">
        Partagez quelque chose…
      </button>

      {loading ? (
        <p className="mt-8 text-center text-sm t-faint">Chargement du fil…</p>
      ) : posts.length === 0 ? (
        <p className="mt-8 px-6 text-center text-sm t-faint">Aucune publication pour le moment. Soyez le premier à publier !</p>
      ) : (
        <div className="space-y-3 p-3">
          {posts.map((p) => (
            <article key={p.id} className="surface overflow-hidden">
              <div className="flex items-center gap-3 px-4 pt-3">
                <button onClick={() => setViewProfile({ kind: p.author.kind, id: p.author.id })} className="active:scale-95">
                  <Avatar name={p.author.name} photo={p.author.photo} />
                </button>
                <button onClick={() => setViewProfile({ kind: p.author.kind, id: p.author.id })} className="flex-1 text-left">
                  <p className="text-sm font-semibold t-title">
                    {p.author.name}
                    {p.author.isAdmin && <span className="ml-1.5 rounded bg-iris-500/15 px-1.5 py-0.5 text-[10px] font-medium text-iris-600 dark:text-iris-300">Dande</span>}
                  </p>
                  <p className="text-xs t-faint">{timeAgo(p.createdAt)}</p>
                </button>
                <PostMenu canDelete={p.canDelete} onDelete={() => remove(p)} onReport={() => report(p)} />
              </div>

              {p.body && <p className="whitespace-pre-wrap break-words px-4 py-2 text-sm t-title">{p.body}</p>}

              {p.photos.length > 0 && (
                <div className={`grid gap-0.5 ${p.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {p.photos.map((ph, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={ph} alt="" onClick={() => setZoom(ph)} className="max-h-80 w-full cursor-zoom-in object-cover" />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 px-4 py-2.5 text-sm">
                <button onClick={() => toggleLike(p)} className={`flex items-center gap-1.5 ${p.liked ? 'text-red-600' : 't-soft'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={p.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
                  {p.likeCount > 0 && p.likeCount}
                </button>
                <button onClick={() => setOpenComments(openComments === p.id ? null : p.id)} className="flex items-center gap-1.5 t-soft">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" /></svg>
                  {p.commentCount > 0 ? p.commentCount : 'Commenter'}
                </button>
              </div>

              {openComments === p.id && <Comments postId={p.id} onCountChange={(n) => setPosts((list) => list.map((x) => x.id === p.id ? { ...x, commentCount: n } : x))} onOpenProfile={setViewProfile} />}
            </article>
          ))}
        </div>
      )}

      {/* Composer modal */}
      {composing && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setComposing(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-white p-4 dark:bg-night-800 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold t-title">Nouvelle publication</h3>
              <button onClick={() => setComposing(false)} className="t-faint">✕</button>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Exprimez-vous…" className="w-full resize-none rounded-xl border border-sand-200 bg-sand-50 p-3 text-sm outline-none focus:border-forest-400 dark:border-night-600 dark:bg-night-900 dark:text-white" />
            {photos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {photos.map((ph, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ph} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    <button onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <button onClick={() => fileRef.current?.click()} disabled={photos.length >= 4} className="flex items-center gap-1.5 text-sm text-forest-700 disabled:opacity-40 dark:text-iris-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                Photo ({photos.length}/4)
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={pickPhotos} className="hidden" />
              <button onClick={submitPost} disabled={posting || (!text.trim() && photos.length === 0)} className="btn-primary disabled:opacity-50">
                {posting ? 'Publication…' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-h-[88dvh] max-w-full rounded-xl object-contain" />
        </div>
      )}

      {viewProfile && (
        <ProfileSheet
          author={viewProfile}
          me={meId ? { kind: 'client', id: meId } : undefined}
          onClose={() => setViewProfile(null)}
        />
      )}
    </main>
  );
}

function PostMenu({ canDelete, onDelete, onReport }: { canDelete: boolean; onDelete: () => void; onReport: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="t-faint" aria-label="Options">⋯</button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-sand-200 bg-white text-sm shadow-lg dark:border-night-700 dark:bg-night-800">
            <button onClick={() => { setOpen(false); onReport(); }} className="block w-full px-4 py-2.5 text-left t-title hover:bg-sand-50 dark:hover:bg-night-700">Signaler</button>
            {canDelete && <button onClick={() => { setOpen(false); onDelete(); }} className="block w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-night-700">Supprimer</button>}
          </div>
        </>
      )}
    </div>
  );
}

function Comments({ postId, onCountChange, onOpenProfile }: { postId: string; onCountChange: (n: number) => void; onOpenProfile: (a: { kind: string; id: string }) => void }) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<FeedComment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reload() { api.getComments(postId).then((c) => { setComments(c); onCountChange(c.length); }).catch(() => {}); }
  useEffect(() => { reload(); }, [postId]);

  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true);
    const body = text.trim();
    setText('');
    const parent = replyTo?.id ?? null;
    setReplyTo(null);
    try { await api.addComment(postId, body, parent); reload(); }
    catch { setText(body); } finally { setBusy(false); }
  }

  async function like(c: FeedComment) {
    setComments((list) => list.map((x) => x.id === c.id ? { ...x, liked: !x.liked, likeCount: x.likeCount + (x.liked ? -1 : 1) } : x));
    try { await api.likeComment(c.id); } catch { reload(); }
  }
  async function del(c: FeedComment) {
    if (!confirm('Supprimer ce commentaire ?')) return;
    setComments((list) => list.filter((x) => x.id !== c.id && x.parentId !== c.id));
    try { await api.deleteComment(c.id); onCountChange(comments.length - 1); } catch { reload(); }
  }
  async function report(c: FeedComment) {
    try { await api.reportContent({ commentId: c.id }, 'Commentaire signalé'); alert('Commentaire signalé. Merci.'); } catch { /* ignore */ }
  }
  function startReply(c: FeedComment) { setReplyTo(c); inputRef.current?.focus(); }

  // Regroupe : commentaires racines + leurs réponses.
  const roots = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  function CommentRow({ c, isReply }: { c: FeedComment; isReply?: boolean }) {
    return (
      <div className={`flex gap-2 ${isReply ? 'ml-8' : ''}`}>
        <button onClick={() => onOpenProfile({ kind: c.author.kind, id: c.author.id })}><Avatar name={c.author.name} photo={c.author.photo} size={isReply ? 24 : 28} /></button>
        <div className="min-w-0 flex-1">
          <div className="inline-block max-w-full rounded-2xl bg-sand-50 px-3 py-1.5 dark:bg-night-700">
            <button onClick={() => onOpenProfile({ kind: c.author.kind, id: c.author.id })} className="text-xs font-semibold t-title">
              {c.author.name}
              {c.author.isAdmin && <span className="ml-1 text-[9px] text-iris-600 dark:text-iris-300">· Dande</span>}
            </button>
            <p className="whitespace-pre-wrap break-words text-sm t-title">{c.body}</p>
          </div>
          <div className="mt-0.5 flex items-center gap-3 pl-1 text-[11px] t-faint">
            <button onClick={() => like(c)} className={c.liked ? 'font-medium text-red-600' : 'hover:underline'}>
              J’aime{c.likeCount > 0 ? ` · ${c.likeCount}` : ''}
            </button>
            {!isReply && <button onClick={() => startReply(c)} className="hover:underline">Répondre</button>}
            <button onClick={() => report(c)} className="hover:underline">Signaler</button>
            {c.canDelete && <button onClick={() => del(c)} className="text-red-600 hover:underline">Supprimer</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-sand-100 px-4 py-3 dark:border-night-700">
      <div className="space-y-3">
        {roots.map((c) => (
          <div key={c.id} className="space-y-2">
            <CommentRow c={c} />
            {repliesOf(c.id).map((rp) => <CommentRow key={rp.id} c={rp} isReply />)}
          </div>
        ))}
      </div>

      {replyTo && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-sand-50 px-3 py-1.5 text-xs t-soft dark:bg-night-700">
          <span>Réponse à <span className="font-medium t-title">{replyTo.author.name}</span></span>
          <button onClick={() => setReplyTo(null)} className="t-faint">✕</button>
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2">
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder={replyTo ? 'Votre réponse…' : 'Écrire un commentaire…'} className="flex-1 rounded-full border border-sand-200 bg-sand-50 px-3 py-1.5 text-sm outline-none focus:border-forest-400 dark:border-night-600 dark:bg-night-900 dark:text-white" />
        <button onClick={send} disabled={busy || !text.trim()} className="text-sm font-medium text-forest-700 disabled:opacity-40 dark:text-iris-300">Envoyer</button>
      </div>
    </div>
  );
}
