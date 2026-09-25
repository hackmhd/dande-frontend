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

  updatePhoto: (photo: string | null) =>
    request<{ updated: boolean }>('/wallet/photo', {
      method: 'PUT',
      body: JSON.stringify({ photo }),
    }),

  setPhotoVisibility: (hidden: boolean) =>
    request<{ hidden: boolean }>('/wallet/photo/visibility', {
      method: 'POST',
      body: JSON.stringify({ hidden }),
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
      photo: string | null;
      photoHidden: boolean;
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
};
