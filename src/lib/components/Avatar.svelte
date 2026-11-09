<script lang="ts">
	// Initiales dessous, photo par-dessus : si /img/avatar répond 404 (pas de photo ou masquée), l'image
	// disparaît et les initiales restent. Taille, bordure et fond viennent de la classe du parent.
	let { userId, name, class: cls = '', style = '' }: { userId: string; name: string; class?: string; style?: string } = $props();
	let failed = $state(false);
	const initials = $derived(name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase());
	$effect(() => {
		userId;
		failed = false; // nouvelle personne (le podium change) : on retente
	});
</script>

<span class="avatar-wrap {cls}" {style} aria-hidden="true">
	{initials}
	{#if !failed}<img src="/img/avatar/{userId}" alt="" loading="lazy" onerror={() => (failed = true)} />{/if}
</span>

<style>
	.avatar-wrap { position: relative; overflow: hidden; }
	img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
</style>
