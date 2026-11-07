// Photo qui se dévoile : le serveur sert la version pixellisée du niveau atteint par le joueur
// (table reveals). Un flou CSS ne protégerait rien (l'image nette serait téléchargeable) : ici le
// navigateur ne reçoit jamais qu'une version déjà dégradée.
import sharp from 'sharp';
import { BLUR_STAGES } from '$lib/blur';

/** Taille d'un pixel de la mosaïque, en fraction de la largeur de l'image ; 0 = nette (dernier niveau). */
const BLOCKS = [1 / 8, 1 / 12, 1 / 18, 1 / 28, 1 / 45, 0];
if (BLOCKS.length !== BLUR_STAGES) throw new Error('BLOCKS et BLUR_MULTIPLIERS doivent avoir autant de niveaux');
const MAX_WIDTH = 900; // inutile de pixelliser plus grand que ce qu'affiche un écran

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
