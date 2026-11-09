import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db, users } from '$lib/server/db';
import { history } from '$lib/server/play';

export const load: PageServerLoad = async ({ locals }) => {
	const [h, [u]] = await Promise.all([
		history(locals.user!.id),
		db.select({ avatarHidden: users.avatarHidden }).from(users).where(eq(users.id, locals.user!.id))
	]);
	return { rows: [...h.rows].reverse(), ended: h.ended, recap: h.recap, avatarHidden: u.avatarHidden }; // la plus récente en haut
};

export const actions: Actions = {
	// Masquer = effacer la photo (pas juste la cacher). Réafficher = elle revient au prochain login,
	// le seul moment où on a un token pour la relire.
	photo: async ({ locals, request }) => {
		const hide = (await request.formData()).get('hide') === '1';
		await db
			.update(users)
			.set(hide ? { avatarHidden: true, avatar: null } : { avatarHidden: false })
			.where(eq(users.id, locals.user!.id));
	}
};
