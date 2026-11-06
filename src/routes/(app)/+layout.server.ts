import type { LayoutServerLoad } from './$types';
import { getStandings } from '$lib/server/play';

export const load: LayoutServerLoad = async ({ locals }) => {
	const me = (await getStandings()).find((s) => s.userId === locals.user!.id);
	return { me: { points: me?.points ?? 0, rank: me?.rank ?? null } };
};
