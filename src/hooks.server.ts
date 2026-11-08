import { error, redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, deleteSessionCookie, setSessionCookie, validateSession } from '$lib/server/auth/session';
import { isAdmin } from '$lib/server/config';
import { invalidateBlur } from '$lib/server/blur';
import { refreshSchedule } from '$lib/server/live';
import { invalidateQuestions } from '$lib/server/play';

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
	// /admin, non-admin. ATTENTION, piège SvelteKit : les load de page s'exécutent EN PARALLÈLE de celui
	// du layout, et leurs données partent dans __data.json même si le layout lève une 403 (questions,
	// solutions…). Donc ici on bloque tout, SAUF l'affichage HTML direct d'une page : celui-là passe pour
	// qu'admin/+layout.server.ts réponde 403 dans la page d'erreur du site (une erreur levée dans ce hook
	// afficherait la page de secours brute src/error.html). Le rendu HTML d'une page en erreur n'embarque
	// pas les données de la page (vérifié). Les routes +server sous /admin revérifient elles-mêmes.
	if (path.startsWith('/admin') && !event.locals.isAdmin && (event.request.method !== 'GET' || event.isDataRequest))
		error(403, 'Réservé aux admins');

	const response = await resolve(event);
	// Toute écriture admin peut changer ce que voient les joueurs : on vide les caches ici, une fois,
	// plutôt que dans chaque action.
	if (path.startsWith('/admin') && event.request.method === 'POST') {
		invalidateQuestions();
		invalidateBlur(); // une image ou une durée de dévoilement a pu changer
		refreshSchedule(); // heures d'ouverture, exclusions, quêtes rattachées
	}
	return response;
};
