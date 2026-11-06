import type { LayoutServerLoad } from './$types';
import { config } from '$lib/server/config';
import { getStandings } from '$lib/server/play';
import { pushEnabled } from '$lib/server/push';

export const load: LayoutServerLoad = async ({ locals }) => {
	const me = (await getStandings()).find((s) => s.userId === locals.user!.id);
	return {
		me: { points: me?.points ?? 0, rank: me?.rank ?? null },
		// Clé publique VAPID (publique par nature) ; null = notifications désactivées sur ce déploiement.
		pushKey: pushEnabled() ? config.vapidPublic : null
	};
};
