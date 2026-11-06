import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OIDC_COOKIE, buildAuthorizationUrl } from '$lib/server/auth/oidc';
import { safeNext } from '$lib/server/auth/session';

export const GET: RequestHandler = async ({ url, cookies }) => {
	let target: string;
	try {
		const { url: authUrl, pending } = await buildAuthorizationUrl(safeNext(url.searchParams.get('next')));
		cookies.set(OIDC_COOKIE, JSON.stringify(pending), {
			path: '/auth/callback',
			httpOnly: true,
			sameSite: 'lax', // envoyé sur le retour top-level GET depuis le fournisseur
			secure: process.env.NODE_ENV === 'production',
			maxAge: 600
		});
		target = authUrl;
	} catch (e) {
		console.error('sso_start_failed', e);
		redirect(303, '/login?sso=error');
	}
	redirect(303, target);
};
