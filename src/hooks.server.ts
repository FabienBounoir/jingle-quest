import { error, redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, deleteSessionCookie, setSessionCookie, validateSession } from '$lib/server/auth/session';
import { isAdmin } from '$lib/server/config';

// Pages accessibles sans session. Les fichiers de static/ (polices, favicon) sont servis avant ce hook.
const PUBLIC = ['/login', '/auth/', '/healthz', '/img/logo'];

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.isAdmin = false;
	event.locals.sessionToken = null;

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const s = await validateSession(token);
		if (s) {
			event.locals.user = { id: s.user.id, email: s.user.email, displayName: s.user.displayName };
			event.locals.isAdmin = isAdmin(s.user.email);
			event.locals.sessionToken = token;
			if (s.renewedUntil) setSessionCookie(event.cookies, token, s.renewedUntil);
		} else {
			deleteSessionCookie(event.cookies);
		}
	}

	const path = event.url.pathname;
	if (!event.locals.user && !PUBLIC.some((p) => path === p || path.startsWith(p))) {
		if (path.startsWith('/api/')) error(401, 'Non connecté');
		redirect(303, `/login?next=${encodeURIComponent(path + event.url.search)}`);
	}
	// Garde unique pour tout /admin : aucune page admin n'a à revérifier.
	if (path.startsWith('/admin') && !event.locals.isAdmin) error(403, 'Réservé aux admins');

	return resolve(event);
};
