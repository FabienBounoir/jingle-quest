// Notifications Web Push (repris de rae, simplifié). Sans clés VAPID dans l'env : tout est désactivé.
import webpush from 'web-push';
import { eq, inArray } from 'drizzle-orm';
import { db, pushSubscriptions } from '$lib/server/db';
import { config } from '$lib/server/config';

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

// Hôtes des services push des navigateurs : un endpoint ailleurs ne peut être qu'une cible forgée
// (SSRF : le serveur y enverrait ensuite des requêtes signées VAPID).
const ALLOWED_PUSH_HOSTS = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com', 'notify.windows.com'];

export function isAllowedPushEndpoint(endpoint: string): boolean {
	try {
		const u = new URL(endpoint);
		return u.protocol === 'https:' && ALLOWED_PUSH_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
	} catch {
		return false;
	}
}

export const pushEnabled = () => Boolean(config.vapidPublic && config.vapidPrivate);

let configured = false;
function ensureVapid(): boolean {
	if (!pushEnabled()) return false;
	if (!configured) webpush.setVapidDetails(config.vapidSubject, config.vapidPublic, config.vapidPrivate);
	configured = true;
	return true;
}

export async function saveSubscription(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent: string | null) {
	await db
		.insert(pushSubscriptions)
		.values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent })
		.onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent } });
}

export async function removeSubscription(endpoint: string) {
	await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

/**
 * Envoie la même notification à tous les abonnés. 20 envois en parallèle : ~2 000 abonnés en
 * quelques secondes sans saturer le pod. Les abonnements expirés (404/410) sont supprimés.
 */
export async function sendToAll(payload: PushPayload): Promise<{ sent: number; failed: number }> {
	if (!ensureVapid()) return { sent: 0, failed: 0 };
	const subs = await db.select().from(pushSubscriptions);
	const body = JSON.stringify(payload);
	const expired: number[] = [];
	let sent = 0;
	let failed = 0;
	let i = 0;
	const worker = async () => {
		while (i < subs.length) {
			const s = subs[i++];
			try {
				await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 3600 });
				sent++;
			} catch (e) {
				const code = (e as { statusCode?: number }).statusCode;
				if (code === 404 || code === 410) expired.push(s.id);
				else failed++;
			}
		}
	};
	await Promise.all(Array.from({ length: 20 }, worker));
	if (expired.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, expired));
	return { sent, failed };
}
