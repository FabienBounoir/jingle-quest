/** Dates (YYYY-MM-DD) du calendrier entre start et end inclus, sans les week-ends si workdaysOnly. */
export function eligibleDates(start: string, end: string, workdaysOnly: boolean): string[] {
	const out: string[] = [];
	const last = Date.parse(`${end}T00:00:00Z`);
	// ponytail: plafond à 366 cases, un calendrier de l'Avent n'en a jamais plus.
	for (let t = Date.parse(`${start}T00:00:00Z`); t <= last && out.length < 366; t += 86_400_000) {
		const dow = new Date(t).getUTCDay();
		if (workdaysOnly && (dow === 0 || dow === 6)) continue;
		out.push(new Date(t).toISOString().slice(0, 10));
	}
	return out;
}
