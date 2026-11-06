<script lang="ts">
	let { data } = $props();
</script>

<!-- Accueil provisoire (lot 1) : le calendrier arrive au lot 3. -->
<main>
	<h1 class="title-on-bg">Salut {data.user?.displayName} !</h1>
	<div class="card">
		<p class="hand">les cadeaux arrivent bientôt…</p>
		<p>Tu es bien connecté{data.isAdmin ? ' en tant qu’admin' : ''}.</p>
		<form method="POST" action="/logout">
			<button class="btn secondary" type="submit">Se déconnecter</button>
		</form>
	</div>
</main>

<style>
	main { max-width: 560px; margin: 0 auto; padding: 48px 20px; display: flex; flex-direction: column; gap: 20px; }
	h1 { font-size: clamp(32px, 8vw, 48px); }
	p { margin: 0 0 12px; }
</style>
