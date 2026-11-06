// Photo qui se dévoile : la version servie dépend du temps écoulé depuis l'ouverture, calculé côté
// serveur. Un flou CSS ne protégerait rien (l'image nette serait téléchargeable) : ici le navigateur
// ne reçoit jamais que la version pixellisée de l'étape en cours.
import sharp from 'sharp';

/** Taille d'un pixel de la mosaïque, en fraction de la largeur de l'image ; 0 = nette (dernière étape). */
const BLOCKS = [1 / 8, 1 / 12, 1 / 18, 1 / 28, 1 / 45, 0];
export const BLUR_STAGES = BLOCKS.length;
const MAX_WIDTH = 900; // inutile de pixelliser plus grand que ce qu'affiche un écran

/** Étape (0 = la plus floue, BLUR_STAGES-1 = nette) à `elapsedMs` de l'ouverture, nette au bout de `minutes`. */
export function blurStage(elapsedMs: number, minutes: number): number {
	if (elapsedMs <= 0) return 0;
	const step = (minutes * 60_000) / (BLUR_STAGES - 1);
	return Math.min(BLUR_STAGES - 1, Math.floor(elapsedMs / step));
}

/** Instant (ms depuis l'ouverture) où commence l'étape `stage`. */
export const stageStartsAt = (stage: number, minutes: number) => (stage * minutes * 60_000) / (BLUR_STAGES - 1);

// ponytail: cache process sans TTL (6 étapes × une poignée de photos, quelques centaines de Ko), vidé
// avec le cache des questions à chaque écriture admin.
const cache = new Map<string, Promise<Buffer>>();
export const invalidateBlur = () => cache.clear();

/** Version pixellisée de l'étape `stage` (PNG). */
export function pixelated(questionId: number, stage: number, original: Buffer): Promise<Buffer> {
	const key = `${questionId}:${stage}`;
	let p = cache.get(key);
	if (!p) {
		p = (async () => {
			const base = sharp(original, { failOn: 'error' }).rotate(); // rotate() : respecte l'orientation EXIF des photos de téléphone
			const meta = await base.metadata();
			const width = Math.min(meta.autoOrient?.width ?? meta.width ?? MAX_WIDTH, MAX_WIDTH);
			const resized = await base.resize({ width, withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
			const { width: w, height: h } = resized.info;
			const block = Math.max(2, Math.round(w * BLOCKS[stage]));
			const small = await sharp(resized.data).resize(Math.max(1, Math.ceil(w / block)), Math.max(1, Math.ceil(h / block)), { kernel: 'nearest' }).toBuffer();
			return sharp(small).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
		})();
		p.catch(() => cache.delete(key));
		cache.set(key, p);
	}
	return p;
}
