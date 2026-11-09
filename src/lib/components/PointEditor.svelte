<script lang="ts">
	// Admin : placer un point sur l'image d'un clic (point de départ du zoom, cible de « viser juste »).
	// Envoie aussi les proportions de l'image (`ratio`), pour mesurer les distances en vraies proportions.
	type Point = { x: number; y: number };
	let { src, point = $bindable(null), disabled = false, hint }: { src: string | null; point?: Point | null; disabled?: boolean; hint: string } = $props();
	let ratio = $state<number | null>(null);
	let img = $state<HTMLImageElement>();
	const measure = () => {
		if (img?.naturalWidth) ratio = img.naturalHeight / img.naturalWidth;
	};
	// Image déjà chargée avant l'hydratation (rendu serveur, cache) : onload ne se déclenchera pas.
	$effect(() => {
		if (img?.complete) measure();
	});
	const clamp = (v: number) => Math.min(1, Math.max(0, v));
	function place(e: MouseEvent) {
		if (disabled) return;
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		point = { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) };
	}
	const r4 = (v: number | null | undefined) => (v == null ? '' : String(Math.round(v * 10000) / 10000));
</script>

{#if src}
	<button type="button" class="pic" class:disabled onclick={place} aria-label={hint}>
		<img {src} alt="" draggable="false" bind:this={img} onload={measure} />
		{#if point}<span class="pt" style:left="{point.x * 100}%" style:top="{point.y * 100}%" aria-hidden="true"></span>{/if}
	</button>
	<p class="muted">{point ? 'Point placé : reclique pour le déplacer.' : hint}</p>
{:else}
	<p class="notice error">Ajoute d'abord une image : le point se place dessus.</p>
{/if}
<input type="hidden" name="px" value={r4(point?.x)} />
<input type="hidden" name="py" value={r4(point?.y)} />
<input type="hidden" name="ratio" value={r4(ratio)} />

<style>
	.pic { position: relative; display: block; width: 100%; padding: 0; border: 3px solid var(--ink); border-radius: 14px; overflow: hidden; background: var(--white); cursor: crosshair; }
	.pic.disabled { cursor: not-allowed; }
	img { display: block; width: 100%; height: auto; -webkit-user-drag: none; }
	.pt { position: absolute; width: 28px; height: 28px; margin: -14px 0 0 -14px; border: 4px solid var(--ink); border-radius: 50%; background: rgba(127, 209, 166, 0.6); box-shadow: 0 0 0 3px var(--white); pointer-events: none; }
	.muted { margin: 6px 0 0; }
</style>
