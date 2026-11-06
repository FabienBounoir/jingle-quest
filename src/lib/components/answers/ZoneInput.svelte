<script lang="ts">
	// Zone : un clic (ou un tap) sur l'image pose une cible ; on peut recliquer pour la déplacer.
	// Coordonnées en fractions de l'image : indépendantes de la taille d'écran.
	let { src, ready = $bindable(false) }: { src: string; ready?: boolean } = $props();
	let point = $state<{ x: number; y: number } | null>(null);
	$effect(() => {
		ready = point !== null;
	});
	function place(e: MouseEvent) {
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		point = { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
	}
</script>

<div class="zone">
	<p class="hand label">clique au bon endroit sur l'image :</p>
	<!-- Question visuelle par nature : le bouton couvre l'image pour être atteignable au clavier, mais le choix se fait au pointeur. -->
	<button type="button" class="pic" onclick={place} aria-label="Image de la question : clique sur la zone demandée">
		<img {src} alt="" draggable="false" />
		{#if point}<span class="target" style:left="{point.x * 100}%" style:top="{point.y * 100}%" aria-hidden="true"></span>{/if}
	</button>
	<input type="hidden" name="x" value={point?.x ?? ''} />
	<input type="hidden" name="y" value={point?.y ?? ''} />
	<p class="muted">{point ? 'Cible posée : reclique pour la déplacer.' : 'Aucune cible posée.'}</p>
</div>

<style>
	.label { margin: 0 0 8px; font-size: 22px; }
	.pic { position: relative; display: block; width: 100%; padding: 0; border: 3.5px solid var(--ink); border-radius: 18px; overflow: hidden; background: var(--white); cursor: crosshair; }
	img { display: block; width: 100%; height: auto; user-select: none; -webkit-user-drag: none; }
	.target { position: absolute; width: 34px; height: 34px; margin: -17px 0 0 -17px; border: 4px solid var(--ink); border-radius: 50%; background: rgba(255, 197, 66, 0.55); box-shadow: 0 0 0 4px var(--white); pointer-events: none; }
	.target::after { content: ''; position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%; background: var(--ink); }
	.muted { margin: 6px 0 0; }
</style>
