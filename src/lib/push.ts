import { api } from './api';

/**
 * Gestion des notifications push côté navigateur.
 * Enregistre le service worker, demande l'autorisation, et abonne l'appareil.
 */

/** Le navigateur supporte-t-il les notifications push ? */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** État actuel de l'autorisation : 'granted' | 'denied' | 'default'. */
export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/** Convertit la clé VAPID (base64url) au format attendu par le navigateur. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Active les notifications : enregistre le service worker, demande
 * l'autorisation, s'abonne, et envoie l'abonnement au serveur.
 * Renvoie true si tout s'est bien passé.
 */
export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) {
    return { ok: false, reason: 'Votre navigateur ne supporte pas les notifications.' };
  }

  // Récupère la clé publique du serveur.
  const { enabled, publicKey } = await api.getPushKey();
  if (!enabled || !publicKey) {
    return { ok: false, reason: 'Les notifications ne sont pas activées sur le serveur.' };
  }

  // Demande l'autorisation à l'utilisateur.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'Vous avez refusé les notifications.' };
  }

  // Enregistre le service worker.
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  // S'abonne au push. Le cast en BufferSource satisfait les typages stricts.
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  // Envoie l'abonnement au serveur.
  await api.subscribePush(subscription.toJSON());
  return { ok: true };
}

/** Désactive les notifications sur cet appareil. */
export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const sub = await registration?.pushManager.getSubscription();
  if (sub) {
    await api.unsubscribePush(sub.endpoint).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
}
