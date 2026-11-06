import { sql } from 'drizzle-orm';
import {
	boolean,
	jsonb,
	real,
	check,
	customType,
	date,
	index,
	integer,
	pgTable,
	primaryKey,
	serial,
	text,
	time,
	timestamp,
	unique,
	uuid
} from 'drizzle-orm/pg-core';

// ponytail: images en bytea (une vingtaine de quelques centaines de Ko), pas de PVC ni d'objet
// storage. Passer à un stockage objet si on dépasse ~100 Mo d'images.
const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' });

const tstz = (name: string) => timestamp(name, { withTimezone: true });

export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	email: text('email').notNull().unique(),
	displayName: text('display_name').notNull(),
	createdAt: tstz('created_at').notNull().defaultNow(),
	lastLoginAt: tstz('last_login_at').notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
	/** sha256 du token du cookie : une fuite de la base ne donne aucune session utilisable. */
	id: text('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: tstz('expires_at').notNull()
});

export const answerLists = pgTable('answer_lists', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique()
});

export const listItems = pgTable(
	'list_items',
	{
		id: serial('id').primaryKey(),
		listId: integer('list_id')
			.notNull()
			.references(() => answerLists.id, { onDelete: 'cascade' }),
		label: text('label').notNull()
	},
	(t) => [unique().on(t.listId, t.label)]
);

/**
 * list (autocomplétion dans une liste), choice (QCM), number (estimation), order (remettre dans l'ordre),
 * zone (clic sur l'image), match (associer deux colonnes), blur (photo qui se dévoile + réponse dans une liste).
 */
export const QUESTION_TYPES = ['list', 'choice', 'number', 'order', 'zone', 'match', 'blur'] as const;
/** Types dont la réponse se choisit dans une liste (bonnes réponses dans question_answers). */
export const LIST_TYPES: readonly QuestionType[] = ['list', 'blur'];
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const questions = pgTable(
	'questions',
	{
		id: serial('id').primaryKey(),
		type: text('type').$type<QuestionType>().notNull().default('list'),
		text: text('text').notNull(),
		/** Types « list » et « blur » uniquement (leurs bonnes réponses sont dans question_answers). */
		listId: integer('list_id').references(() => answerLists.id),
		image: bytea('image'),
		imageMime: text('image_mime'),
		/** Ce que voit le joueur (propositions du QCM, éléments mélangés, unité…). Cf. questionTypes.ts. */
		config: jsonb('config').notNull().default({}),
		/** La solution des types hors « list ». Ne quitte JAMAIS le serveur avant la fin de l'événement. */
		solution: jsonb('solution').notNull().default({})
	},
	(t) => [check('questions_type', sql`${t.type} in ('list', 'choice', 'number', 'order', 'zone', 'match', 'blur')`)]
);

/** Bonnes réponses d'une question (une ou plusieurs valeurs de sa liste). */
export const questionAnswers = pgTable(
	'question_answers',
	{
		questionId: integer('question_id')
			.notNull()
			.references(() => questions.id, { onDelete: 'cascade' }),
		itemId: integer('item_id')
			.notNull()
			.references(() => listItems.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.questionId, t.itemId] })]
);

export const days = pgTable('days', {
	date: date('date').primaryKey(),
	opensAt: tstz('opens_at').notNull(),
	excluded: boolean('excluded').notNull().default(false),
	questionId: integer('question_id')
		.unique()
		.references(() => questions.id, { onDelete: 'set null' }),
	/** Posé quand l'ouverture a été diffusée aux clients connectés : un redémarrage ne la rejoue pas. */
	notifiedAt: tstz('notified_at'),
	/** Posé quand le rappel push « ouvre dans 5 min » est parti : jamais deux fois le même. */
	remindedAt: tstz('reminded_at')
});

export const answers = pgTable(
	'answers',
	{
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		questionId: integer('question_id')
			.notNull()
			.references(() => questions.id, { onDelete: 'cascade' }),
		/** Type « list » : la valeur choisie. Autres types : null, la réponse est dans `value`. */
		itemId: integer('item_id').references(() => listItems.id),
		value: jsonb('value'),
		/** Part des points obtenue, de 0 à 1 (estimation et ordre donnent des points partiels). */
		score: real('score').notNull().default(0),
		/** score === 1 : réponse parfaite (compte dans « bonnes réponses »). */
		isCorrect: boolean('is_correct').notNull(),
		points: integer('points').notNull(),
		elapsedMs: integer('elapsed_ms').notNull(),
		answeredAt: tstz('answered_at').notNull().defaultNow()
	},
	// La clé primaire EST la règle « une seule tentative par question ».
	(t) => [primaryKey({ columns: [t.userId, t.questionId] }), index().on(t.questionId)]
);

export const pushSubscriptions = pgTable('push_subscriptions', {
	id: serial('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	endpoint: text('endpoint').notNull().unique(),
	p256dh: text('p256dh').notNull(),
	auth: text('auth').notNull(),
	userAgent: text('user_agent')
});

/** Une seule ligne (id = 1) : réglages de l'événement, éditables dans l'admin. */
export const settings = pgTable(
	'settings',
	{
		id: integer('id').primaryKey().default(1),
		eventName: text('event_name').notNull().default("Le Calendrier de l'Avent"),
		bgColor: text('bg_color').notNull().default('#C62F3B'),
		logo: bytea('logo'),
		logoMime: text('logo_mime'),
		timezone: text('timezone').notNull().default('Europe/Paris'),
		startDate: date('start_date').notNull().default(sql`make_date(extract(year from now())::int, 12, 1)`),
		endDate: date('end_date').notNull().default(sql`make_date(extract(year from now())::int, 12, 24)`),
		workdaysOnly: boolean('workdays_only').notNull().default(true),
		defaultOpenTime: time('default_open_time').notNull().default('09:00'),
		pointsCorrect: integer('points_correct').notNull().default(100),
		pointsCatchup: integer('points_catchup').notNull().default(50),
		bonusMax: integer('bonus_max').notNull().default(50),
		bonusMinutes: integer('bonus_minutes').notNull().default(60)
	},
	(t) => [check('settings_singleton', sql`${t.id} = 1`), check('settings_dates', sql`${t.startDate} <= ${t.endDate}`)]
);
