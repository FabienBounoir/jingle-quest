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
	it('transporte les autres types en les revalidant comme un formulaire admin', () => {
		const f = valid() as ReturnType<typeof valid> & { questions: unknown[] };
		f.days.push({ date: '2026-12-02', time: '09:00', excluded: false });
		f.questions.push(
			{ type: 'choice', text: 'QCM ?', list: null, correct: [], config: { options: ['A', 'B', 'C'] }, solution: { correct: 2 }, day: '2026-12-02', image: null },
			{ type: 'order', text: 'Ordre ?', list: null, correct: [], config: { items: ['b', 'a', 'c'] }, solution: { order: [1, 0, 2] }, day: null, image: null }
		);
		const d = parseExport(f);
		expect(d.questions[1].solution).toEqual({ correct: 2 });
		const o = d.questions[2] as unknown as { config: { items: string[] }; solution: { order: number[] } };
		expect(o.solution.order.map((i) => o.config.items[i])).toEqual(['a', 'b', 'c']);
		const bad = valid() as ReturnType<typeof valid> & { questions: unknown[] };
		bad.questions.push({ type: 'choice', text: 'QCM ?', list: null, correct: [], config: { options: ['A'] }, solution: { correct: 0 }, day: null, image: null });
		expect(() => parseExport(bad)).toThrow(/Question 2 : QCM/);
		const zone = valid() as ReturnType<typeof valid> & { questions: unknown[] };
		zone.questions.push({ type: 'zone', text: 'Où ?', list: null, correct: [], config: {}, solution: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 }, day: null, image: null });
		expect(() => parseExport(zone)).toThrow(/besoin de son image/);
	});
});
