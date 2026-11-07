<script lang="ts">
	// Photo qui se dévoile : le joueur défloute lui-même, chaque niveau baisse ses points max. Le niveau
	// vit en base (action ?/unblur) ; en aperçu admin il reste local et rien n'est enregistré.
	import { enhance } from '$app/forms';
	import { BLUR_MULTIPLIERS, LAST_STAGE } from '$lib/blur';
	let {
		id,
		stage = $bindable(0),
		canUnblur,
		preview
	}: { id: number; stage?: number; canUnblur: boolean; preview: boolean } = $props();

	let busy = $state(false);
	const pct = (s: number) => Math.round(BLUR_MULTIPLIERS[s] * 100);
	const next = $derived(Math.min(stage + 1, LAST_STAGE));
</script>

<div class="blur">
	<img src="/img/q/{id}?stage={stage}" alt="Visuel de la question, flouté au niveau {stage + 1} sur {LAST_STAGE + 1}" />
	<p class="caption">
		<span class="dots" aria-hidden="true">{#each BLUR_MULTIPLIERS as _, i (i)}<i class:on={i <= stage}></i>{/each}</span>
		<span>points max : <strong>{pct(stage)} %</strong></span>
	</p>

	{#if canUnblur && stage < LAST_STAGE}
		{#if preview}
			<button type="button" class="btn secondary" onclick={() => (stage = next)}>Déflouter (aperçu) → {pct(next)} %</button>
		{:else}
			<form
				method="POST"
				action="?/unblur"
				use:enhance={() => {
					busy = true;
					return async ({ result }) => {
						if (result.type === 'success' && typeof result.data?.stage === 'number') stage = result.data.stage;
						busy = false;
					};
				}}
			>
				<button class="btn secondary" type="submit" disabled={busy}>Déflouter → points max {pct(next)} %</button>
			</form>
		{/if}
		<p class="muted">Définitif : chaque niveau de défloutage réduit les points d'une bonne réponse.</p>
	{/if}
</div>

<style>
	.blur { margin: 0; display: flex; flex-direction: column; gap: 10px; }
	img { width: 100%; max-height: 420px; object-fit: contain; border: 3.5px solid var(--ink); border-radius: 18px; background: var(--white); image-rendering: pixelated; }
	.caption { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 15px; }
	.dots { display: inline-flex; gap: 4px; }
	.dots i { width: 12px; height: 12px; border: 2.5px solid var(--ink); border-radius: 50%; background: var(--white); }
	.dots i.on { background: var(--gold); }
	form, .btn { align-self: flex-start; }
	.muted { margin: 0; }
</style>
