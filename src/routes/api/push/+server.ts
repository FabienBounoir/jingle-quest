import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAllowedPushEndpoint, pushEnabled, removeSubscription, saveSubscription } from '$lib/server/push';

type Body = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!pushEnabled()) error(404, 'Notifications désactivées');
	const b = (await request.json().catch(() => ({}))) as Body;
	const endpoint = typeof b.endpoint === 'string' ? b.endpoint : '';
	const p256dh = typeof b.keys?.p256dh === 'string' ? b.keys.p256dh : '';
	const auth = typeof b.keys?.auth === 'string' ? b.keys.auth : '';
	if (!isAllowedPushEndpoint(endpoint) || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) error(400, 'Abonnement invalide');
	await saveSubscription(locals.user!.id, { endpoint, keys: { p256dh, auth } }, request.headers.get('user-agent')?.slice(0, 300) ?? null);
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request }) => {
	const b = (await request.json().catch(() => ({}))) as Body;
	if (typeof b.endpoint === 'string') await removeSubscription(b.endpoint);
	return json({ ok: true });
};
