import type { PageServerLoad } from './$types';
import { getDayStandings, getDays, getStandings, playerCount } from '$lib/server/play';

export const load: PageServerLoad = async ({ locals, url }) => {
	const view = url.searchParams.get('vue') === 'jour' ? 'jour' : 'general';
	const me = locals.user!.id;
	if (view === 'general') {
		// Rendu initial ; ensuite la vue générale suit le flux SSE (vue « board » = top 50).
		const [all, players] = await Promise.all([getStandings(), playerCount()]);
		const mine = all.find((s) => s.userId === me);
		return {
			view,
			players,
			rows: all.slice(0, 50).map((s) => ({ userId: s.userId, rank: s.rank, name: s.name, points: s.points, detail: `${s.ok}/${s.answered} justes`, delta: s.delta })),
			mine: mine && mine.rank > 50 ? { userId: mine.userId, rank: mine.rank, name: mine.name, points: mine.points, detail: `${mine.ok}/${mine.answered} justes`, delta: mine.delta } : null,
			dayDate: null,
			userId: me
		};
	}
	// « Aujourd'hui » = la dernière case ouverte qui a une quête.
	const now = new Date();
	const last = (await getDays()).filter((d) => d.opensAt <= now && d.questionId).at(-1);
	const rows = last ? await getDayStandings(last.questionId!) : [];
	return {
		view,
		players: await playerCount(),
		rows: rows.map((r) => ({ userId: r.userId, rank: r.rank, name: r.name, points: r.points, detail: r.isCorrect ? 'juste' : 'raté', delta: null as number | null })),
		mine: null,
		dayDate: last?.date ?? null,
		userId: me
	};
};
