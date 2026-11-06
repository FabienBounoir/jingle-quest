<script lang="ts">
	// Associer : pour chaque élément de gauche, un menu déroulant (natif, donc confortable au doigt) avec
	// les éléments de droite. Chaque élément de droite ne sert qu'une fois.
	let { left, right, ready = $bindable(false) }: { left: string[]; right: string[]; ready?: boolean } = $props();
	// svelte-ignore state_referenced_locally
	let picks = $state<string[]>(left.map(() => ''));
	const used = $derived(picks.filter((p) => p !== ''));
	const dup = $derived(new Set(used).size !== used.length);
	$effect(() => {
		ready = used.length === left.length && !dup;
	});
</script>

<fieldset class="match">
	<legend class="hand">associe chaque élément :</legend>
	{#each left as l, i (i)}
		<div class="row-m">
			<label for="pair-{i}" class="l">{l}</label>
			<span class="arrow" aria-hidden="true">→</span>
			<select id="pair-{i}" name="pair" bind:value={picks[i]} class:taken={picks[i] !== '' && picks.filter((p) => p === picks[i]).length > 1}>
				<option value="">— choisir —</option>
				{#each right as r, j (j)}
					<option value={String(j)}>{r}</option>
				{/each}
			</select>
		</div>
	{/each}
	{#if dup}<p class="notice error">Un élément de droite est choisi deux fois.</p>{/if}
	<p class="muted">Points selon le nombre de paires justes.</p>
</fieldset>

<style>
	.match { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
	legend { font-size: 22px; padding: 0; margin-bottom: 8px; }
	.row-m { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1.2fr); align-items: center; gap: 10px; padding: 8px 10px; border: 3.5px solid var(--ink); border-radius: 16px; background: var(--white); box-shadow: 4px 4px 0 var(--ink); }
	.l { font: 600 18px var(--font-title); }
	.arrow { font: 700 20px var(--font-title); }
	select { min-height: 48px; }
	select.taken { border-color: var(--red-ink); background: #ffe3de; }
	.muted { margin: 0; }
	@media (max-width: 500px) {
		.row-m { grid-template-columns: 1fr; gap: 6px; }
		.arrow { display: none; }
	}
</style>
