'use client';

/**
 * Verrou d'application optionnel par code PIN (et biométrie si l'appareil la
 * supporte). Entièrement LOCAL à l'appareil : c'est un verrou d'accès à l'app,
 * pas un deuxième mot de passe serveur. Le PIN n'est jamais stocké en clair —
 * on ne garde qu'un hachage SHA-256 (avec sel) dans le stockage local.
 *
 * Rappel de sécurité : ce verrou protège contre un accès occasionnel à l'app
 * sur un téléphone déverrouillé. Il ne remplace pas l'authentification serveur.
 */

const PIN_HASH_KEY = 'dande_pin_hash';
const PIN_SALT_KEY = 'dande_pin_salt';
const BIO_KEY = 'dande_pin_biometric'; // '1' si la biométrie est activée

function ls(): Storage | null {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Le verrou PIN est-il activé ? */
export function isPinEnabled(): boolean {
  return !!ls()?.getItem(PIN_HASH_KEY);
}

/** Définit (ou change) le PIN. 4 à 8 chiffres recommandés. */
export async function setPin(pin: string): Promise<void> {
  const store = ls();
  if (!store) return;
  const salt = randomSalt();
  const hash = await sha256Hex(`${salt}:${pin}`);
  store.setItem(PIN_SALT_KEY, salt);
  store.setItem(PIN_HASH_KEY, hash);
}

/** Vérifie un PIN saisi. */
export async function verifyPin(pin: string): Promise<boolean> {
  const store = ls();
  if (!store) return false;
  const salt = store.getItem(PIN_SALT_KEY);
  const hash = store.getItem(PIN_HASH_KEY);
  if (!salt || !hash) return false;
  return (await sha256Hex(`${salt}:${pin}`)) === hash;
}

/** Désactive le verrou (retire le PIN et la biométrie). */
export function disablePin(): void {
  const store = ls();
  if (!store) return;
  store.removeItem(PIN_HASH_KEY);
  store.removeItem(PIN_SALT_KEY);
  store.removeItem(BIO_KEY);
}

/** La biométrie est-elle activée par l'utilisateur ? */
export function isBiometricEnabled(): boolean {
  return ls()?.getItem(BIO_KEY) === '1';
}

/** L'appareil supporte-t-il une authentification biométrique de plateforme ? */
export async function biometricAvailable(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
    const fn = window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable;
    if (!fn) return false;
    return await fn.call(window.PublicKeyCredential);
  } catch { return false; }
}

/**
 * Active la biométrie : crée une clé liée à l'appareil (WebAuthn). On ne stocke
 * que l'identifiant de la clé ; la vérification se fait via l'empreinte/visage
 * géré par le système. En cas d'échec, la biométrie n'est pas activée.
 */
export async function enableBiometric(userId: string): Promise<boolean> {
  const store = ls();
  if (!store) return false;
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Dande' },
        user: {
          id: new TextEncoder().encode(userId).slice(0, 64),
          name: userId,
          displayName: 'Dande',
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { userVerification: 'required', authenticatorAttachment: 'platform' },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;
    if (!cred) return false;
    const id = bufToBase64(cred.rawId);
    store.setItem(BIO_KEY, '1');
    store.setItem(`${BIO_KEY}_id`, id);
    return true;
  } catch {
    return false;
  }
}

/** Demande une vérification biométrique. true si réussie. */
export async function verifyBiometric(): Promise<boolean> {
  const store = ls();
  if (!store) return false;
  const id = store.getItem(`${BIO_KEY}_id`);
  if (!id) return false;
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: base64ToBuf(id) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function base64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}
