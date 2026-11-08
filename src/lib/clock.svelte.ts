/**
 * Horloge qui avance chaque seconde, recalée sur l'heure du serveur (une montre de PC en avance ne
 * doit pas afficher une case ouverte trop tôt). À appeler à l'initialisation d'un composant.
 */
export function serverClock(serverNow: number) {
	const skew = serverNow - Date.now();
	let now = $state(serverNow);
	$effect(() => {
		// 4 fois par seconde : le 3-2-1 de la salle d'attente tombe pile sur les secondes.
		const t = setInterval(() => (now = Date.now() + skew), 250);
		return () => clearInterval(t);
	});
	return {
		get now() {
			return now;
		}
	};
}

export function countdown(ms: number) {
	// Arrondi au-dessus, comme tout compte à rebours : « 1 s » jusqu'à la dernière milliseconde, jamais « 0 » trop tôt.
	const t = Math.max(0, Math.ceil(ms / 1000));
	const pad = (n: number) => String(n).padStart(2, '0');
	return { d: Math.floor(t / 86400), h: pad(Math.floor((t % 86400) / 3600)), m: pad(Math.floor((t % 3600) / 60)), s: pad(t % 60) };
}
