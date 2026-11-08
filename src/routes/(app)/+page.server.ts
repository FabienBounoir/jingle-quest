import type { PageServerLoad } from './$types';
import { bonusAt, cellState, endOf } from '$lib/server/game';
import { answeredCount, getDays, getStandings, playerCount, userAnswers } from '$lib/server/play';
import { getSettings } from '$lib/server/settings';
import { localParts } from '$lib/server/tz';

const DOW = ['DIM.', 'LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.'];

export const load: PageServerLoad = async ({ locals }) => {
	const s = await getSettings();
	const now = new Date();
	const end = endOf(s);
	const [dayRows, mine, standings, players] = await Promise.all([getDays(), userAnswers(locals.user!.id), getStandings(), playerCount()]);
	const byQuestion = new Map(mine.map((a) => [a.questionId, a]));

	// « Prochaine » = la prochaine à s'ouvrir (pas forcément la suivante par date).
	const nextDate = dayRows.filter((d) => d.opensAt > now).sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime())[0]?.date;
	const cells = dayRows.map((d) => {
		const a = d.questionId ? (byQuestion.get(d.questionId) ?? null) : null;
		const state = cellState({ date: d.date, opensAt: d.opensAt, hasQuestion: d.questionId !== null }, a, now, end, s.timezone);
		const next = d.date === nextDate;
		return {
			date: d.date,
			num: Number(d.date.slice(8)),
			dow: DOW[new Date(`${d.date}T12:00:00Z`).getUTCDay()],
			state,
			points: a?.points ?? 0,
			next,
			opensAt: d.opensAt.getTime(),
			questionId: d.questionId
		};
	});

	// La case du jour (si aujourd'hui en a une, ouverte), pour la carte du haut.
	const todayDate = localParts(now, s.timezone).date;
	const t = cells.find((c) => c.date === todayDate && c.opensAt <= now.getTime() && c.questionId);
	const today = t
		? {
				date: t.date,
				questionId: t.questionId!,
				state: t.state,
				points: t.points,
				answered: await answeredCount(t.questionId!),
				bonusNow: t.state === 'today' ? bonusAt(now.getTime() - t.opensAt, s) : 0,
				bonusEndsAt: t.opensAt + s.bonusMinutes * 60_000
			}
		: null;
	const next = cells.find((c) => c.next);

	const me = standings.find((x) => x.userId === locals.user!.id);
	return {
		cells: cells.map(({ opensAt: _o, questionId: _q, ...c }) => c),
		today,
		next: next ? { date: next.date, opensAt: next.opensAt } : null,
		ended: now >= end,
		catchUp: cells.filter((c) => c.state === 'catch').length,
		stats: { points: me?.points ?? 0, rank: me?.rank ?? null, ok: me?.ok ?? 0, answered: me?.answered ?? 0, ranked: standings.length, players },
		top: standings.slice(0, 5).map((x) => ({ userId: x.userId, rank: x.rank, name: x.name, points: x.points })),
		userId: locals.user!.id,
		scoring: { pointsCorrect: s.pointsCorrect, bonusMax: s.bonusMax, bonusMinutes: s.bonusMinutes },
		serverNow: now.getTime()
	};
};
