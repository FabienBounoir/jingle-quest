<script lang="ts">
	// QCM : boutons radio stylés en grosses cartes (un vrai radiogroup, au clavier avec les flèches).
	let { options, ready = $bindable(false) }: { options: string[]; ready?: boolean } = $props();
	let picked = $state<number | null>(null);
	$effect(() => {
		ready = picked !== null;
	});
	const LETTERS = 'ABCDEF';
</script>

<fieldset class="choices">
	<legend class="hand">ta réponse :</legend>
	{#each options as opt, i (i)}
		<label class="opt" class:on={picked === i}>
			<input type="radio" name="choice" value={i} bind:group={picked} />
			<span class="letter" aria-hidden="true">{LETTERS[i]}</span>
			<span class="txt">{opt}</span>
		</label>
	{/each}
</fieldset>

<style>
	.choices { border: 0; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
	legend { font-size: 22px; margin-bottom: 8px; padding: 0; }
	.opt { display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 10px 14px; border: 3.5px solid var(--ink); border-radius: 16px; background: var(--white); box-shadow: 4px 4px 0 var(--ink); cursor: pointer; font: 600 18px var(--font-title); transition: transform 0.08s; }
	.opt:hover { transform: translateY(-2px); }
	.opt.on { background: var(--gold); }
	.opt:focus-within { outline: 4px solid var(--gold); outline-offset: 3px; }
	input { position: absolute; opacity: 0; width: 1px; height: 1px; }
	.letter { width: 34px; height: 34px; flex: none; border: 3px solid var(--ink); border-radius: 50%; background: var(--paper); display: flex; align-items: center; justify-content: center; font-size: 16px; }
</style>
