// Partagé client/serveur : niveaux de la photo floue. Le joueur défloute lui-même ; chaque niveau
// affine la mosaïque et réduit la part des points qu'une bonne réponse peut rapporter (bonus compris).
// Premiers clics bon marché, puis de plus en plus chers ; la photo ne devient nette qu'au dernier.
export const BLUR_LEVELS = [
	{ block: 1 / 10, points: 1 },
	{ block: 1 / 11, points: 0.95 },
	{ block: 1 / 12, points: 0.9 },
	{ block: 1 / 14, points: 0.85 },
	{ block: 1 / 16, points: 0.78 },
	{ block: 1 / 18, points: 0.7 },
	{ block: 1 / 21, points: 0.6 },
	{ block: 1 / 24, points: 0.5 },
	{ block: 1 / 28, points: 0.4 },
	{ block: 1 / 33, points: 0.3 }, // encore en mosaïque : le détail n'apparaît qu'au dernier clic
	{ block: 0, points: 0.2 } // nette
] as const;

/** Part des points max selon le niveau de défloutage (0 = le plus flou, dernier = nette). */
export const BLUR_MULTIPLIERS: readonly number[] = BLUR_LEVELS.map((l) => l.points);
export const BLUR_STAGES = BLUR_LEVELS.length;
export const LAST_STAGE = BLUR_STAGES - 1;
