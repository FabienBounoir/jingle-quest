import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSessionCookie, invalidateSession } from '$lib/server/auth/session';

// POST uniquement (formulaire) : un simple lien <img src="/logout"> ne doit pas déconnecter.
export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.sessionToken) await invalidateSession(locals.sessionToken);
	deleteSessionCookie(cookies);
	redirect(303, '/login?bye=1');
};
