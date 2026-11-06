import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { bonusAt, eventEnd, isSameDay } from '$lib/server/game';
import { answeredCount, getDay, getDays, getQuestion, getStandings, myAnswerText, reveal, submitAnswer, userAnswers } from '$lib/server/play';
import { getSettings } from '$lib/server/settings';

export const load: PageServerLoad = async ({ params, locals }) => {
	const day = await getDay(params.date);
	if (!day?.questionId) error(404, 'Pas de quête ce jour-là.');
	const now = new Date();
	// Avant l'heure : les joueurs attendent, les admins voient un aperçu (réponse testée, jamais enregistrée).
	const preview = day.opensAt > now;
	if (preview && !locals.isAdmin) redirect(303, '/attente');

	const s = await getSettings();
	const end = eventEnd(s.endDate, s.timezone);
	const ended = now >= end;
	const [q, mine, answered, allDays] = await Promise.all([getQuestion(day.questionId), userAnswers(locals.user!.id), answeredCount(day.questionId), getDays()]);
	const a = mine.find((x) => x.questionId === day.questionId);
	const sameDay = isSameDay(day.date, now, s.timezone);

	return {
		date: day.date,
		number: allDays.findIndex((d) => d.date === day.date) + 1,
		total: allDays.length,
		question: {
			id: q.id,
			type: q.type,
			text: q.text,
			hasImage: q.hasImage,
			listName: q.listName,
			config: q.config,
			// Inutile d'envoyer 2 000 noms à qui ne peut plus répondre.
			items: a || ended ? [] : q.items
		},
		myAnswer: a ? { text: myAnswerText(q, a), value: a.value, score: a.score, points: a.points } : null,
		// La bonne réponse ne quitte le serveur qu'une fois l'événement terminé (SPECS §5.4).
		reveal: ended ? await reveal(day.questionId) : null,
		ended,
		preview,
		sameDay,
		answered,
		scoring: { pointsCorrect: s.pointsCorrect, pointsCatchup: s.pointsCatchup, bonusMax: s.bonusMax, bonusMinutes: s.bonusMinutes },
		bonusNow: sameDay ? bonusAt(now.getTime() - day.opensAt.getTime(), s) : 0,
		bonusEndsAt: day.opensAt.getTime() + s.bonusMinutes * 60_000,
		opensAt: day.opensAt.getTime(),
		serverNow: now.getTime()
	};
};

export const actions: Actions = {
	answer: async ({ request, params, locals }) => {
		const fd = await request.formData();
		const day = await getDay(params.date);
		const dryRun = locals.isAdmin && !!day && day.opensAt > new Date();
		const res = await submitAnswer(locals.user!, params.date, fd, { dryRun });
		if (!res.ok) return fail(res.status, { error: res.error });
		const me = dryRun ? undefined : (await getStandings()).find((x) => x.userId === locals.user!.id);
		return { result: { score: res.score, points: res.points, dryRun: res.dryRun, rank: me?.rank ?? null } };
	}
};
