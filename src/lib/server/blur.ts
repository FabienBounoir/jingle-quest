// Photo qui se dévoile et zoom mystère : le serveur sert la version pixellisée du niveau atteint par le joueur
// (table reveals). Un flou CSS ne protégerait rien (l'image nette serait téléchargeable) : ici le
// navigateur ne reçoit jamais qu'une version déjà dégradée.
import sharp from 'sharp';
import { BLUR_LEVELS, ZOOM_CROPS } from '$lib/blur';

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
			const block = Math.max(2, Math.round(w * BLUR_LEVELS[stage].block));
			const small = await sharp(resized.data).resize(Math.max(1, Math.ceil(w / block)), Math.max(1, Math.ceil(h / block)), { kernel: 'nearest' }).toBuffer();
			return sharp(small).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
		})();
		p.catch(() => cache.delete(key));
		cache.set(key, p);
	}
	return p;
}

/**
 * Zoom mystère : recadrage de l'étape `stage` autour de `center` (fractions de l'image), agrandi à la
 * taille d'affichage. Le cadre reste dans l'image (on le décale au bord plutôt que de le couper).
 */
export function zoomed(questionId: number, stage: number, original: Buffer, center: { x: number; y: number }): Promise<Buffer> {
	const key = `z${questionId}:${stage}`;
	let p = cache.get(key);
	if (!p) {
		p = (async () => {
			// Rotation EXIF appliquée d'abord : le centre a été choisi sur l'image telle qu'affichée.
			const { data, info } = await sharp(original, { failOn: 'error' }).rotate().toBuffer({ resolveWithObject: true });
			const { width: W, height: H } = info;
			const f = ZOOM_CROPS[stage];
			const cw = Math.max(1, Math.round(W * f));
			const ch = Math.max(1, Math.round(H * f));
			const clamp = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v)));
			const left = clamp(center.x * W - cw / 2, W - cw);
			const top = clamp(center.y * H - ch / 2, H - ch);
			const outW = Math.min(W, MAX_WIDTH);
			return sharp(data)
				.extract({ left, top, width: cw, height: ch })
				.resize(outW, Math.max(1, Math.round((outW * H) / W)))
				.png()
				.toBuffer();
		})();
		p.catch(() => cache.delete(key));
		cache.set(key, p);
	}
	return p;
}
