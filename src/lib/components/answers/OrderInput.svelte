<script lang="ts">
	// Remettre dans l'ordre : flèches ↑ ↓ (fiables au doigt et au clavier, contrairement au glisser-déposer).
	import { flip } from 'svelte/animate';
	let { items, ready = $bindable(false) }: { items: string[]; ready?: boolean } = $props();
	// svelte-ignore state_referenced_locally
	let order = $state(items.map((_, i) => i)); // indices de `items`, dans l'ordre choisi par le joueur
	let touched = $state(false);
	$effect(() => {
		ready = touched; // il faut au moins avoir bougé un élément : valider l'ordre affiché par défaut n'a pas de sens
	});
	function move(pos: number, delta: number) {
		const to = pos + delta;
		if (to < 0 || to >= order.length) return;
		const next = [...order];
		[next[pos], next[to]] = [next[to], next[pos]];
		order = next;
		touched = true;
	}
</script>

<div class="order">
	<p class="hand label" id="order-label">classe du premier au dernier :</p>
	<ol aria-labelledby="order-label">
		{#each order as idx, pos (idx)}
			<li animate:flip={{ duration: 200 }}>
				<span class="rank">{pos + 1}</span>
				<span class="txt">{items[idx]}</span>
				<button type="button" class="arrow" aria-label="Monter « {items[idx]} »" disabled={pos === 0} onclick={() => move(pos, -1)}>↑</button>
				<button type="button" class="arrow" aria-label="Descendre « {items[idx]} »" disabled={pos === order.length - 1} onclick={() => move(pos, 1)}>↓</button>
			</li>
		{/each}
	</ol>
	<input type="hidden" name="order" value={order.join(',')} />
	<p class="muted">Points selon le nombre d'éléments à la bonne place.</p>
</div>

<style>
	.label { margin: 0 0 8px; font-size: 22px; }
	ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
	li { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 3.5px solid var(--ink); border-radius: 16px; background: var(--white); box-shadow: 4px 4px 0 var(--ink); }
	.rank { width: 36px; height: 36px; flex: none; border: 3px solid var(--ink); border-radius: 50%; background: var(--gold); display: flex; align-items: center; justify-content: center; font: 700 17px var(--font-title); }
	.txt { flex: 1; min-width: 0; font: 600 18px var(--font-title); }
	.arrow { width: 44px; height: 44px; flex: none; border: 3px solid var(--ink); border-radius: 12px; background: var(--paper); font: 700 20px var(--font-title); cursor: pointer; }
	.arrow:disabled { opacity: 0.3; cursor: default; }
	.muted { margin: 8px 0 0; }
</style>
