import { redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { OIDC_COOKIE, exchangeCode, isEntra, type OidcPending } from '$lib/server/auth/oidc';
import { createSession, safeNext, setSessionCookie } from '$lib/server/auth/session';
import { refreshAvatar } from '$lib/server/avatar';
import { emailAllowed } from '$lib/server/config';
import { db, users } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const raw = cookies.get(OIDC_COOKIE);
	cookies.delete(OIDC_COOKIE, { path: '/auth/callback' });
	let pending: OidcPending | null = null;
	try {
		pending = raw ? JSON.parse(raw) : null;
	} catch {
		/* cookie altéré : traité comme absent */
	}
	const code = url.searchParams.get('code');
	if (!pending || !code || url.searchParams.get('state') !== pending.state) {
		console.warn('sso_callback_invalid', url.searchParams.get('error') ?? '');
		redirect(303, '/login?sso=error');
	}

	let identity: Awaited<ReturnType<typeof exchangeCode>>;
	try {
		identity = await exchangeCode(code, pending);
	} catch (e) {
		console.error('sso_exchange_failed', e);
		redirect(303, '/login?sso=error');
	}
	if (!identity) redirect(303, '/login?sso=error');
	if (!emailAllowed(identity.email)) redirect(303, '/login?sso=domain');

	// Contrairement à rae, pas d'invitation : le compte naît à la première connexion. Le nom suit l'IdP.
	const [u] = await db
		.insert(users)
		.values({ email: identity.email, displayName: identity.name })
		.onConflictDoUpdate({ target: users.email, set: { displayName: identity.name, lastLoginAt: sql`now()` } })
		.returning({ id: users.id, avatarHidden: users.avatarHidden });
	// Le token ne part chez Microsoft que s'il vient de Microsoft (sinon on le fuiterait à un tiers).
	if (isEntra() && identity.accessToken && !u.avatarHidden) await refreshAvatar(u.id, identity.accessToken);

	const { token, expiresAt } = await createSession(u.id);
	setSessionCookie(cookies, token, expiresAt);
	redirect(303, safeNext(pending.next));
};
