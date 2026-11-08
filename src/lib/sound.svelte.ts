// Sons du site (navigateur uniquement). Web Audio : latence quasi nulle, et le compte à rebours est
// synthétisé ici (son original, aucun fichier ni licence). Coupable par le joueur (préférence locale).
// Les navigateurs bloquent le son tant que l'utilisateur n'a pas interagi avec la page : le premier
// clic « déverrouille » l'audio.

const STORAGE_KEY = 'jq-sound';

/** enabled : préférence du joueur ; unlocked : le navigateur autorise le son (après un premier clic). */
export const sound = $state({ enabled: true, unlocked: false });

let ctx: AudioContext | null = null;
let clickBuffer: AudioBuffer | null = null;

function audio(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!ctx) {
		ctx = new AudioContext();
		ctx.onstatechange = () => (sound.unlocked = ctx?.state === 'running');
	}
	if (ctx.state === 'suspended') void ctx.resume();
	sound.unlocked = ctx.state === 'running';
	return ctx;
}

export function initSound() {
	sound.enabled = localStorage.getItem(STORAGE_KEY) !== 'off';
	audio(); // tente tout de suite ; si le navigateur refuse, `unlocked` reste faux jusqu'au premier clic
}

/** À appeler depuis un clic : autorise le son pour la suite (compte à rebours sans interaction). */
export function unlockSound() {
	audio();
}

export function toggleSound() {
	sound.enabled = !sound.enabled;
	localStorage.setItem(STORAGE_KEY, sound.enabled ? 'on' : 'off');
	if (sound.enabled) playClick();
}

/** Clic des boutons : « cool bubble » par Roddz (flashkit.com, libre de droits). */
export async function playClick() {
	const c = audio();
	if (!c || !sound.enabled) return;
	if (!clickBuffer) {
		try {
			clickBuffer = await c.decodeAudioData(await (await fetch('/sounds/click.mp3')).arrayBuffer());
		} catch {
			return; // pas de son plutôt qu'une erreur
		}
	}
	const src = c.createBufferSource();
	const gain = c.createGain();
	gain.gain.value = 0.5;
	src.buffer = clickBuffer;
	src.connect(gain).connect(c.destination);
	src.start();
}

function tone(c: AudioContext, at: number, freq: number, duration: number, volume: number, type: OscillatorType = 'triangle') {
	const osc = c.createOscillator();
	const gain = c.createGain();
	osc.type = type;
	osc.frequency.value = freq;
	// Attaque courte puis décroissance : un « bip » rond, pas un buzzer.
	gain.gain.setValueAtTime(0, at);
	gain.gain.linearRampToValueAtTime(volume, at + 0.01);
	gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
	osc.connect(gain).connect(c.destination);
	osc.start(at);
	osc.stop(at + duration + 0.05);
}

/**
 * Compte à rebours de 3 secondes : un bip à 3, 2 et 1, puis un carillon montant à l'ouverture.
 * `offset` : secondes déjà écoulées (on rejoint le compte en cours plutôt que de le décaler).
 */
export function playCountdown(offset = 0) {
	const c = audio();
	if (!c || !sound.enabled) return;
	const t0 = c.currentTime - offset;
	for (const i of [0, 1, 2]) if (i >= offset - 0.05) tone(c, t0 + i, 660, 0.18, 0.25);
	for (const [i, f] of [523.25, 659.25, 783.99, 1046.5].entries()) tone(c, t0 + 3 + i * 0.07, f, 0.7, 0.18, 'sine');
}
