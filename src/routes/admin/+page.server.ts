import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { days, db, questions } from '$lib/server/db';
import { BadInput, guard, hhmm, isoDate, str } from '$lib/server/form';
import { announce, getAnnouncement } from '$lib/server/live';
import { getSettings } from '$lib/server/settings';
import { localParts, zonedTime } from '$lib/server/tz';

export const load: PageServerLoad = async () => {
	const s = await getSettings();
	const rows = await db
		.select({ date: days.date, opensAt: days.opensAt, excluded: days.excluded, questionId: days.questionId, text: questions.text })
		.from(days)
		.leftJoin(questions, eq(questions.id, days.questionId))
		.orderBy(asc(days.date));
	const now = Date.now();
	return {
		timezone: s.timezone,
		announcement: getAnnouncement(),
		days: rows.map((r) => ({
			date: r.date,
			time: localParts(r.opensAt, s.timezone).time,
			excluded: r.excluded,
			questionId: r.questionId,
			text: r.text,
			open: r.opensAt.getTime() <= now
		}))
	};
};

export const actions: Actions = {
	announce: async ({ request }) =>
		guard(async () => {
			const fd = await request.formData();
			const text = fd.get('clear') ? '' : str(fd, 'text', { max: 280, label: 'Annonce' });
			announce(text);
			return { ok: text ? 'Annonce envoyée à tous les joueurs connectés.' : 'Annonce retirée.' };
		}),
	day: async ({ request }) =>
		guard(async () => {
			const fd = await request.formData();
			const date = isoDate(fd, 'date', 'Jour');
			const time = hhmm(fd, 'time', 'Heure');
			const s = await getSettings();
			const opensAt = zonedTime(date, time, s.timezone);
			// Case repoussée dans le futur (ex. 9h → 13h45 après le rappel de 8h55) : on réarme son
			// rappel push et son ouverture, sinon ils seraient considérés comme déjà faits.
			const rearm = opensAt.getTime() > Date.now() ? { notifiedAt: null, remindedAt: null } : {};
			const done = await db
				.update(days)
				.set({ opensAt, excluded: fd.get('excluded') === 'on', ...rearm })
				.where(eq(days.date, date))
				.returning({ date: days.date });
			if (done.length === 0) throw new BadInput('Ce jour n’existe plus : regénère le calendrier.');
			return { ok: 'Case mise à jour.' };
		})
};
