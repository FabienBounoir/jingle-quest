import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { BLUR_STAGES, blurStage, pixelated } from '$lib/server/blur';
import { days, db, questions } from '$lib/server/db';
import { eventEnd } from '$lib/server/game';
import { getSettings } from '$lib/server/settings';

// L'image fait partie de la question : servie aux joueurs seulement une fois la case ouverte
// (sinon on devinerait la question du lendemain en tapant l'id). Les admins la voient toujours.
// Photo qui se dévoile : la version dépend du temps écoulé, calculé ICI (le ?stage du client ne sert
// qu'à changer d'URL quand l'étape change : on ne le croit jamais).
export const GET: RequestHandler = async ({ params, locals, url }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404);
	const [q] = await db
		.select({ image: questions.image, mime: questions.imageMime, type: questions.type, config: questions.config, opensAt: days.opensAt })
		.from(questions)
		.leftJoin(days, eq(days.questionId, questions.id))
		.where(eq(questions.id, id));
	if (!q?.image || !q.mime) error(404);
	const now = Date.now();
	const open = q.opensAt !== null && q.opensAt.getTime() <= now;
	if (!locals.isAdmin && !open) error(404);

	// Un admin voit l'original (éditeur), sauf sur la page joueur (?stage) où il voit ce que voient les joueurs.
	const asPlayer = !locals.isAdmin || url.searchParams.has('stage');
	if (q.type === 'blur' && asPlayer) {
		const s = await getSettings();
		const ended = now >= eventEnd(s.endDate, s.timezone).getTime();
		const minutes = (q.config as { minutes?: number }).minutes ?? 60;
		const stage = ended || !q.opensAt ? BLUR_STAGES - 1 : blurStage(now - q.opensAt.getTime(), minutes);
		if (stage < BLUR_STAGES - 1) {
			return new Response(new Uint8Array(await pixelated(id, stage, q.image)), {
				// Jamais en cache : la même URL doit donner la version suivante à l'étape suivante.
				headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
			});
		}
	}
	return new Response(new Uint8Array(q.image), {
		headers: {
			'Content-Type': q.mime,
			// private : jamais dans un cache partagé. Pas de cache côté admin, qui peut la remplacer.
			'Cache-Control': open && !locals.isAdmin ? 'private, max-age=86400' : 'no-store',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
