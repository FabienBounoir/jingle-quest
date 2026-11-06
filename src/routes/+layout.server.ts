import type { LayoutServerLoad } from './$types';
import { getSettings } from '$lib/server/settings';

export const load: LayoutServerLoad = async ({ locals }) => {
	const s = await getSettings();
	return {
		user: locals.user,
		isAdmin: locals.isAdmin,
		brand: { eventName: s.eventName, bgColor: s.bgColor, hasLogo: s.logo !== null }
	};
};
