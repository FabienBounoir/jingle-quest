import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { LAST_STAGE } from '$lib/blur';
import { pixelated } from '$lib/server/blur';
import { days, db, questions } from '$lib/server/db';
import { revealStage } from '$lib/server/play';
import { eventEnd } from '$lib/server/game';
import { getSettings } from '$lib/server/settings';

// L'image fait partie de la question : servie aux joueurs seulement une fois la case ouverte
// (sinon on devinerait la question du lendemain en tapant l'id). Les admins la voient toujours.
// Photo qui se dévoile : la version dépend du niveau de défloutage du joueur, lu en base (le ?stage du
// client ne sert qu'à changer d'URL à chaque niveau : on ne le croit jamais, sauf en aperçu admin).
export const GET: RequestHandler = async ({ params, locals, url }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404);
	const [q] = await db
		.select({ image: questions.image, mime: questions.imageMime, type: questions.type, opensAt: days.opensAt })
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
		// Aperçu admin avant l'ouverture : niveau choisi dans la page (rien n'est enregistré). Sinon, la base.
		const previewStage = locals.isAdmin && !open ? Math.min(LAST_STAGE, Math.max(0, Number(url.searchParams.get('stage')) || 0)) : null;
		const stage = ended ? LAST_STAGE : (previewStage ?? (await revealStage(locals.user!.id, id)));
		if (stage < LAST_STAGE) {
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
