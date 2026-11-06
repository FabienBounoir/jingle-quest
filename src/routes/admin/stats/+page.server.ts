import { asc, count, countDistinct, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { answers, days, db, pushSubscriptions, questions, users } from '$lib/server/db';
import { presence } from '$lib/server/live';

export const load: PageServerLoad = async () => {
	const [[u], [p], [s]] = await Promise.all([
		db.select({ n: count() }).from(users),
		db.select({ n: countDistinct(answers.userId) }).from(answers),
		db.select({ n: countDistinct(pushSubscriptions.userId) }).from(pushSubscriptions)
	]);
	const perDay = await db
		.select({
			date: days.date,
			questionId: questions.id,
			text: questions.text,
			opensAt: days.opensAt,
			answered: sql<number>`count(${answers.userId})::int`,
			correct: sql<number>`count(${answers.userId}) filter (where ${answers.isCorrect})::int`,
			medianSec: sql<number | null>`round(percentile_cont(0.5) within group (order by ${answers.elapsedMs}) / 1000)::int`,
			points: sql<number>`coalesce(sum(${answers.points}), 0)::int`
		})
		.from(days)
		.innerJoin(questions, eq(questions.id, days.questionId))
		.leftJoin(answers, eq(answers.questionId, questions.id))
		.groupBy(days.date, questions.id)
		.orderBy(asc(days.date));
	const now = Date.now();
	return {
		users: u.n,
		players: p.n,
		subscribed: s.n,
		live: presence(),
		days: perDay.map(({ opensAt, ...d }) => ({ ...d, open: opensAt.getTime() <= now }))
	};
};
