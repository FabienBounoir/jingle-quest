<script lang="ts">
	import { enhance } from '$app/forms';
	import Notice from '$lib/components/Notice.svelte';
	let { data, form } = $props();

	let filter = $state('');
	const hits = $derived.by(() => {
		const q = filter.trim().toLocaleLowerCase('fr');
		return q ? data.items.filter((i) => i.label.toLocaleLowerCase('fr').includes(q)) : data.items;
	});
	// ponytail: 200 lignes affichées, le filtre sert pour les grosses listes (2 000 collaborateurs).
	const shown = $derived(hits.slice(0, 200));
</script>

<div class="row">
	<a href="/admin/listes" class="back">← Listes</a>
</div>
<h1 class="title-on-bg">{data.list.name}</h1>

<Notice {form} />

<div class="cols">
	<section class="card stack" aria-labelledby="add-title">
		<h2 id="add-title">Ajouter des valeurs</h2>
		<form method="POST" action="?/add" enctype="multipart/form-data" use:enhance class="stack">
			<label class="field">
				<span>une valeur par ligne</span>
				<textarea name="values" rows="6" placeholder={'Julien Robert\nInès Garnier\n…'}></textarea>
			</label>
			<label class="field">
				<span>ou un fichier CSV (1re colonne)</span>
				<input type="file" name="csv" accept=".csv,.txt,text/csv,text/plain" />
			</label>
			<label class="check"><input type="checkbox" name="header" checked /> la 1re ligne du fichier est un en-tête</label>
			<button class="btn" type="submit">Ajouter</button>
		</form>
		<p class="muted">Les doublons sont ignorés, même avec une casse différente.</p>

		<hr />
		<form method="POST" action="?/rename" use:enhance class="row">
			<label class="field" style="flex: 1 1 180px">
				<span>renommer</span>
				<input type="text" name="name" value={data.list.name} maxlength="60" required />
			</label>
			<button class="btn secondary small" type="submit" style="align-self: flex-end">Renommer</button>
		</form>
		<form method="POST" action="?/deleteList" use:enhance>
			<button class="btn danger small" type="submit" disabled={data.questionCount > 0}>Supprimer la liste</button>
			{#if data.questionCount > 0}<p class="muted">Utilisée par {data.questionCount} question(s) : impossible de la supprimer.</p>{/if}
		</form>
	</section>

	<section class="card stack" aria-labelledby="items-title">
		<div class="row">
			<h2 id="items-title">Valeurs</h2>
			<span class="pill gold">{data.items.length}</span>
		</div>
		<input type="search" bind:value={filter} placeholder="Filtrer…" aria-label="Filtrer les valeurs" />
		{#if data.items.length === 0}
			<p class="hand">liste vide : ajoute des valeurs à gauche.</p>
		{:else}
			<ul class="list-rows">
				{#each shown as item (item.id)}
					<li>
						<span style="flex: 1">{item.label}</span>
						<form method="POST" action="?/deleteItem" use:enhance>
							<input type="hidden" name="itemId" value={item.id} />
							<button class="btn secondary small" type="submit" aria-label="Supprimer {item.label}">✕</button>
						</form>
					</li>
				{/each}
			</ul>
			{#if hits.length > shown.length}
				<p class="muted">{hits.length - shown.length} de plus : affine le filtre.</p>
			{/if}
		{/if}
	</section>
</div>

<style>
	.back { color: var(--white); font-family: var(--font-hand); font-size: 20px; }
	h1 { font-size: clamp(30px, 6vw, 40px); }
	h2 { font-size: 22px; }
	.cols { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
	.cols > section { flex: 1 1 320px; min-width: 0; }
	hr { width: 100%; border: 0; border-top: 3px dashed var(--ink); margin: 4px 0; }
	.list-rows { max-height: 560px; overflow-y: auto; }
</style>
