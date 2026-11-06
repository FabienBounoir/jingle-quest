import { eq, notInArray, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { eligibleDates } from '$lib/server/calendar';
import { days, db, settings } from '$lib/server/db';
import { BadInput, file, guard, hhmm, int, isoDate, str } from '$lib/server/form';
import { getSettings, invalidateSettings } from '$lib/server/settings';
import { isValidTimeZone, zonedTime } from '$lib/server/tz';
import { MAX_IMAGE_BYTES, sniffImage } from '$lib/server/upload';

export const load: PageServerLoad = async () => {
	const { logo, ...s } = await getSettings();
	const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(days);
	return { s: { ...s, hasLogo: logo !== null }, dayCount: n };
};

export const actions: Actions = {
	save: async ({ request }) =>
		guard(async () => {
			const fd = await request.formData();
			const bgColor = String(fd.get('bgColor') ?? '');
			if (!/^#[0-9a-f]{6}$/i.test(bgColor)) throw new BadInput('Couleur : format #RRGGBB.');
			const timezone = str(fd, 'timezone', { max: 64, label: 'Fuseau horaire' });
			if (!isValidTimeZone(timezone)) throw new BadInput('Fuseau horaire inconnu (ex. Europe/Paris).');
			const startDate = isoDate(fd, 'startDate', 'Début');
			const endDate = isoDate(fd, 'endDate', 'Fin');
			if (startDate > endDate) throw new BadInput('La fin doit être après le début.');
			if (eligibleDates(startDate, endDate, false).length >= 366) throw new BadInput('Un an maximum.');

			const patch: Partial<typeof settings.$inferInsert> = {
				eventName: str(fd, 'eventName', { max: 80, label: "Nom de l'événement" }),
				bgColor,
				timezone,
				startDate,
				endDate,
				workdaysOnly: fd.get('workdaysOnly') === 'on',
				defaultOpenTime: hhmm(fd, 'defaultOpenTime', "Heure d'ouverture"),
				pointsCorrect: int(fd, 'pointsCorrect', { min: 0, max: 10_000, label: 'Points bonne réponse' }),
				pointsCatchup: int(fd, 'pointsCatchup', { min: 0, max: 10_000, label: 'Points rattrapage' }),
				bonusMax: int(fd, 'bonusMax', { min: 0, max: 10_000, label: 'Bonus maximum' }),
				bonusMinutes: int(fd, 'bonusMinutes', { min: 1, max: 1440, label: 'Durée du bonus' })
			};
			const logo = await file(fd, 'logo');
			if (logo) {
				if (logo.length > MAX_IMAGE_BYTES) throw new BadInput('Logo : 2 Mo maximum.');
				const mime = sniffImage(logo);
				if (!mime) throw new BadInput('Logo : JPG, PNG, WebP ou GIF uniquement.');
				Object.assign(patch, { logo, logoMime: mime });
			} else if (fd.get('removeLogo') === 'on') {
				Object.assign(patch, { logo: null, logoMime: null });
			}
			await db.update(settings).set(patch).where(eq(settings.id, 1));
			invalidateSettings();
			return { ok: 'Réglages enregistrés. Pense à regénérer le calendrier si tu as changé les dates.' };
		}),

	generate: async ({ request }) =>
		guard(async () => {
			const resetTimes = (await request.formData()).get('resetTimes') === 'on';
			const s = await getSettings();
			const dates = eligibleDates(s.startDate, s.endDate, s.workdaysOnly);
			const time = s.defaultOpenTime.slice(0, 5);
			await db.transaction(async (tx) => {
				// Les jours hors période disparaissent (leur question reste, détachée). Les réponses ne
				// pointent pas sur les jours : rien n'est perdu côté scores.
				await (dates.length ? tx.delete(days).where(notInArray(days.date, dates)) : tx.delete(days));
				if (dates.length === 0) return;
				const rows = dates.map((date) => ({ date, opensAt: zonedTime(date, time, s.timezone) }));
				const insert = tx.insert(days).values(rows);
				// Par défaut on garde les heures déjà personnalisées, la question et l'exclusion de chaque jour.
				await (resetTimes
					? insert.onConflictDoUpdate({ target: days.date, set: { opensAt: sql`excluded.opens_at` } })
					: insert.onConflictDoNothing());
			});
			return { ok: `Calendrier généré : ${dates.length} case${dates.length > 1 ? 's' : ''}.` };
		})
};
