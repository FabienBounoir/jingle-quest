<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Notice from '$lib/components/Notice.svelte';
	import ZoneEditor from '$lib/components/ZoneEditor.svelte';
	import { dayLabel } from '$lib/dates';
	let { data, form } = $props();

	const TYPES = [
		{ id: 'list', label: 'Liste', hint: 'autocomplétion dans une liste (collaborateurs, projets…)' },
		{ id: 'choice', label: 'QCM', hint: '2 à 6 propositions à cliquer' },
		{ id: 'number', label: 'Estimation', hint: 'un nombre, points selon la proximité' },
		{ id: 'order', label: 'Ordre', hint: '3 à 5 éléments à remettre dans l’ordre' },
		{ id: 'zone', label: 'Zone', hint: 'cliquer au bon endroit sur l’image' },
		{ id: 'match', label: 'Associer', hint: '3 à 5 paires à relier' },
		{ id: 'blur', label: 'Photo floue', hint: 'une photo pixellisée que le joueur défloute en perdant des points ; réponse dans une liste' }
	] as const;

	const q = $derived(data.question);
	// État du formulaire initialisé une fois depuis le load : il ne doit pas se réinitialiser après un
	// save. (Aucun lien ne mène directement d'une question à une autre, donc pas de réutilisation du
	// composant avec une autre question.)
	// svelte-ignore state_referenced_locally
	let listId = $state(data.question?.listId ?? data.lists[0]?.id ?? 0);
	// svelte-ignore state_referenced_locally
	let selected = $state<number[]>(data.question?.correct ?? []);
	let filter = $state('');

	// Autres types : état initialisé depuis la config et la solution enregistrées.
	type Cfg = { options?: string[]; unit?: string; items?: string[]; left?: string[]; right?: string[] };
	type Sol = { correct?: number; value?: number; order?: number[]; pairs?: number[]; x?: number; y?: number; w?: number; h?: number };
	// svelte-ignore state_referenced_locally
	const cfg0 = (data.question?.config ?? {}) as Cfg;
	// svelte-ignore state_referenced_locally
	const sol0 = (data.question?.solution ?? {}) as Sol;
	// svelte-ignore state_referenced_locally
	let type = $state(data.question?.type ?? 'list');
	const pad = (a: string[], n: number) => [...a, ...Array(Math.max(0, n - a.length)).fill('')];
	let options = $state(pad(cfg0.options ?? [], 6));
	let correctChoice = $state<number | null>(sol0.correct ?? null);
	let numberValue = $state(sol0.value !== undefined ? String(sol0.value) : '');
	let unit = $state(cfg0.unit ?? '');
	// Les éléments sont saisis dans le BON ordre ; le serveur les mélange pour l'affichage joueur.
	let orderItems = $state(pad(sol0.order && cfg0.items ? sol0.order.map((i) => cfg0.items![i]) : [], 5));
	// Associer : saisi par paires (gauche → droite), le serveur mélange la colonne de droite.
	let matchLeft = $state(pad(cfg0.left ?? [], 5));
	let matchRight = $state(pad(cfg0.left && cfg0.right && sol0.pairs ? cfg0.left.map((_, i) => cfg0.right![sol0.pairs![i]]) : [], 5));
	let zone = $state(sol0.x !== undefined ? { x: sol0.x, y: sol0.y!, w: sol0.w!, h: sol0.h! } : null);
	let newImage = $state<string | null>(null);
	const imageSrc = $derived(newImage ?? (data.question?.hasImage ? `/img/q/${data.question.id}` : null));
	function pickImage(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0];
		if (newImage) URL.revokeObjectURL(newImage);
		newImage = f ? URL.createObjectURL(f) : null;
		if (f && type === 'zone') zone = null; // nouvelle image : la zone est à redessiner
	}
	const listLike = $derived(type === 'list' || type === 'blur');
	const canSave = $derived(!listLike || selected.length > 0);


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

<form method="POST" action="?/save" enctype="multipart/form-data" use:enhance={() => ({ update }) => update({ reset: false })} class="cols">
		<section class="card stack main-col" aria-label="Contenu de la question">
			<fieldset class="types">
				<legend class="hand">type de question</legend>
				<div class="row">
					{#each TYPES as t (t.id)}
						<label class="type" class:on={type === t.id} title={t.hint}>
							<input type="radio" name="type" value={t.id} bind:group={type} disabled={locked && type !== t.id} />
							{t.label}
						</label>
					{/each}
				</div>
				<p class="muted">{TYPES.find((t) => t.id === type)?.hint}</p>
			</fieldset>

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
				<span>{type === 'zone' || type === 'blur' ? 'l’image (obligatoire)' : 'une image ? (optionnel)'}</span>
				<div class="row">
					{#if imageSrc && type !== 'zone'}<img src={imageSrc} alt="Visuel actuel de la question" class="thumb" />{/if}
					<input type="file" name="image" accept="image/png,image/jpeg,image/webp,image/gif" onchange={pickImage} disabled={locked && (type === 'zone' || type === 'blur')} />
					{#if q?.hasImage && type !== 'zone' && type !== 'blur'}<label class="check"><input type="checkbox" name="removeImage" /> retirer l'image</label>{/if}
				</div>
				<p class="muted">JPG, PNG, WebP ou GIF, 2 Mo maximum. Visible par les joueurs seulement à l'ouverture.</p>
			</div>

			{#if type === 'blur'}
				<p class="notice ok">
					La photo démarre très pixellisée : chaque joueur peut la déflouter lui-même, au prix de points.
					11 niveaux : les premiers clics coûtent 5 %, puis de plus en plus (100 → 95 → 90 → 85 → 78 → 70 → 60 → 50 → 40 → 30 %), et la photo n'est nette qu'au dernier (20 %).
				</p>
			{/if}
			{#if listLike}
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
	{/if}
		</section>

		<section class="card stack side-col" aria-labelledby="ok-title">
			{#if locked}
				<p class="notice error">{q?.answered} joueur(s) ont déjà répondu : le type et la solution sont figés.</p>
			{/if}
			{#if listLike}
			{#if data.lists.length === 0}
				<h2 id="ok-title">Bonnes réponses</h2>
				<p>Il faut d'abord une liste de réponses (par exemple « Collaborateurs »).</p>
				<a class="btn" href="/admin/listes">Créer une liste</a>
			{:else}
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
				<!-- figé : message plus haut -->
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
			{/if}
			{:else if type === 'choice'}
				<h2 id="ok-title">Propositions</h2>
				<p class="hand" style="margin: 0">2 à 6, et coche la bonne</p>
				<!-- Figé : les boutons radio sont désactivés et un champ désactivé n'est pas envoyé ; sans ce champ
				     caché, corriger une coquille dans le texte serait refusé (« coche la bonne proposition »). -->
				{#if locked && correctChoice !== null}<input type="hidden" name="correct" value={correctChoice} />{/if}
				{#each options as _, i (i)}
					<div class="opt-row">
						<input type="radio" name="correct" value={i} bind:group={correctChoice} aria-label="Proposition {i + 1} est la bonne réponse" disabled={locked} />
						<input type="text" name="option" bind:value={options[i]} maxlength="120" placeholder="Proposition {i + 1}{i < 2 ? '' : ' (optionnelle)'}" aria-label="Proposition {i + 1}" readonly={locked} />
					</div>
				{/each}
				<p class="muted">Laisse vides les lignes en trop. Elles seront mélangées à l'enregistrement (même ordre pour tous les joueurs) : la position de la bonne réponse ne trahit rien.</p>
			{:else if type === 'number'}
				<h2 id="ok-title">Bonne valeur</h2>
				<div class="grid2">
					<label class="field"><span>valeur exacte</span><input type="text" name="value" inputmode="decimal" bind:value={numberValue} placeholder="ex. 12 500" readonly={locked} /></label>
					<label class="field"><span>unité (optionnel)</span><input type="text" name="unit" bind:value={unit} maxlength="20" placeholder="cafés, km, €…" readonly={locked} /></label>
				</div>
				<p class="muted">Points : pile (à 1 % près) = 100 %, à 10 % = 70 %, à 25 % = 40 %, au-delà = 0.</p>
			{:else if type === 'order'}
				<h2 id="ok-title">Le bon ordre</h2>
				<p class="hand" style="margin: 0">saisis 3 à 5 éléments, du premier au dernier</p>
				{#each orderItems as _, i (i)}
					<div class="opt-row">
						<span class="rank">{i + 1}</span>
						<input type="text" name="item" bind:value={orderItems[i]} maxlength="120" placeholder="Élément {i + 1}{i < 3 ? '' : ' (optionnel)'}" aria-label="Élément en position {i + 1}" readonly={locked} />
					</div>
				{/each}
				<p class="muted">Les joueurs les verront mélangés. Points selon le nombre d'éléments à la bonne place.</p>
			{:else if type === 'match'}
				<h2 id="ok-title">Les paires</h2>
				<p class="hand" style="margin: 0">3 à 5 paires justes, la colonne de droite sera mélangée</p>
				{#each matchLeft as _, i (i)}
					<div class="opt-row pair">
						<input type="text" name="left" bind:value={matchLeft[i]} maxlength="120" placeholder="Gauche {i + 1}{i < 3 ? '' : ' (opt.)'}" aria-label="Élément de gauche {i + 1}" readonly={locked} />
						<span aria-hidden="true">→</span>
						<input type="text" name="right" bind:value={matchRight[i]} maxlength="120" placeholder="Droite {i + 1}{i < 3 ? '' : ' (opt.)'}" aria-label="Élément associé à gauche {i + 1}" readonly={locked} />
					</div>
				{/each}
				<p class="muted">Points selon le nombre de paires justes.</p>
			{:else if type === 'zone'}
				<h2 id="ok-title">La bonne zone</h2>
				<ZoneEditor src={imageSrc} bind:rect={zone} disabled={locked} />
			{/if}
		</section>

		<div class="actions row">
			<button class="btn big" type="submit" disabled={!canSave}>Enregistrer</button>
			{#if q?.day}
				<!-- Avant l'ouverture, la page joueur passe en aperçu pour un admin : réponse testée, jamais enregistrée. -->
				<a class="btn secondary" href="/jour/{q.day}">Tester en aperçu</a>
			{/if}
		</div>
	</form>

{#if q}
	<form method="POST" action="?/delete" use:enhance class="card row danger-zone">
		<label class="check"><input type="checkbox" required /> je veux supprimer cette quête</label>
		<button class="btn danger small" type="submit" disabled={locked}>Supprimer</button>
	</form>
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
	.types { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
	.types legend { font-size: 20px; padding: 0; margin-bottom: 4px; }
	.type { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 16px; border: 3px solid var(--ink); border-radius: 999px; background: var(--white); font: 600 16px var(--font-title); cursor: pointer; }
	.type.on { background: var(--gold); box-shadow: 0 3px 0 var(--ink); }
	.type:focus-within { outline: 4px solid var(--gold); outline-offset: 2px; }
	.type input { position: absolute; opacity: 0; width: 1px; height: 1px; }
	.opt-row { display: flex; align-items: center; gap: 10px; }
	.opt-row input[type='radio'] { width: 24px; height: 24px; flex: none; accent-color: var(--green-dark); }
	.pair span { font: 700 18px var(--font-title); }
	.rank { width: 32px; height: 32px; flex: none; border: 3px solid var(--ink); border-radius: 50%; background: var(--gold); display: flex; align-items: center; justify-content: center; font: 700 15px var(--font-title); }
	.danger-zone { justify-content: space-between; padding: 14px 20px; }
</style>
