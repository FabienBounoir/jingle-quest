import { count, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { answers, days, db, pushSubscriptions, questions, users } from '$lib/server/db';
import { BadInput, file, guard } from '$lib/server/form';
import { reloadLive } from '$lib/server/live';
import { ImportError, importData } from '$lib/server/transfer';

export const load: PageServerLoad = async () => {
	const [[a], [q], [u], [p]] = await Promise.all([
		db.select({ n: count() }).from(answers),
		db.select({ n: count() }).from(questions),
		db.select({ n: count() }).from(users),
		db.select({ n: count() }).from(pushSubscriptions)
	]);
	return { answers: a.n, questions: q.n, users: u.n, subscriptions: p.n };
};

export const actions: Actions = {
	import: async ({ request }) =>
		guard(async () => {
			const buf = await file(await request.formData(), 'file');
			if (!buf) throw new BadInput('Choisis un fichier .export.json.');
			let json: unknown;
			try {
				json = JSON.parse(buf.toString('utf8'));
			} catch {
				throw new BadInput("Ce fichier n'est pas du JSON valide.");
			}
			try {
				const r = await importData(json);
				await reloadLive();
				return { ok: `Import réussi : ${r.lists} liste(s), ${r.questions} question(s), ${r.days} case(s).` };
			} catch (e) {
				if (e instanceof ImportError) throw new BadInput(e.message);
				throw e;
			}
		}),

	reset: async ({ request }) =>
		guard(async () => {
			if (String((await request.formData()).get('confirm') ?? '').trim().toUpperCase() !== 'EFFACER')
				throw new BadInput('Tape EFFACER pour confirmer.');
			const n = await db.transaction(async (tx) => {
				const deleted = await tx.delete(answers).returning({ q: answers.questionId });
				// Les cases déjà passées seront « rouvertes » sans bruit (ni rappel push) par la boucle temps réel.
				await tx.update(days).set({ notifiedAt: sql`null`, remindedAt: sql`null` });
				return deleted.length;
			});
			await reloadLive();
			return { ok: `${n} réponse(s) supprimée(s). Le classement repart de zéro.` };
		})
};
