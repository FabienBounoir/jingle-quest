// Règles du jeu, pures (pas de base) : testées dans game.test.ts. Cf. SPECS §7.3.
import { localParts, zonedTime } from './tz';

export type Scoring = { pointsCorrect: number; pointsCatchup: number; bonusMax: number; bonusMinutes: number };

/**
 * Points d'une réponse notée `score` (0 à 1 : estimation et ordre donnent des points partiels).
 * Bonus de rapidité linéaire, de bonusMax à 0 sur bonusMinutes, le jour J seulement, au prorata du score.
 */
export function points(score: number, sameDay: boolean, elapsedMs: number, s: Scoring): number {
	if (score <= 0) return 0;
	if (!sameDay) return Math.round(score * s.pointsCatchup);
	return Math.round(score * (s.pointsCorrect + bonusAt(elapsedMs, s)));
}

export function bonusAt(elapsedMs: number, s: Scoring): number {
	return Math.round(s.bonusMax * Math.max(0, 1 - Math.max(0, elapsedMs) / (s.bonusMinutes * 60_000)));
}

/** Fin de l'événement telle que réglée par l'admin, sinon minuit après la dernière case. À utiliser partout. */
export function endOf(s: { endDate: string; timezone: string; endsAt: Date | null }): Date {
	return s.endsAt ?? eventEnd(s.endDate, s.timezone);
}

/** Fin par défaut : minuit (fuseau de l'événement) après le dernier jour. Réponses révélées, rattrapage fermé. */
export function eventEnd(endDate: string, timezone: string): Date {
	const next = new Date(Date.parse(`${endDate}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
	return zonedTime(next, '00:00', timezone);
}

export type CellState = 'wrapped' | 'empty' | 'today' | 'catch' | 'ok' | 'part' | 'ko' | 'closed';

/**
 * État d'une case pour un joueur.
 * - wrapped : pas encore ouverte ; empty : ouverte mais l'admin n'y a pas mis de quête
 * - today / catch : ouverte, pas répondue, le jour même / un jour passé (rattrapage)
 * - ok / part / ko : répondue, parfaite / avec des points partiels / ratée
 * - closed : jamais répondue et l'événement est fini
 */
export function cellState(
	day: { date: string; opensAt: Date; hasQuestion: boolean },
	answer: { score: number; isCorrect: boolean } | null,
	now: Date,
	end: Date,
	timezone: string
): CellState {
	// Juste = réussie, même avec des points réduits (photo défloutée) ; points partiels = presque.
	if (answer) return answer.isCorrect ? 'ok' : answer.score > 0 ? 'part' : 'ko';
	if (day.opensAt > now) return 'wrapped';
	if (!day.hasQuestion) return 'empty';
	if (now >= end) return 'closed';
	return localParts(now, timezone).date === day.date ? 'today' : 'catch';
}

/** Une réponse est « du jour J » si elle arrive le jour calendaire de la case (fuseau de l'événement). */
export const isSameDay = (dayDate: string, at: Date, timezone: string) => localParts(at, timezone).date === dayDate;

export type BoardEntry = {
	userId: string;
	name: string;
	points: number;
	ok: number;
	answered: number;
	elapsed: number;
	/** Points et réponse sur la dernière case ouverte : sert à recalculer le rang « d'avant ». */
	latestPoints: number;
	latestAnswered: boolean;
};
export type Ranked = BoardEntry & { rank: number; delta: number | null };

const byScore = (a: { p: number; e: number }, b: { p: number; e: number }) => b.p - a.p || a.e - b.e;

/**
 * Classe les joueurs (points desc, puis temps cumulé asc) et calcule l'évolution par rapport au
 * classement d'avant la dernière case : delta > 0 = gagne des places, null = nouveau joueur.
 */
export function rankBoard(entries: BoardEntry[]): Ranked[] {
	const before = entries
		.filter((x) => x.answered - (x.latestAnswered ? 1 : 0) > 0)
		.map((x) => ({ id: x.userId, p: x.points - x.latestPoints, e: x.elapsed }))
		.sort(byScore);
	const prevRank = new Map(before.map((x, i) => [x.id, i + 1]));
	return entries
		.map((x) => ({ x, p: x.points, e: x.elapsed }))
		.sort(byScore)
		.map(({ x }, i) => {
			const prev = prevRank.get(x.userId);
			return { ...x, rank: i + 1, delta: prev === undefined ? null : prev - (i + 1) };
		});
}

export type RecapAnswer = { date: string; points: number; isCorrect: boolean; elapsedMs: number; sameDay: boolean };

/**
 * Récap personnel de fin d'événement. `days` : les cases ouvertes avec une quête, dans l'ordre du
 * calendrier ; `answers` : les réponses du joueur (une par case au plus).
 */
export function recap(days: string[], answers: RecapAnswer[]) {
	const byDate = new Map(answers.map((a) => [a.date, a]));
	let streak = 0;
	let best = 0;
	for (const d of days) {
		streak = byDate.get(d)?.isCorrect ? streak + 1 : 0;
		best = Math.max(best, streak);
	}
	const top = answers.reduce<RecapAnswer | null>((m, a) => (a.points > (m?.points ?? 0) ? a : m), null);
	// Réponse la plus rapide : juste, et donnée le jour même (un rattrapage n'a pas de « vitesse »).
	const fastest = answers.filter((a) => a.isCorrect && a.sameDay).reduce<RecapAnswer | null>((m, a) => (!m || a.elapsedMs < m.elapsedMs ? a : m), null);
	return {
		total: days.length,
		answered: answers.length,
		correct: answers.filter((a) => a.isCorrect).length,
		points: answers.reduce((s, a) => s + a.points, 0),
		bestStreak: best,
		topDay: top ? { date: top.date, points: top.points } : null,
		fastest: fastest ? { date: fastest.date, elapsedMs: fastest.elapsedMs } : null
	};
}
