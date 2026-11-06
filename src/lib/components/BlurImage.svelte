<script lang="ts">
	// Photo qui se dévoile : l'URL change à chaque étape (calculée ici sur l'horloge du serveur), le
	// serveur décide de toute façon de la version qu'il renvoie.
	import { serverClock } from '$lib/clock.svelte';
	let { id, opensAt, minutes, serverNow, ended }: { id: number; opensAt: number; minutes: number; serverNow: number; ended: boolean } = $props();
	const STAGES = 6;
	// svelte-ignore state_referenced_locally
	const clock = serverClock(serverNow);
	const step = $derived((minutes * 60_000) / (STAGES - 1));
	const elapsed = $derived(clock.now - opensAt);
	const stage = $derived(ended ? STAGES - 1 : elapsed <= 0 ? 0 : Math.min(STAGES - 1, Math.floor(elapsed / step)));
	const sharpIn = $derived(Math.max(0, Math.ceil((minutes * 60_000 - elapsed) / 60_000)));
</script>

<figure class="blur">
	<img src="/img/q/{id}?stage={stage}" alt="Visuel de la question, de plus en plus net avec le temps" />
	<figcaption>
		<span class="dots" aria-hidden="true">{#each Array(STAGES) as _, i (i)}<i class:on={i <= stage}></i>{/each}</span>
		{#if stage < STAGES - 1}la photo se précise… nette dans {sharpIn} min{:else}photo nette !{/if}
	</figcaption>
</figure>

<style>
	.blur { margin: 0; display: flex; flex-direction: column; gap: 8px; }
	img { width: 100%; max-height: 420px; object-fit: contain; border: 3.5px solid var(--ink); border-radius: 18px; background: var(--white); image-rendering: pixelated; }
	figcaption { display: flex; align-items: center; gap: 10px; font: 400 19px var(--font-hand); }
	.dots { display: inline-flex; gap: 4px; }
	.dots i { width: 12px; height: 12px; border: 2.5px solid var(--ink); border-radius: 50%; background: var(--white); }
	.dots i.on { background: var(--gold); }
</style>
