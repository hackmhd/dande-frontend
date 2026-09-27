const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function formatFcfa(amount: number): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  return `${grouped}\u00A0FCFA`;
}

function authHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('dande_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (data: { name: string; phone: string; email: string; password: string; adminCode: string; photo?: string | null }) =>
    request<{ token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Connexion phase de test : identifiant (numéro OU e-mail) + mot de passe,
  // sans double authentification. L'identifiant est envoyé tel quel ;
  // le backend détermine s'il s'agit d'un numéro ou d'un e-mail.
  login: (identifier: string, password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  // --- Double authentification (OTP) : prévue, désactivée pour la phase de
  // test. Conservée pour réactivation ultérieure. ---
  requestOtp: (phoneNumber: string) =>
    request<{ sent: boolean }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }),
  verifyOtp: (phoneNumber: string, code: string) =>
    request<{ token: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code }),
    }),

  updateProfile: (updates: { name?: string; village?: string }) =>
    request<{ name: string; village: string }>('/wallet/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  getProfile: () =>
    request<{
      id: string;
      name: string;
      phone: string;
      email: string;
      village: string;
      photo: string | null;
      photoHidden: boolean;
      memberSince: string;
    }>('/wallet/profile'),

  // Définir / changer / retirer (photo = null) sa photo de profil.
  updatePhoto: (photo: string | null, hidden?: boolean) =>
    request<{ photo: string | null; photoHidden?: boolean }>('/wallet/photo', {
      method: 'PUT',
      body: JSON.stringify({ photo, ...(typeof hidden === 'boolean' ? { hidden } : {}) }),
    }),

  getTontines: () =>
    request<
      Array<{
        id: string;
        code: string;
        name: string;
        dailyAmountFcfa: number | null;
        durationDays: number | null;
        isFlexible: boolean;
        startedAt: string;
        memberCount: number;
      }>
    >('/tontines'),

  getMyTontine: () =>
    request<{
      participationId: string;
      tontineId: string;
      name: string;
      dailyAmountFcfa: number | null;
      durationDays: number | null;
      startedAt: string;
      lockedUntil: string;
      savedFcfa: number;
      currentStreak: number;
      paidCount: number;
    } | null>('/tontines/mine'),

  joinTontine: (tontineId: string) =>
    request<{ participationId: string }>('/tontines/join', {
      method: 'POST',
      body: JSON.stringify({ tontineId }),
    }),

  getPushKey: () =>
    request<{ enabled: boolean; publicKey: string }>('/push/public-key'),

  subscribePush: (sub: unknown) =>
    request<{ subscribed: boolean }>('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(sub),
    }),

  unsubscribePush: (endpoint: string) =>
    request<{ unsubscribed: boolean }>('/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    }),

  requestPasswordReset: () =>
    request<{ id: string; status: string }>('/password-reset', {
      method: 'POST',
    }),

  completePasswordReset: (code: string, newPassword: string) =>
    request<{ completed: boolean }>('/password-reset/complete', {
      method: 'POST',
      body: JSON.stringify({ code, newPassword }),
    }),

  getWallet: () =>
    request<{
      balanceFcfa: number;
      currentStreak: number;
      depositCount: number;
      lastDepositDate: string | null;
    }>('/wallet'),

  getHistory: () =>
    request<
      Array<{
        id: string;
        type: string;
        amountFcfa: number;
        status: string;
        date: string;
        reference: string;
      }>
    >('/wallet/history'),
  createDeposit: (amountFcfa: number) =>
    request<{ id: string; amountFcfa: number; status: string; createdAt: string }>(
      '/deposit-requests',
      { method: 'POST', body: JSON.stringify({ amountFcfa }) },
    ),

  getMyDeposits: () =>
    request<
      Array<{
        id: string;
        amountFcfa: number;
        status: string;
        note: string;
        createdAt: string;
        reviewedAt: string | null;
      }>
    >('/deposit-requests'),

  // ---- Messagerie privée (client ↔ agent) ----
  getChat: () =>
    request<{
      messages: Array<{ id: string; fromAdmin: boolean; body: string; photo: string | null; readAt: string | null; createdAt: string }>;
      agent: { name: string; phone: string } | null;
    }>('/chat'),

  sendChat: (body: string, photo?: string | null) =>
    request<{ id: string; fromAdmin: boolean; body: string; photo: string | null; createdAt: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ body, photo: photo ?? null }),
    }),

  chatUnread: () => request<{ unread: number }>('/chat/unread'),

  // ---- Fil public ----
  getFeed: (before?: string) =>
    request<Array<FeedPost>>(`/feed${before ? `?before=${encodeURIComponent(before)}` : ''}`),

  createPost: (body: string, photos: string[]) =>
    request<{ id: string; createdAt: string }>('/feed', {
      method: 'POST',
      body: JSON.stringify({ body, photos }),
    }),

  likePost: (id: string) =>
    request<{ liked: boolean; likeCount: number }>(`/feed/${id}/like`, { method: 'POST' }),

  getComments: (id: string) =>
    request<Array<FeedComment>>(`/feed/${id}/comments`),

  addComment: (id: string, body: string) =>
    request<{ id: string; createdAt: string }>(`/feed/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  deletePost: (id: string) => request<{ deleted: boolean }>(`/feed/${id}`, { method: 'DELETE' }),

  deleteComment: (id: string) => request<{ deleted: boolean }>(`/feed/comments/${id}`, { method: 'DELETE' }),

  reportContent: (target: { postId?: string; commentId?: string }, reason?: string) =>
    request<{ reported: boolean }>('/feed/report', {
      method: 'POST',
      body: JSON.stringify({ ...target, reason }),
    }),
};

export interface FeedPost {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  author: { kind: string; name: string; photo: string | null; isAdmin: boolean };
  photos: string[];
  likeCount: number;
  commentCount: number;
  liked: boolean;
  canDelete: boolean;
}

export interface FeedComment {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string; photo: string | null; isAdmin: boolean };
}
