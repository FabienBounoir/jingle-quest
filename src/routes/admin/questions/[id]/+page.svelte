<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Notice from '$lib/components/Notice.svelte';
	import { dayLabel } from '$lib/dates';
	let { data, form } = $props();

	const q = $derived(data.question);
	// État du formulaire initialisé une fois depuis le load : il ne doit pas se réinitialiser après un
	// save. (Aucun lien ne mène directement d'une question à une autre, donc pas de réutilisation du
	// composant avec une autre question.)
	// svelte-ignore state_referenced_locally
	let listId = $state(data.question?.listId ?? data.lists[0]?.id ?? 0);
	// svelte-ignore state_referenced_locally
	let selected = $state<number[]>(data.question?.correct ?? []);
	let filter = $state('');

	const list = $derived(data.lists.find((l) => l.id === listId));
	const labelOf = $derived(new Map(list?.items.map((i) => [i.id, i.label]) ?? []));
	const hits = $derived.by(() => {
		const f = filter.trim().toLocaleLowerCase('fr');
		const items = list?.items ?? [];
		return f ? items.filter((i) => i.label.toLocaleLowerCase('fr').includes(f)) : items;
	});
	const shown = $derived(hits.slice(0, 150));

	function changeList(id: number) {
		listId = id;
		// Revenir sur la liste d'origine restaure ses bonnes réponses ; une autre liste repart de zéro.
		selected = id === data.question?.listId ? [...data.question.correct] : [];
	}
	const toggle = (id: number) => (selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
	const locked = $derived((q?.answered ?? 0) > 0);
</script>

<div class="row">
	<a href="/admin/questions" class="back">← Questions</a>
</div>
<h1 class="title-on-bg">{q ? 'Préparer le cadeau' : 'Nouvelle quête'}</h1>

{#if page.url.searchParams.has('created') && !form}<p class="notice ok" role="status">Quête créée !</p>{/if}
<Notice {form} />

{#if data.lists.length === 0}
	<section class="card stack">
		<p>Il faut d'abord une liste de réponses (par exemple « Collaborateurs »).</p>
		<a class="btn" href="/admin/listes">Créer une liste</a>
	</section>
{:else}
	<form method="POST" action="?/save" enctype="multipart/form-data" use:enhance={() => ({ update }) => update({ reset: false })} class="cols">
		<section class="card stack main-col" aria-label="Contenu de la question">
			<div class="grid2">
				<label class="field">
					<span>jour</span>
					<select name="day" value={data.prefillDay}>
						<option value="">— pas encore de jour —</option>
						{#each data.days as d (d.date)}
							<option value={d.date}>{dayLabel(d.date)} · {d.time}{d.excluded ? ' (exclu)' : ''}</option>
						{/each}
					</select>
				</label>
				{#if data.days.length === 0}
					<p class="muted">Aucune case libre : génère le calendrier dans <a href="/admin/reglages">Réglages</a>.</p>
				{/if}
			</div>

			<label class="field">
				<span>la question</span>
				<textarea name="text" rows="3" maxlength="500" required placeholder="Quel collaborateur a…">{q?.text ?? ''}</textarea>
			</label>

			<div class="field">
				<span>une image ? (optionnel)</span>
				<div class="row">
					{#if q?.hasImage}<img src="/img/q/{q.id}" alt="Visuel actuel de la question" class="thumb" />{/if}
					<input type="file" name="image" accept="image/png,image/jpeg,image/webp,image/gif" />
					{#if q?.hasImage}<label class="check"><input type="checkbox" name="removeImage" /> retirer l'image</label>{/if}
				</div>
				<p class="muted">JPG, PNG, WebP ou GIF, 2 Mo maximum. Visible par les joueurs seulement à l'ouverture.</p>
			</div>

			<div class="field">
				<span id="list-label">réponses possibles depuis la liste…</span>
				<div class="row" role="radiogroup" aria-labelledby="list-label">
					{#each data.lists as l (l.id)}
						<button type="button" role="radio" aria-checked={l.id === listId} class="btn small {l.id === listId ? '' : 'secondary'}" disabled={locked && l.id !== listId} onclick={() => changeList(l.id)}>
							{l.name} · {l.items.length}
						</button>
					{/each}
					<a href="/admin/listes" class="hand">+ gérer les listes</a>
				</div>
				<input type="hidden" name="listId" value={listId} />
			</div>
		</section>

		<section class="card stack side-col" aria-labelledby="ok-title">
			<div>
				<h2 id="ok-title">Bonnes réponses</h2>
				<p class="hand" style="margin: 0">coche une ou plusieurs valeurs de « {list?.name} »</p>
			</div>

			<div class="row chips">
				{#each selected as id (id)}
					<input type="hidden" name="correct" value={id} />
					<span class="chip">
						{labelOf.get(id)}
						<button type="button" aria-label="Retirer {labelOf.get(id)}" disabled={locked} onclick={() => toggle(id)}>✕</button>
					</span>
				{:else}
					<span class="hand" style="color: var(--red-ink)">il faut au moins une bonne réponse !</span>
				{/each}
			</div>

			{#if locked}
				<p class="notice error">{q?.answered} joueur(s) ont déjà répondu : la liste et les bonnes réponses sont figées.</p>
			{:else if list && list.items.length === 0}
				<p>Cette liste est vide. <a href="/admin/listes/{list.id}">Ajoute des valeurs</a>.</p>
			{:else}
				<input type="search" bind:value={filter} placeholder="Filtrer…" aria-label="Filtrer les valeurs" />
				<ul class="items">
					{#each shown as item (item.id)}
						<li>
							<label class="check item" class:on={selected.includes(item.id)}>
								<input type="checkbox" checked={selected.includes(item.id)} onchange={() => toggle(item.id)} />
								{item.label}
							</label>
						</li>
					{/each}
				</ul>
				{#if hits.length > shown.length}<p class="muted">{hits.length - shown.length} de plus : affine le filtre.</p>{/if}
			{/if}
		</section>

		<div class="actions">
			<button class="btn big" type="submit" disabled={selected.length === 0}>Enregistrer</button>
		</div>
	</form>

	{#if q}
		<form method="POST" action="?/delete" use:enhance class="card row danger-zone">
			<label class="check"><input type="checkbox" required /> je veux supprimer cette quête</label>
			<button class="btn danger small" type="submit" disabled={locked}>Supprimer</button>
		</form>
	{/if}
{/if}

<style>
	.back { color: var(--white); font-family: var(--font-hand); font-size: 20px; }
	h1 { font-size: clamp(30px, 6vw, 40px); }
	h2 { font-size: 22px; }
	.cols { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
	.main-col { flex: 3 1 420px; min-width: 0; }
	.side-col { flex: 2 1 300px; min-width: 0; background: var(--white); transform: rotate(0.6deg); }
	.actions { flex: 1 1 100%; }
	.thumb { max-height: 90px; border: 3px solid var(--ink); border-radius: 12px; }
	.chips { min-height: 40px; }
	.chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 6px 4px 12px; border: 3px solid var(--ink); border-radius: 999px; background: var(--green); font-family: var(--font-title); font-weight: 600; }
	.chip button { width: 28px; height: 28px; border: 0; border-radius: 50%; background: transparent; cursor: pointer; font-weight: 700; }
	.items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; max-height: 380px; overflow-y: auto; }
	.item { padding: 6px 12px; border: 2.5px solid #e2d8c8; border-radius: 12px; font-family: var(--font-title); font-weight: 500; }
	.item.on { border-color: var(--ink); background: #e3f6eb; }
	.danger-zone { justify-content: space-between; padding: 14px 20px; }
</style>
