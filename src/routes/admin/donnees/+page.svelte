<script lang="ts">
	import { enhance } from '$app/forms';
	import Notice from '$lib/components/Notice.svelte';
	let { data, form } = $props();
</script>

<h1 class="title-on-bg">Données</h1>
<Notice {form} />

<section class="card stack" aria-labelledby="export-title">
	<h2 id="export-title">Exporter le template</h2>
	<p>Réglages, marque, listes, questions (avec leurs images) et calendrier, dans un fichier JSON. <strong>Jamais les joueurs ni leurs réponses.</strong></p>
	<p class="muted">Pour passer ce que tu as préparé en local vers la prod, ou partager le calendrier avec une autre entreprise.</p>
	<a class="btn" href="/admin/donnees/export" download>Télécharger l'export</a>
</section>

<section class="card stack" aria-labelledby="import-title">
	<h2 id="import-title">Importer un template</h2>
	<p><strong>Remplace</strong> tout le contenu actuel (réglages, listes, questions, calendrier). Les comptes des joueurs sont conservés.</p>
	{#if data.answers > 0}
		<p class="notice error">{data.answers} réponse(s) de joueurs existent : remets-les d'abord à zéro (plus bas).</p>
	{/if}
	<form method="POST" action="?/import" enctype="multipart/form-data" use:enhance class="row">
		<input type="file" name="file" accept=".json,application/json" required />
		<button class="btn" type="submit" disabled={data.answers > 0}>Importer</button>
	</form>
</section>

<section class="card stack danger" aria-labelledby="reset-title">
	<h2 id="reset-title">Remettre les réponses à zéro</h2>
	<p>Supprime les <strong>{data.answers} réponse(s)</strong> et vide le classement, par exemple après la répétition générale, juste avant le lancement. Les questions, les listes et les comptes restent.</p>
	<form method="POST" action="?/reset" use:enhance class="row">
		<label class="field" style="flex: 0 1 220px">
			<span>tape EFFACER pour confirmer</span>
			<input type="text" name="confirm" autocomplete="off" required />
		</label>
		<button class="btn danger" type="submit" style="align-self: flex-end" disabled={data.answers === 0}>Tout effacer</button>
	</form>
</section>

<style>
	h2 { font-size: 22px; }
	p { margin: 0; }
	.danger { border-style: dashed; }
</style>
