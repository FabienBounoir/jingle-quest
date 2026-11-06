import { asc, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { answerLists, answers, days, db, questionAnswers, questions } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: questions.id,
			text: questions.text,
			list: answerLists.name,
			hasImage: sql<boolean>`${questions.image} is not null`,
			day: days.date,
			correct: sql<number>`(select count(*)::int from ${questionAnswers} where ${questionAnswers.questionId} = ${questions.id})`,
			answered: sql<number>`(select count(*)::int from ${answers} where ${answers.questionId} = ${questions.id})`
		})
		.from(questions)
		.innerJoin(answerLists, eq(answerLists.id, questions.listId))
		.leftJoin(days, eq(days.questionId, questions.id))
		.orderBy(sql`${days.date} nulls last`, asc(questions.id));
	return { questions: rows };
};
