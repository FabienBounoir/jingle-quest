import type { PageServerLoad } from './$types';
import { getDayStandings, getDays, getStandings, playerCount } from '$lib/server/play';

export const load: PageServerLoad = async ({ locals, url }) => {
	const view = url.searchParams.get('vue') === 'jour' ? 'jour' : 'general';
	const me = locals.user!.id;
	if (view === 'general') {
		const [all, players] = await Promise.all([getStandings(), playerCount()]);
		const mine = all.find((s) => s.userId === me);
		return {
			view,
			players,
			rows: all.slice(0, 50).map((s) => ({ rank: s.rank, name: s.name, points: s.points, detail: `${s.ok}/${s.answered} justes`, me: s.userId === me })),
			mine: mine && mine.rank > 50 ? { rank: mine.rank, name: mine.name, points: mine.points, detail: `${mine.ok}/${mine.answered} justes`, me: true } : null,
			dayDate: null
		};
	}
	// « Aujourd'hui » = la dernière case ouverte qui a une quête.
	const now = new Date();
	const last = (await getDays()).filter((d) => d.opensAt <= now && d.questionId).at(-1);
	const rows = last ? await getDayStandings(last.questionId!) : [];
	return {
		view,
		players: await playerCount(),
		rows: rows.map((r) => ({ rank: r.rank, name: r.name, points: r.points, detail: r.isCorrect ? 'juste' : 'raté', me: r.userId === me })),
		mine: null,
		dayDate: last?.date ?? null
	};
};
