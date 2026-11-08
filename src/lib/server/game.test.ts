import { describe, expect, it } from 'vitest';
import { fold } from '$lib/text';
import { bonusAt, cellState, eventEnd, isSameDay, points, rankBoard, recap } from './game';

const s = { pointsCorrect: 100, pointsCatchup: 50, bonusMax: 50, bonusMinutes: 60 };
const min = 60_000;

describe('points', () => {
	it('bonus linéaire de 50 à 0 sur 60 min le jour J', () => {
		expect(points(1, true, 0, s)).toBe(150);
		expect(points(1, true, 30 * min, s)).toBe(125);
		expect(points(1, true, 60 * min, s)).toBe(100);
		expect(points(1, true, 5 * 60 * min, s)).toBe(100);
		expect(bonusAt(-5000, s)).toBe(50); // horloge client en avance : jamais plus que le max
	});
	it('rattrapage sans bonus, mauvaise réponse à 0', () => {
		expect(points(1, false, 0, s)).toBe(50);
		expect(points(0, true, 0, s)).toBe(0);
		expect(points(0, false, 0, s)).toBe(0);
	});
	it('points partiels au prorata, bonus compris', () => {
		expect(points(0.7, true, 0, s)).toBe(105); // 70 % de 150
		expect(points(0.5, false, 0, s)).toBe(25);
	});
});

describe('eventEnd / isSameDay', () => {
	it('fin = minuit heure de Paris après le dernier jour', () => {
		expect(eventEnd('2026-12-24', 'Europe/Paris').toISOString()).toBe('2026-12-24T23:00:00.000Z');
	});
	it('jour J selon le fuseau de l’événement, pas UTC', () => {
		expect(isSameDay('2026-12-01', new Date('2026-12-01T22:59:00Z'), 'Europe/Paris')).toBe(true);
		expect(isSameDay('2026-12-01', new Date('2026-12-01T23:01:00Z'), 'Europe/Paris')).toBe(false);
	});
});

describe('cellState', () => {
	const tz = 'Europe/Paris';
	const end = eventEnd('2026-12-24', tz);
	const day = { date: '2026-12-09', opensAt: new Date('2026-12-09T08:00:00Z'), hasQuestion: true };
	const at = (iso: string) => new Date(iso);
	it('suit la vie d’une case', () => {
		expect(cellState(day, null, at('2026-12-09T07:59:00Z'), end, tz)).toBe('wrapped');
		expect(cellState(day, null, at('2026-12-09T08:00:00Z'), end, tz)).toBe('today');
		expect(cellState(day, null, at('2026-12-10T08:00:00Z'), end, tz)).toBe('catch');
		expect(cellState(day, null, at('2026-12-25T08:00:00Z'), end, tz)).toBe('closed');
		expect(cellState(day, { score: 1, isCorrect: true }, at('2026-12-10T08:00:00Z'), end, tz)).toBe('ok');
		expect(cellState(day, { score: 0.45, isCorrect: true }, at('2026-12-10T08:00:00Z'), end, tz)).toBe('ok');
		expect(cellState(day, { score: 0.4, isCorrect: false }, at('2026-12-10T08:00:00Z'), end, tz)).toBe('part');
		expect(cellState(day, { score: 0, isCorrect: false }, at('2026-12-10T08:00:00Z'), end, tz)).toBe('ko');
		expect(cellState({ ...day, hasQuestion: false }, null, at('2026-12-09T09:00:00Z'), end, tz)).toBe('empty');
	});
});

describe('fold', () => {
	it('ignore accents et casse', () => {
		expect(fold('  Inès LEFÈVRE ')).toBe('ines lefevre');
	});
});

describe('rankBoard', () => {
	const e = (userId: string, points: number, elapsed: number, latestPoints = 0, latestAnswered = false, answered = 2) => ({
		userId, name: userId, points, ok: 0, answered, elapsed, latestPoints, latestAnswered
	});
	it('classe par points puis par temps cumulé, et calcule l’évolution depuis la veille', () => {
		const r = rankBoard([
			e('a', 300, 100, 0, true), // a a raté la dernière case : 300 avant comme après
			e('b', 290, 50, 150, true), // b : 140 avant
			e('c', 300, 90, 150, true), // c : 150 avant ; à égalité avec a mais plus rapide
			e('d', 140, 10, 140, true, 1) // nouveau joueur : aucune réponse avant la dernière case
		]);
		expect(r.map((x) => [x.userId, x.rank, x.delta])).toEqual([
			['c', 1, 1], // avant : a 300, b 140, c 150 → c était 2e
			['a', 2, -1],
			['b', 3, 0],
			['d', 4, null]
		]);
	});
});

describe('recap', () => {
	const a = (date: string, points: number, isCorrect: boolean, elapsedMs = 60_000, sameDay = true) => ({ date, points, isCorrect, elapsedMs, sameDay });
	it('compte la plus longue série, la meilleure quête et la réponse la plus rapide du jour J', () => {
		const days = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
		const r = recap(days, [
			a('d1', 120, true, 90_000),
			a('d2', 140, true, 20_000),
			a('d3', 0, false),
			a('d4', 50, true, 5_000, false), // rattrapage : pas de « plus rapide »
			a('d5', 110, true, 300_000)
			// d6 : pas répondu, casse la série
		]);
		expect(r).toEqual({
			total: 6, answered: 5, correct: 4, points: 420, bestStreak: 2,
			topDay: { date: 'd2', points: 140 },
			fastest: { date: 'd2', elapsedMs: 20_000 }
		});
	});
	it('reste sobre pour qui n’a pas joué', () => {
		expect(recap(['d1'], [])).toEqual({ total: 1, answered: 0, correct: 0, points: 0, bestStreak: 0, topDay: null, fastest: null });
	});
});
