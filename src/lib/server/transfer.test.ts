import { describe, expect, it } from 'vitest';
import { FORMAT, ImportError, parseExport } from './transfer';

const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64');
const valid = () => ({
	format: FORMAT,
	exportedAt: '2026-11-06T00:00:00Z',
	settings: {
		eventName: 'Jingle Quest', bgColor: '#C62F3B', timezone: 'Europe/Paris', startDate: '2026-12-01', endDate: '2026-12-24',
		workdaysOnly: true, defaultOpenTime: '09:00', pointsCorrect: 100, pointsCatchup: 50, bonusMax: 50, bonusMinutes: 60, logo: null
	},
	lists: [{ name: 'Collaborateurs', items: ['Julien Robert', 'Inès Garnier'] }],
	questions: [{ text: 'Qui ?', list: 'Collaborateurs', correct: ['Julien Robert'], day: '2026-12-01', image: { mime: 'image/png', base64: png } }],
	days: [{ date: '2026-12-01', time: '09:00', excluded: false }]
});
const fails = (mutate: (f: ReturnType<typeof valid>) => void, msg: RegExp) => {
	const f = valid();
	mutate(f);
	expect(() => parseExport(f)).toThrowError(msg);
};

describe('parseExport', () => {
	it('accepte un export valide et relit le type des images', () => {
		const d = parseExport(valid());
		expect(d.questions[0].image?.mime).toBe('image/png');
		expect(d.lists[0].items).toEqual(['Julien Robert', 'Inès Garnier']);
	});
	it('refuse un fichier incohérent avec un message lisible', () => {
		expect(() => parseExport({ hello: 1 })).toThrow(ImportError);
		fails((f) => (f.settings.bgColor = 'red;}body{'), /Réglages invalides/);
		fails((f) => (f.questions[0].correct = ['Inconnu']), /bonnes réponses absentes/);
		fails((f) => (f.questions[0].list = 'Projets'), /absente du fichier/);
		fails((f) => (f.questions[0].day = '2026-12-02'), /jour 2026-12-02/);
		fails((f) => (f.questions[0].image = { mime: 'image/png', base64: Buffer.from('<svg onload=x>').toString('base64') }), /format d'image refusé/);
		fails((f) => f.lists.push({ name: 'Collaborateurs', items: [] }), /en double/);
	});
});
