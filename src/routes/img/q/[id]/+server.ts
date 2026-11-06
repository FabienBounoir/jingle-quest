import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { days, db, questions } from '$lib/server/db';

// L'image fait partie de la question : servie aux joueurs seulement une fois la case ouverte
// (sinon on devinerait la question du lendemain en tapant l'id). Les admins la voient toujours.
export const GET: RequestHandler = async ({ params, locals }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404);
	const [q] = await db
		.select({ image: questions.image, mime: questions.imageMime, opensAt: days.opensAt })
		.from(questions)
		.leftJoin(days, eq(days.questionId, questions.id))
		.where(eq(questions.id, id));
	if (!q?.image || !q.mime) error(404);
	const open = q.opensAt !== null && q.opensAt.getTime() <= Date.now();
	if (!locals.isAdmin && !open) error(404);
	return new Response(new Uint8Array(q.image), {
		headers: {
			'Content-Type': q.mime,
			// private : jamais dans un cache partagé. Pas de cache côté admin, qui peut la remplacer.
			'Cache-Control': open && !locals.isAdmin ? 'private, max-age=86400' : 'no-store',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
