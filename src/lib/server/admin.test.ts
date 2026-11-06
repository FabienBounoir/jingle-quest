import { describe, expect, it } from 'vitest';
import { eligibleDates } from './calendar';
import { localParts, zonedTime } from './tz';
import { parseValues, sniffImage } from './upload';

describe('zonedTime / localParts', () => {
	it('convertit une heure locale de Paris en instant UTC, hiver comme été', () => {
		expect(zonedTime('2026-12-01', '09:00', 'Europe/Paris').toISOString()).toBe('2026-12-01T08:00:00.000Z');
		expect(zonedTime('2026-07-01', '09:00', 'Europe/Paris').toISOString()).toBe('2026-07-01T07:00:00.000Z');
		expect(zonedTime('2026-12-01', '09:00', 'America/New_York').toISOString()).toBe('2026-12-01T14:00:00.000Z');
	});
	it('gère les jours de changement d’heure', () => {
		expect(zonedTime('2026-03-29', '09:00', 'Europe/Paris').toISOString()).toBe('2026-03-29T07:00:00.000Z');
		expect(zonedTime('2026-10-25', '09:00', 'Europe/Paris').toISOString()).toBe('2026-10-25T08:00:00.000Z');
	});
	it('fait l’aller-retour', () => {
		expect(localParts(zonedTime('2026-12-24', '18:30', 'Europe/Paris'), 'Europe/Paris')).toEqual({ date: '2026-12-24', time: '18:30' });
	});
});

describe('eligibleDates', () => {
	it('donne 18 jours ouvrés du 1er au 24 décembre 2026, 24 avec les week-ends', () => {
		const d = eligibleDates('2026-12-01', '2026-12-24', true);
		expect(d).toHaveLength(18);
		expect(d.slice(0, 5)).toEqual(['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-07']);
		expect(eligibleDates('2026-12-01', '2026-12-24', false)).toHaveLength(24);
		expect(eligibleDates('2026-12-05', '2026-12-06', true)).toEqual([]);
	});
});

describe('parseValues', () => {
	it('lit une valeur par ligne, première colonne d’un CSV, sans doublons ni vides', () => {
		const csv = '﻿Julien Robert;Data\r\n"Dupont, Léa",RH\n\n  julien robert \nInès   Garnier\n';
		expect(parseValues(csv)).toEqual(['Julien Robert', 'Dupont, Léa', 'Inès Garnier']);
	});
});

describe('sniffImage', () => {
	it('reconnaît les vrais formats et refuse le reste (SVG compris)', () => {
		expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
		expect(sniffImage(Buffer.from('89504e470d0a1a0a0000', 'hex'))).toBe('image/png');
		expect(sniffImage(Buffer.from('RIFF0000WEBPVP8 '))).toBe('image/webp');
		expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
	});
});
