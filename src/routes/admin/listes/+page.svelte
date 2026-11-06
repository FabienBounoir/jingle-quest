<script lang="ts">
	import { enhance } from '$app/forms';
	import Notice from '$lib/components/Notice.svelte';
	let { data, form } = $props();
</script>

<h1 class="title-on-bg">Listes de réponses</h1>
<p class="hand intro">les joueurs choisissent leur réponse dans une de ces listes</p>

<section class="card stack">
	<form method="POST" action="?/create" use:enhance class="row">
		<label class="field" style="flex: 1 1 240px">
			<span>nouvelle liste</span>
			<input type="text" name="name" placeholder="Collaborateurs, Projets, Clients…" maxlength="60" required />
		</label>
		<button class="btn" type="submit" style="align-self: flex-end">Créer</button>
	</form>
	<Notice {form} />

	{#if data.lists.length === 0}
		<p class="hand">aucune liste pour l'instant… commence par « Collaborateurs » !</p>
	{:else}
		<ul class="list-rows">
			{#each data.lists as l (l.id)}
				<li>
					<a href="/admin/listes/{l.id}" class="name">{l.name}</a>
					<span class="pill">{l.items} valeur{l.items > 1 ? 's' : ''}</span>
					{#if l.questions}<span class="pill gold">{l.questions} question{l.questions > 1 ? 's' : ''}</span>{/if}
					<a class="btn secondary small" href="/admin/listes/{l.id}" style="margin-left: auto">Modifier</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.intro { margin: -10px 0 0; color: var(--white); }
	.name { font-family: var(--font-title); font-size: 19px; font-weight: 600; }
</style>
