import { redirect } from '@sveltejs/kit';
import { asc, count, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { answerLists, db, listItems, questions } from '$lib/server/db';
import { guard, str } from '$lib/server/form';

export const load: PageServerLoad = async () => {
	const lists = await db
		.select({ id: answerLists.id, name: answerLists.name, items: count(listItems.id) })
		.from(answerLists)
		.leftJoin(listItems, eq(listItems.listId, answerLists.id))
		.groupBy(answerLists.id)
		.orderBy(asc(answerLists.name));
	const usage = await db.select({ listId: questions.listId, n: count() }).from(questions).groupBy(questions.listId);
	const used = new Map(usage.map((u) => [u.listId, u.n]));
	return { lists: lists.map((l) => ({ ...l, questions: used.get(l.id) ?? 0 })) };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const res = await guard(async () => {
			const name = str(await request.formData(), 'name', { max: 60, label: 'Nom de la liste' });
			const [l] = await db.insert(answerLists).values({ name }).returning({ id: answerLists.id });
			return l.id;
		});
		if (typeof res !== 'number') return res;
		redirect(303, `/admin/listes/${res}`);
	}
};
