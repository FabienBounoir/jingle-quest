// Fuseaux horaires sans dépendance : Intl suffit (Temporal n'est pas encore dans Node 22).

function offsetMs(at: number, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric'
	}).formatToParts(new Date(at));
	const n = (t: string) => Number(parts.find((p) => p.type === t)!.value);
	const asUtc = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
	return asUtc - Math.floor(at / 1000) * 1000;
}

/** Instant correspondant à `date` (YYYY-MM-DD) à `time` (HH:MM) heure locale de `timeZone`. */
export function zonedTime(date: string, time: string, timeZone: string): Date {
	const [y, m, d] = date.split('-').map(Number);
	const [hh, mm] = time.split(':').map(Number);
	const guess = Date.UTC(y, m - 1, d, hh, mm);
	let t = guess - offsetMs(guess, timeZone);
	// Si on a traversé un changement d'heure entre la supposition et le résultat, on recale.
	const o2 = offsetMs(t, timeZone);
	if (guess - o2 !== t) t = guess - o2;
	return new Date(t);
}

/** Date (YYYY-MM-DD) et heure (HH:MM) locales d'un instant dans `timeZone`. */
export function localParts(at: Date, timeZone: string): { date: string; time: string } {
	// sv-SE formate en « 2026-12-01 09:00 », l'ordre ISO dont on a besoin.
	const s = new Intl.DateTimeFormat('sv-SE', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).format(at);
	const [date, time] = s.split(' ');
	return { date, time };
}

export function isValidTimeZone(tz: string): boolean {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}
