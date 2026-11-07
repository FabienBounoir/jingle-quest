import { error, redirect } from '@sveltejs/kit';
import { and, asc, count, eq, inArray, isNull, or } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { answerLists, answers, days, db, listItems, questionAnswers, questions } from '$lib/server/db';
import { BadInput, file, guard, int, str } from '$lib/server/form';
import { getSettings } from '$lib/server/settings';
import { localParts } from '$lib/server/tz';
import { MAX_IMAGE_BYTES, sniffImage } from '$lib/server/upload';
import { BadAnswer, parseAdmin, sameShuffledQuestion, type TypedQuestion } from '$lib/server/questionTypes';
import { LIST_TYPES, QUESTION_TYPES, type QuestionType } from '$lib/server/db';

/** 'new' → null, sinon l'id numérique. */
function parseId(raw: string): number | null {
	if (raw === 'new') return null;
	const id = Number(raw);
	if (!Number.isInteger(id) || id < 1) error(404);
	return id;
}

export const load: PageServerLoad = async ({ params, url }) => {
	const id = parseId(params.id);
	const s = await getSettings();

	let question = null;
	if (id !== null) {
		const [q] = await db
			.select({
				id: questions.id,
				type: questions.type,
				text: questions.text,
				listId: questions.listId,
				hasImage: questions.imageMime,
				config: questions.config,
				solution: questions.solution, // page admin : la solution est éditée ici
				day: days.date
			})
			.from(questions)
			.leftJoin(days, eq(days.questionId, questions.id))
			.where(eq(questions.id, id));
		if (!q) error(404, 'Question introuvable');
		const correct = await db.select({ id: questionAnswers.itemId }).from(questionAnswers).where(eq(questionAnswers.questionId, id));
		const [{ n }] = await db.select({ n: count() }).from(answers).where(eq(answers.questionId, id));
		question = { ...q, hasImage: q.hasImage !== null, correct: correct.map((c) => c.id), answered: n };
	}

	// ponytail: toutes les listes avec leurs valeurs, d'un coup. Quelques milliers de lignes au plus, page admin.
	const lists = await db.select().from(answerLists).orderBy(asc(answerLists.name));
	const items = await db.select().from(listItems).orderBy(asc(listItems.label));
	const dayRows = await db
		.select({ date: days.date, opensAt: days.opensAt, questionId: days.questionId, excluded: days.excluded })
		.from(days)
		.orderBy(asc(days.date));

	return {
		question,
		lists: lists.map((l) => ({ ...l, items: items.filter((i) => i.listId === l.id).map(({ id, label }) => ({ id, label })) })),
		days: dayRows
			.filter((d) => d.questionId === null || d.questionId === id)
			.map((d) => ({ date: d.date, time: localParts(d.opensAt, s.timezone).time, excluded: d.excluded })),
		prefillDay: question?.day ?? url.searchParams.get('day') ?? ''
	};
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const id = parseId(params.id);
		const res = await guard(async () => {
			const fd = await request.formData();
			const text = str(fd, 'text', { max: 500, label: 'Question' });
			const type = String(fd.get('type') ?? 'list') as QuestionType;
			if (!QUESTION_TYPES.includes(type)) throw new BadInput('Type de question inconnu.');
			const day = String(fd.get('day') ?? '');

			// Selon le type : la liste et ses bonnes réponses, ou la config et la solution.
			let listId: number | null = null;
			let correct: number[] = [];
			let typed = { config: {} as unknown, solution: {} as unknown };
			if (LIST_TYPES.includes(type)) {
				listId = int(fd, 'listId', { min: 1, max: 2 ** 31 - 1, label: 'Liste de réponses' });
				correct = [...new Set(fd.getAll('correct').map(Number))].filter(Number.isInteger);
				if (correct.length === 0) throw new BadInput('Choisis au moins une bonne réponse.');
				const valid = await db
					.select({ id: listItems.id })
					.from(listItems)
					.where(and(eq(listItems.listId, listId), inArray(listItems.id, correct)));
				if (valid.length !== correct.length) throw new BadInput('Les bonnes réponses doivent venir de la liste choisie.');
			} else {
				try {
					typed = parseAdmin(type as TypedQuestion, fd);
				} catch (e) {
					if (e instanceof BadAnswer) throw new BadInput(e.message);
					throw e;
				}
			}

			const image = await file(fd, 'image');
			let imagePatch: { image: Buffer | null; imageMime: string | null } | undefined;
			if (image) {
				if (image.length > MAX_IMAGE_BYTES) throw new BadInput('Image : 2 Mo maximum.');
				const mime = sniffImage(image);
				if (!mime) throw new BadInput('Image : JPG, PNG, WebP ou GIF uniquement.');
				imagePatch = { image, imageMime: mime };
			} else if (fd.get('removeImage') === 'on') {
				if (type === 'zone' || type === 'blur') throw new BadInput('Ce type de question a besoin de son image.');
				imagePatch = { image: null, imageMime: null };
			}

			return db.transaction(async (tx) => {
				const [cur] =
					id === null
						? [undefined]
						: await tx
								.select({ type: questions.type, listId: questions.listId, config: questions.config, solution: questions.solution, mime: questions.imageMime })
								.from(questions)
								.where(eq(questions.id, id));
				if (id !== null && !cur) throw new BadInput('Question introuvable.');
				if ((type === 'zone' || type === 'blur') && !image && !cur?.mime) throw new BadInput('Ce type de question a besoin d’une image.');
				// Ordre ou association inchangés : on garde le mélange déjà enregistré au lieu d'en tirer un nouveau.
				if (cur?.type === type && sameShuffledQuestion(type, cur, typed)) typed = { config: cur.config, solution: cur.solution };

				if (id !== null && cur) {
					// Des joueurs ont déjà répondu : changer le type, la solution ou l'image d'une zone fausserait
					// leurs points (calculés à la réponse). Le texte reste modifiable (coquilles).
					const [{ n }] = await tx.select({ n: count() }).from(answers).where(eq(answers.questionId, id));
					if (n > 0) {
						const curCorrect = (await tx.select({ id: questionAnswers.itemId }).from(questionAnswers).where(eq(questionAnswers.questionId, id)))
							.map((c) => c.id)
							.sort()
							.join();
						const changed =
							cur.type !== type ||
							cur.listId !== listId ||
							curCorrect !== [...correct].sort().join() ||
							JSON.stringify(cur.config) !== JSON.stringify(typed.config) ||
							JSON.stringify(cur.solution) !== JSON.stringify(typed.solution) ||
							((type === 'zone' || type === 'blur') && imagePatch !== undefined);
						if (changed) throw new BadInput(`${n} joueur(s) ont déjà répondu : le type, la solution et l'image (zone, photo) sont figés.`);
					}
				}

				const values = { type, text, listId, config: typed.config, solution: typed.solution, ...imagePatch };
				const qid =
					id === null
						? (await tx.insert(questions).values(values).returning({ id: questions.id }))[0].id
						: (await tx.update(questions).set(values).where(eq(questions.id, id)).returning({ id: questions.id }))[0]?.id;
				if (!qid) throw new BadInput('Question introuvable.');

				await tx.delete(questionAnswers).where(eq(questionAnswers.questionId, qid));
				if (correct.length) await tx.insert(questionAnswers).values(correct.map((itemId) => ({ questionId: qid, itemId })));

				await tx.update(days).set({ questionId: null }).where(eq(days.questionId, qid));
				if (day) {
					const done = await tx
						.update(days)
						.set({ questionId: qid })
						.where(and(eq(days.date, day), or(isNull(days.questionId), eq(days.questionId, qid))))
						.returning({ date: days.date });
					if (done.length === 0) throw new BadInput('Ce jour a déjà une quête (ou n’existe plus).');
				}
				return qid;
			});
		});
		if (typeof res !== 'number') return res;
		if (id === null) redirect(303, `/admin/questions/${res}?created=1`);
		return { ok: 'Quête enregistrée.' };
	},

	delete: async ({ params }) => {
		const id = parseId(params.id);
		if (id === null) error(404);
		const res = await guard(async () => {
			const [{ n }] = await db.select({ n: count() }).from(answers).where(eq(answers.questionId, id));
			if (n > 0) throw new BadInput(`${n} joueur(s) ont déjà répondu : on ne supprime pas leurs points.`);
			await db.delete(questions).where(eq(questions.id, id));
			return null;
		});
		if (res) return res;
		redirect(303, '/admin/questions');
	}
};
