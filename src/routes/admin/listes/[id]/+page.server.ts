import { error, redirect } from '@sveltejs/kit';
import { and, asc, count, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { answerLists, db, listItems, questionAnswers, questions } from '$lib/server/db';
import { BadInput, file, guard, int, str } from '$lib/server/form';
import { parseValues } from '$lib/server/upload';

const listId = (raw: string) => {
	const id = Number(raw);
	if (!Number.isInteger(id)) error(404);
	return id;
};

export const load: PageServerLoad = async ({ params }) => {
	const id = listId(params.id);
	const [list] = await db.select().from(answerLists).where(eq(answerLists.id, id));
	if (!list) error(404, 'Liste introuvable');
	const items = await db
		.select({ id: listItems.id, label: listItems.label })
		.from(listItems)
		.where(eq(listItems.listId, id))
		.orderBy(asc(listItems.label));
	const [{ n }] = await db.select({ n: count() }).from(questions).where(eq(questions.listId, id));
	return { list, items, questionCount: n };
};

export const actions: Actions = {
	rename: async ({ request, params }) =>
		guard(async () => {
			const name = str(await request.formData(), 'name', { max: 60, label: 'Nom de la liste' });
			await db.update(answerLists).set({ name }).where(eq(answerLists.id, listId(params.id)));
			return { ok: 'Liste renommée.' };
		}),

	add: async ({ request, params }) =>
		guard(async () => {
			const fd = await request.formData();
			const csv = await file(fd, 'csv');
			if (csv && csv.length > 2 * 1024 * 1024) throw new BadInput('Fichier trop gros (2 Mo maximum).');
			let csvText = csv?.toString('utf8') ?? '';
			// La plupart des exports CSV ont une ligne d'en-tête (« Nom;Équipe ») : on la saute si demandé.
			if (fd.get('header') === 'on') csvText = csvText.replace(/^[^\n]*\n?/, '');
			const values = parseValues(`${String(fd.get('values') ?? '')}\n${csvText}`);
			if (values.length === 0) throw new BadInput('Rien à ajouter : une valeur par ligne.');
			const id = listId(params.id);
			const added = await db
				.insert(listItems)
				.values(values.map((label) => ({ listId: id, label })))
				.onConflictDoNothing()
				.returning({ id: listItems.id });
			const skipped = values.length - added.length;
			return { ok: `${added.length} valeur${added.length > 1 ? 's' : ''} ajoutée${added.length > 1 ? 's' : ''}${skipped ? ` (${skipped} déjà présente${skipped > 1 ? 's' : ''})` : ''}.` };
		}),

	deleteItem: async ({ request, params }) =>
		guard(async () => {
			const itemId = int(await request.formData(), 'itemId', { min: 1, max: 2 ** 31 - 1, label: 'Valeur' });
			// Supprimer une bonne réponse la retirerait en silence de sa question (cascade) : on refuse.
			const [{ n }] = await db.select({ n: count() }).from(questionAnswers).where(eq(questionAnswers.itemId, itemId));
			if (n > 0) throw new BadInput("C'est la bonne réponse d'une question : retire-la d'abord de la question.");
			await db.delete(listItems).where(and(eq(listItems.id, itemId), eq(listItems.listId, listId(params.id))));
			return { ok: 'Valeur supprimée.' };
		}),

	deleteList: async ({ params }) => {
		const res = await guard(async () => {
			await db.delete(answerLists).where(eq(answerLists.id, listId(params.id)));
			return null;
		});
		if (res) return res; // utilisée par une question : FK → message lisible
		redirect(303, '/admin/listes');
	}
};
