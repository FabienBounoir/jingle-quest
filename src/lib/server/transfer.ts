// Export / import du contenu (template partageable entre entreprises, ou passage local → prod).
// Contient la configuration et les questions, jamais les joueurs ni leurs réponses.
import { asc, count, eq } from 'drizzle-orm';
import { answerLists, answers, days, db, listItems, questionAnswers, questions, settings } from '$lib/server/db';
import { getSettings, invalidateSettings } from './settings';
import { isValidTimeZone, localParts, zonedTime } from './tz';
import { MAX_IMAGE_BYTES, MAX_LABEL, sniffImage } from './upload';

export const FORMAT = 'jingle-quest/1';

type Image = { mime: string; base64: string };
export type ExportFile = {
	format: typeof FORMAT;
	exportedAt: string;
	settings: {
		eventName: string;
		bgColor: string;
		timezone: string;
		startDate: string;
		endDate: string;
		workdaysOnly: boolean;
		defaultOpenTime: string;
		pointsCorrect: number;
		pointsCatchup: number;
		bonusMax: number;
		bonusMinutes: number;
		logo: Image | null;
	};
	lists: { name: string; items: string[] }[];
	questions: { text: string; list: string; correct: string[]; day: string | null; image: Image | null }[];
	days: { date: string; time: string; excluded: boolean }[];
};

const img = (buf: Buffer | null, mime: string | null): Image | null => (buf && mime ? { mime, base64: buf.toString('base64') } : null);

export async function exportData(): Promise<ExportFile> {
	const s = await getSettings();
	const lists = await db.select().from(answerLists).orderBy(asc(answerLists.name));
	const items = await db.select().from(listItems).orderBy(asc(listItems.label));
	const qs = await db.select().from(questions).orderBy(asc(questions.id));
	const qa = await db.select().from(questionAnswers);
	const ds = await db.select().from(days).orderBy(asc(days.date));
	const listName = new Map(lists.map((l) => [l.id, l.name]));
	const label = new Map(items.map((i) => [i.id, i.label]));
	const dayOf = new Map(ds.filter((d) => d.questionId).map((d) => [d.questionId!, d.date]));
	return {
		format: FORMAT,
		exportedAt: new Date().toISOString(),
		settings: {
			eventName: s.eventName,
			bgColor: s.bgColor,
			timezone: s.timezone,
			startDate: s.startDate,
			endDate: s.endDate,
			workdaysOnly: s.workdaysOnly,
			defaultOpenTime: s.defaultOpenTime.slice(0, 5),
			pointsCorrect: s.pointsCorrect,
			pointsCatchup: s.pointsCatchup,
			bonusMax: s.bonusMax,
			bonusMinutes: s.bonusMinutes,
			logo: img(s.logo, s.logoMime)
		},
		lists: lists.map((l) => ({ name: l.name, items: items.filter((i) => i.listId === l.id).map((i) => i.label) })),
		questions: qs.map((q) => ({
			text: q.text,
			list: listName.get(q.listId)!,
			correct: qa.filter((a) => a.questionId === q.id).map((a) => label.get(a.itemId)!),
			day: dayOf.get(q.id) ?? null,
			image: img(q.image, q.imageMime)
		})),
		days: ds.map((d) => ({ date: d.date, time: localParts(d.opensAt, s.timezone).time, excluded: d.excluded }))
	};
}

// ---------- Validation (pure, testée) ----------

export class ImportError extends Error {}

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const isTime = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

function image(v: unknown, where: string): { buf: Buffer; mime: string } | null {
	if (v === null || v === undefined) return null;
	const b64 = (v as Image)?.base64;
	if (typeof b64 !== 'string') throw new ImportError(`${where} : image illisible.`);
	const buf = Buffer.from(b64, 'base64');
	if (buf.length > MAX_IMAGE_BYTES) throw new ImportError(`${where} : image de plus de 2 Mo.`);
	// On ne croit pas le type déclaré dans le fichier : on le relit dans les octets (pas de SVG).
	const mime = sniffImage(buf);
	if (!mime) throw new ImportError(`${where} : format d'image refusé.`);
	return { buf, mime };
}

/** Vérifie un fichier d'export avant d'écrire quoi que ce soit. Lève ImportError avec un message lisible. */
export function parseExport(raw: unknown) {
	const f = raw as Partial<ExportFile>;
	if (!f || f.format !== FORMAT) throw new ImportError(`Ce n'est pas un export Jingle Quest (format attendu : ${FORMAT}).`);
	const s = f.settings;
	if (
		!s ||
		!isText(s.eventName, 80) ||
		typeof s.bgColor !== 'string' ||
		!/^#[0-9a-f]{6}$/i.test(s.bgColor) ||
		typeof s.timezone !== 'string' ||
		!isValidTimeZone(s.timezone) ||
		!isDate(s.startDate) ||
		!isDate(s.endDate) ||
		s.startDate > s.endDate ||
		typeof s.workdaysOnly !== 'boolean' ||
		!isTime(s.defaultOpenTime) ||
		!isInt(s.pointsCorrect, 0, 10_000) ||
		!isInt(s.pointsCatchup, 0, 10_000) ||
		!isInt(s.bonusMax, 0, 10_000) ||
		!isInt(s.bonusMinutes, 1, 1440)
	)
		throw new ImportError('Réglages invalides dans le fichier.');

	if (!Array.isArray(f.lists) || !Array.isArray(f.questions) || !Array.isArray(f.days)) throw new ImportError('Fichier incomplet.');
	const lists = new Map<string, Set<string>>();
	for (const l of f.lists) {
		if (!isText(l?.name, 60) || !Array.isArray(l.items)) throw new ImportError('Liste invalide dans le fichier.');
		if (lists.has(l.name)) throw new ImportError(`Liste « ${l.name} » en double.`);
		if (!l.items.every((i) => isText(i, MAX_LABEL))) throw new ImportError(`Valeur invalide dans la liste « ${l.name} ».`);
		lists.set(l.name, new Set(l.items));
	}
	const dates = new Set<string>();
	for (const d of f.days) {
		if (!isDate(d?.date) || !isTime(d.time) || typeof d.excluded !== 'boolean') throw new ImportError('Case du calendrier invalide.');
		dates.add(d.date);
	}
	const usedDays = new Set<string>();
	const qs = f.questions.map((q, i) => {
		const where = `Question ${i + 1}`;
		if (!isText(q?.text, 500)) throw new ImportError(`${where} : texte invalide.`);
		const items = lists.get(q.list);
		if (!items) throw new ImportError(`${where} : liste « ${q.list} » absente du fichier.`);
		if (!Array.isArray(q.correct) || q.correct.length === 0 || !q.correct.every((c) => items.has(c)))
			throw new ImportError(`${where} : bonnes réponses absentes de la liste « ${q.list} ».`);
		if (q.day !== null && (!dates.has(q.day) || usedDays.has(q.day))) throw new ImportError(`${where} : jour ${q.day} inconnu ou déjà pris.`);
		if (q.day) usedDays.add(q.day);
		return { text: q.text, list: q.list, correct: q.correct, day: q.day, image: image(q.image, where) };
	});
	return {
		settings: { ...s, logo: image(s.logo, 'Logo') },
		lists: [...lists].map(([name, items]) => ({ name, items: [...items] })),
		questions: qs,
		days: f.days
	};
}

// ---------- Import (remplace tout le contenu) ----------

export async function importData(raw: unknown): Promise<{ lists: number; questions: number; days: number }> {
	const data = parseExport(raw);
	const [{ n }] = await db.select({ n: count() }).from(answers);
	if (n > 0) throw new ImportError(`${n} réponse(s) de joueurs existent : remets d'abord les réponses à zéro.`);

	await db.transaction(async (tx) => {
		await tx.delete(days);
		await tx.delete(questions); // cascade : question_answers
		await tx.delete(answerLists); // cascade : list_items
		const { logo, ...s } = data.settings;
		await tx
			.update(settings)
			.set({ ...s, logo: logo?.buf ?? null, logoMime: logo?.mime ?? null })
			.where(eq(settings.id, 1));

		const itemIds = new Map<string, number>(); // "liste\u0000valeur" → id
		for (const l of data.lists) {
			const [row] = await tx.insert(answerLists).values({ name: l.name }).returning({ id: answerLists.id });
			if (l.items.length === 0) continue;
			const inserted = await tx
				.insert(listItems)
				.values(l.items.map((label) => ({ listId: row.id, label })))
				.returning({ id: listItems.id, label: listItems.label });
			for (const it of inserted) itemIds.set(`${l.name}\u0000${it.label}`, it.id);
		}
		const listIds = new Map((await tx.select().from(answerLists)).map((l) => [l.name, l.id]));

		const questionOfDay = new Map<string, number>();
		for (const q of data.questions) {
			const [row] = await tx
				.insert(questions)
				.values({ text: q.text, listId: listIds.get(q.list)!, image: q.image?.buf ?? null, imageMime: q.image?.mime ?? null })
				.returning({ id: questions.id });
			await tx.insert(questionAnswers).values(q.correct.map((c) => ({ questionId: row.id, itemId: itemIds.get(`${q.list}\u0000${c}`)! })));
			if (q.day) questionOfDay.set(q.day, row.id);
		}
		if (data.days.length)
			await tx.insert(days).values(
				data.days.map((d) => ({
					date: d.date,
					opensAt: zonedTime(d.date, d.time, data.settings.timezone),
					excluded: d.excluded,
					questionId: questionOfDay.get(d.date) ?? null
				}))
			);
	});
	invalidateSettings();
	return { lists: data.lists.length, questions: data.questions.length, days: data.days.length };
}
