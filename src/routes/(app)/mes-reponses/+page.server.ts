import type { PageServerLoad } from './$types';
import { history } from '$lib/server/play';

export const load: PageServerLoad = async ({ locals }) => {
	const h = await history(locals.user!.id);
	return { rows: [...h.rows].reverse(), ended: h.ended, recap: h.recap }; // la plus récente en haut
};
