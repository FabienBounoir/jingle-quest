import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { cellState, eventEnd } from '$lib/server/game';
import { getDays, userAnswers } from '$lib/server/play';
import { getSettings } from '$lib/server/settings';
import { localParts } from '$lib/server/tz';

export const load: PageServerLoad = async ({ locals }) => {
	const s = await getSettings();
	const now = new Date();
	const [dayRows, mine] = await Promise.all([getDays(), userAnswers(locals.user!.id)]);
	// La prochaine à s'ouvrir, pas la prochaine par date (une case peut être décalée à une autre heure).
	const next = dayRows.filter((d) => d.opensAt > now).sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime())[0];
	if (!next) redirect(303, '/'); // plus rien à attendre : l'accueil affiche la fin ou le dernier jour
	const end = eventEnd(s.endDate, s.timezone);
	const answered = new Set(mine.map((a) => a.questionId));
	const catchUp = dayRows.filter(
		(d) => d.questionId && cellState({ date: d.date, opensAt: d.opensAt, hasQuestion: true }, answered.has(d.questionId) ? { score: 1, isCorrect: true } : null, now, end, s.timezone) === 'catch'
	);
	return {
		// Heure affichée dans le fuseau de l'événement, pas celui du navigateur.
		next: { date: next.date, opensAt: next.opensAt.getTime(), time: localParts(next.opensAt, s.timezone).time, hasQuestion: next.questionId !== null },
		catchUp: catchUp.map((d) => d.date),
		pointsCatchup: s.pointsCatchup,
		serverNow: now.getTime()
	};
};
