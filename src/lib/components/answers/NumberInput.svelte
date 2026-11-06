<script lang="ts">
	// Estimation : un nombre (virgule et espaces acceptés, comme sur un clavier français).
	let { unit, ready = $bindable(false) }: { unit: string; ready?: boolean } = $props();
	let raw = $state('');
	$effect(() => {
		const t = raw.trim().replace(',', '.').replace(/\s/g, '');
		ready = t !== '' && Number.isFinite(Number(t));
	});
</script>

<div class="field">
	<label for="value" class="hand">ton estimation :</label>
	<div class="box">
		<input id="value" name="value" type="text" inputmode="decimal" autocomplete="off" placeholder="ex. 1 250" bind:value={raw} />
		{#if unit}<span class="unit">{unit}</span>{/if}
	</div>
	<p class="muted">Pile (à 1 % près) = tous les points · à 10 % = 70 % · à 25 % = 40 %</p>
</div>

<style>
	label { font-size: 22px; }
	.box { display: flex; align-items: center; gap: 10px; min-height: 64px; padding: 0 18px; border: 4px solid var(--ink); border-radius: 18px; background: var(--white); box-shadow: 5px 5px 0 var(--ink); }
	input { flex: 1; min-width: 0; border: 0 !important; background: transparent; font: 600 26px var(--font-title) !important; padding: 12px 0 !important; outline: none; box-shadow: none; }
	.unit { font: 500 20px var(--font-title); }
	.muted { margin: 6px 0 0; }
</style>
