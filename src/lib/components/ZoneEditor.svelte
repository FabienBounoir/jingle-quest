<script lang="ts">
	// Admin : dessiner la zone juste en glissant sur l'image (souris, stylet ou doigt).
	// Le rectangle est stocké en fractions de l'image, comme les clics des joueurs.
	type Rect = { x: number; y: number; w: number; h: number };
	let { src, rect = $bindable(null), disabled = false }: { src: string | null; rect?: Rect | null; disabled?: boolean } = $props();

	let start: { x: number; y: number } | null = null;
	const clamp = (v: number) => Math.min(1, Math.max(0, v));
	function pos(e: PointerEvent) {
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) };
	}
	function down(e: PointerEvent) {
		if (disabled) return;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		start = pos(e);
		rect = { ...start, w: 0, h: 0 };
	}
	function move(e: PointerEvent) {
		if (!start) return;
		const p = pos(e);
		rect = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
	}
	const up = () => (start = null);
	const r4 = (v: number | undefined) => (v === undefined ? '' : String(Math.round(v * 10000) / 10000));
</script>

<div class="zone-editor">
	{#if src}
		<div class="pic" class:disabled role="presentation" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
			<img {src} alt="Illustration de la question : glisse dessus pour dessiner la zone juste" draggable="false" />
			{#if rect && rect.w > 0 && rect.h > 0}
				<span class="rect" style:left="{rect.x * 100}%" style:top="{rect.y * 100}%" style:width="{rect.w * 100}%" style:height="{rect.h * 100}%"></span>
			{/if}
		</div>
		<p class="muted">
			{#if rect && rect.w >= 0.01 && rect.h >= 0.01}Zone de {Math.round(rect.w * 100)} % × {Math.round(rect.h * 100)} % de l'image. Glisse à nouveau pour la redessiner.{:else}Glisse sur l'image pour dessiner le rectangle de la bonne réponse.{/if}
		</p>
	{:else}
		<p class="notice error">Ajoute d'abord une image (à gauche) : la zone se dessine dessus.</p>
	{/if}
	<input type="hidden" name="zx" value={r4(rect?.x)} />
	<input type="hidden" name="zy" value={r4(rect?.y)} />
	<input type="hidden" name="zw" value={r4(rect?.w)} />
	<input type="hidden" name="zh" value={r4(rect?.h)} />
</div>

<style>
	.pic { position: relative; border: 3px solid var(--ink); border-radius: 14px; overflow: hidden; cursor: crosshair; touch-action: none; user-select: none; }
	.pic.disabled { cursor: not-allowed; }
	img { display: block; width: 100%; height: auto; -webkit-user-drag: none; pointer-events: none; }
	.rect { position: absolute; border: 3px dashed var(--ink); background: rgba(127, 209, 166, 0.45); box-shadow: 0 0 0 2px var(--white); }
	.muted { margin: 6px 0 0; }
</style>
