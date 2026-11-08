<script lang="ts">
	// Plein écran des 3 dernières secondes (salle d'attente) : rayons qui tournent, anneau qui se vide
	// pendant chaque seconde, chiffre « tamponné » dans une pastille, puis « C'EST PARTI ! » et confettis.
	// 100 % CSS ; le son est joué à part (sound.svelte.ts). value : 3, 2, 1, puis 0 = c'est parti.
	let { value }: { value: number } = $props();

	const COLORS = ['#ffc542', '#7fd1a6', '#ffffff', '#c62f3b', '#2d4b9a'];
	// Confettis : directions et tailles tirées une fois (pas à chaque rendu).
	const confetti = Array.from({ length: 28 }, (_, i) => ({
		angle: (360 / 28) * i + Math.random() * 10,
		dist: 32 + Math.random() * 22, // en vmin
		size: 10 + Math.random() * 12,
		color: COLORS[i % COLORS.length],
		round: i % 3 === 0,
		delay: Math.random() * 0.08
	}));
</script>

<div class="overlay" role="timer" aria-live="assertive" aria-label={value > 0 ? `Ouverture dans ${value}` : "C'est parti !"}>
	<div class="burst" aria-hidden="true"></div>

	{#key value}
		<div class="stage">
			{#if value > 0}
				<span class="shock" aria-hidden="true"></span>
				<svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
					<circle cx="60" cy="60" r="54" class="track" />
					<circle cx="60" cy="60" r="54" class="fill" />
				</svg>
				<span class="badge"><span class="digit">{value}</span></span>
			{:else}
				{#each confetti as c, i (i)}
					<span
						class="confetto"
						class:round={c.round}
						aria-hidden="true"
						style:--a="{c.angle}deg"
						style:--d="{c.dist}vmin"
						style:--s="{c.size}px"
						style:--c={c.color}
						style:--delay="{c.delay}s"
					></span>
				{/each}
				<span class="go">C'EST PARTI !</span>
			{/if}
		</div>
	{/key}
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 20;
		display: grid;
		place-items: center;
		overflow: hidden;
		background: radial-gradient(circle, rgba(42, 26, 31, 0.6) 0%, rgba(42, 26, 31, 0.9) 70%);
		backdrop-filter: blur(3px); /* la page derrière ne doit pas voler la vedette */
		pointer-events: none;
	}

	/* Rayons : un dégradé conique doré, estompé vers les bords, qui tourne lentement. */
	.burst {
		position: absolute;
		width: 160vmax;
		height: 160vmax;
		background: repeating-conic-gradient(from 0deg, rgba(255, 197, 66, 0.55) 0deg 9deg, rgba(255, 248, 236, 0.08) 9deg 18deg);
		-webkit-mask: radial-gradient(circle, #000 0%, #000 18%, transparent 55%);
		mask: radial-gradient(circle, #000 0%, #000 18%, transparent 55%);
		animation: spin 8s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.stage { position: relative; display: grid; place-items: center; width: min(70vmin, 360px); aspect-ratio: 1; }
	.stage > * { grid-area: 1 / 1; }

	/* Anneau qui se vide en une seconde : le temps restant avant le chiffre suivant. */
	.ring { width: 100%; height: 100%; transform: rotate(-90deg); }
	.ring circle { fill: none; stroke-width: 9; stroke-linecap: round; }
	.ring .track { stroke: rgba(255, 248, 236, 0.25); }
	.ring .fill { stroke: var(--gold); stroke-dasharray: 339.3; stroke-dashoffset: 0; animation: drain 1s linear forwards; filter: drop-shadow(0 0 2px var(--ink)); }
	@keyframes drain {
		to { stroke-dashoffset: 339.3; }
	}

	/* Onde de choc à chaque seconde. */
	.shock { width: 62%; aspect-ratio: 1; border: 6px solid var(--white); border-radius: 50%; animation: shock 0.7s ease-out forwards; }
	@keyframes shock {
		from { transform: scale(0.6); opacity: 0.9; }
		to { transform: scale(1.7); opacity: 0; }
	}

	/* Pastille-sticker qui « tamponne » l'écran. */
	.badge {
		width: 62%;
		aspect-ratio: 1;
		display: grid;
		place-items: center;
		border: 7px solid var(--ink);
		border-radius: 50%;
		background: var(--paper);
		box-shadow: 10px 10px 0 var(--ink);
		animation: stamp 0.5s cubic-bezier(0.2, 1.6, 0.4, 1) both, wobble 1s ease-in-out 0.5s infinite;
	}
	@keyframes stamp {
		0% { transform: scale(2.2) rotate(-14deg); opacity: 0; }
		60% { opacity: 1; }
		100% { transform: scale(1) rotate(-4deg); }
	}
	@keyframes wobble {
		0%, 100% { transform: rotate(-4deg); }
		50% { transform: rotate(3deg); }
	}
	.digit {
		font: 700 clamp(110px, 32vmin, 190px)/1 var(--font-title);
		color: var(--gold);
		-webkit-text-stroke: 6px var(--ink);
		paint-order: stroke fill;
		text-shadow: 6px 6px 0 var(--ink);
		transform: translateY(4%);
	}

	/* Zéro : sticker « C'est parti » + confettis qui explosent depuis le centre. */
	.go {
		padding: 14px 26px;
		border: 6px solid var(--ink);
		border-radius: 20px;
		background: var(--green-dark);
		color: var(--white);
		box-shadow: 8px 8px 0 var(--ink);
		font: 700 clamp(34px, 9vmin, 60px)/1 var(--font-title);
		white-space: nowrap;
		animation: stamp-go 0.45s cubic-bezier(0.2, 1.6, 0.4, 1) both;
	}
	@keyframes stamp-go {
		0% { transform: scale(0.2) rotate(12deg); }
		100% { transform: scale(1) rotate(-5deg); }
	}
	.confetto {
		width: var(--s);
		height: calc(var(--s) * 0.6);
		background: var(--c);
		border: 2.5px solid var(--ink);
		border-radius: 3px;
		animation: blast 0.9s cubic-bezier(0.1, 0.8, 0.3, 1) var(--delay) both;
	}
	.confetto.round { height: var(--s); border-radius: 50%; }
	@keyframes blast {
		0% { transform: rotate(var(--a)) translateX(0) rotate(0deg) scale(0.3); opacity: 1; }
		100% { transform: rotate(var(--a)) translateX(var(--d)) rotate(540deg) scale(1); opacity: 0.95; }
	}
</style>
