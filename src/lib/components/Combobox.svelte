<script lang="ts">
	// Autocomplétion limitée à une liste (motif ARIA « combobox » + « listbox »). La valeur n'existe que
	// si une entrée de la liste est choisie : pas de texte libre, donc rien à corriger côté serveur.
	import { fold } from '$lib/text';

	type Item = { id: number; label: string };
	let {
		items,
		value = $bindable(null),
		id,
		label,
		placeholder = 'Tape un nom…',
		disabled = false
	}: { items: Item[]; value?: number | null; id: string; label: string; placeholder?: string; disabled?: boolean } = $props();

	const MAX = 8;
	let query = $state('');
	let open = $state(false);
	let active = $state(0);

	// Index replié une seule fois par liste (2 000 noms : pas de normalisation à chaque frappe).
	const folded = $derived(items.map((i) => ({ ...i, f: fold(i.label) })));
	const results = $derived.by(() => {
		const q = fold(query);
		if (!q) return folded.slice(0, MAX);
		const starts: Item[] = [];
		const contains: Item[] = [];
		for (const i of folded) {
			if (i.f.startsWith(q) || i.f.includes(` ${q}`)) starts.push(i);
			else if (i.f.includes(q)) contains.push(i);
			if (starts.length >= MAX) break;
		}
		return [...starts, ...contains].slice(0, MAX);
	});

	function pick(item: Item) {
		value = item.id;
		query = item.label;
		open = false;
	}

	function onInput() {
		open = true;
		active = 0;
		// Nom tapé en entier (casse et accents ignorés) : on le considère choisi.
		const exact = folded.find((i) => i.f === fold(query));
		value = exact ? exact.id : null;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			open = true;
			active = Math.min(active + 1, results.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = Math.max(active - 1, 0);
		} else if (e.key === 'Enter' && open && results[active]) {
			e.preventDefault(); // ne pas soumettre le formulaire en choisissant
			pick(results[active]);
		} else if (e.key === 'Escape') {
			open = false;
		}
	}
</script>

<div class="combo">
	<label for={id} class="hand">{label}</label>
	<div class="field-box" class:focus={open || value !== null}>
		<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
		<input
			{id}
			type="text"
			role="combobox"
			aria-expanded={open && results.length > 0}
			aria-controls="{id}-list"
			aria-autocomplete="list"
			aria-activedescendant={open && results[active] ? `${id}-opt-${results[active].id}` : undefined}
			autocomplete="off"
			autocapitalize="words"
			spellcheck="false"
			enterkeyhint="done"
			{placeholder}
			{disabled}
			bind:value={query}
			oninput={onInput}
			onfocus={() => (open = true)}
			onblur={() => (open = false)}
			onkeydown={onKeydown}
		/>
		{#if value !== null}<span class="chosen">choisi</span>{/if}
	</div>

	{#if open && !disabled}
		<ul id="{id}-list" role="listbox" aria-label={label}>
			{#each results as item, i (item.id)}
				<!-- La saisie reste au clavier dans l'input (flèches + Entrée) : le clic n'est qu'un raccourci souris/doigt. -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<li
					id="{id}-opt-{item.id}"
					role="option"
					aria-selected={i === active}
					class:active={i === active}
					onpointerdown={(e) => e.preventDefault()}
					onclick={() => pick(item)}
				>
					{item.label}
				</li>
			{:else}
				<li class="none" role="option" aria-selected="false" aria-disabled="true">personne avec ce nom… la réponse doit venir de la liste !</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.combo { position: relative; display: flex; flex-direction: column; gap: 8px; }
	label { font-size: 22px; }
	.field-box {
		display: flex; align-items: center; gap: 10px; min-height: 64px; padding: 0 18px;
		border: 4px solid var(--ink); border-radius: 18px; background: var(--white); box-shadow: 5px 5px 0 var(--ink);
	}
	.field-box.focus { box-shadow: 5px 5px 0 var(--gold), 5px 5px 0 3px var(--ink); }
	input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 14px 0; color: var(--ink); font: 500 22px var(--font-title); outline: none; }
	.chosen { padding: 4px 10px; border: 2.5px solid var(--ink); border-radius: 10px; background: var(--green); font-size: 13px; }
	ul {
		position: absolute; z-index: 5; top: 100%; left: 0; right: 0; margin: 10px 0 0; padding: 8px; list-style: none;
		border: 4px solid var(--ink); border-radius: 18px; background: var(--white); box-shadow: 6px 6px 0 var(--ink);
		max-height: 300px; overflow-y: auto;
	}
	li { min-height: 48px; padding: 12px 14px; border-radius: 12px; cursor: pointer; font: 500 18px var(--font-title); }
	li.active, li:hover { background: #ffe7a3; }
	li.none { cursor: default; font: 400 19px var(--font-hand); background: none; }

	@media (max-width: 500px) {
		.field-box { min-height: 58px; padding: 0 14px; border-width: 3.5px; box-shadow: 4px 4px 0 var(--ink); }
		input { font-size: 19px; }
		/* Sur téléphone la liste pousse le contenu plutôt que de le recouvrir (clavier ouvert, peu de place). */
		ul { position: static; margin: 0; }
	}
</style>
