import { describe, expect, it } from 'vitest';
import { fold } from '$lib/text';
import { bonusAt, cellState, eventEnd, isSameDay, points } from './game';

const s = { pointsCorrect: 100, pointsCatchup: 50, bonusMax: 50, bonusMinutes: 60 };
const min = 60_000;

describe('points', () => {
	it('bonus linéaire de 50 à 0 sur 60 min le jour J', () => {
		expect(points(true, true, 0, s)).toBe(150);
		expect(points(true, true, 30 * min, s)).toBe(125);
		expect(points(true, true, 60 * min, s)).toBe(100);
		expect(points(true, true, 5 * 60 * min, s)).toBe(100);
		expect(bonusAt(-5000, s)).toBe(50); // horloge client en avance : jamais plus que le max
	});
	it('rattrapage sans bonus, mauvaise réponse à 0', () => {
		expect(points(true, false, 0, s)).toBe(50);
		expect(points(false, true, 0, s)).toBe(0);
		expect(points(false, false, 0, s)).toBe(0);
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
		expect(cellState(day, { isCorrect: true }, at('2026-12-10T08:00:00Z'), end, tz)).toBe('ok');
		expect(cellState(day, { isCorrect: false }, at('2026-12-10T08:00:00Z'), end, tz)).toBe('ko');
		expect(cellState({ ...day, hasQuestion: false }, null, at('2026-12-09T09:00:00Z'), end, tz)).toBe('empty');
	});
});

describe('fold', () => {
	it('ignore accents et casse', () => {
		expect(fold('  Inès LEFÈVRE ')).toBe('ines lefevre');
	});
});
