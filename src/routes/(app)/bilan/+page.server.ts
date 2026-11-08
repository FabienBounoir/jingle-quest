import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getStandings, history } from '$lib/server/play';

// Bilan de fin : visible une fois l'événement terminé (avant : seulement les admins, en aperçu).
export const load: PageServerLoad = async ({ locals }) => {
	const h = await history(locals.user!.id);
	if (!h.ended && !locals.isAdmin) redirect(303, '/');
	const standings = await getStandings();
	const me = standings.find((s) => s.userId === locals.user!.id);
	return {
		preview: !h.ended,
		recap: h.recap,
		rank: me?.rank ?? null,
		ranked: standings.length,
		podium: standings.slice(0, 3).map((s) => ({ userId: s.userId, name: s.name, points: s.points })),
		userId: locals.user!.id
	};
};
