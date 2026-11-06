<script lang="ts">
	import '../app.css';
	let { data, children } = $props();
	// Couleur injectée dans un <style> : on n'accepte qu'un hex strict, rien d'autre ne passe.
	const bg = $derived(/^#[0-9a-f]{6}$/i.test(data.brand.bgColor) ? data.brand.bgColor : '#C62F3B');
</script>

<svelte:head>
	<title>{data.brand.eventName}</title>
	<meta name="theme-color" content={bg} />
	<!-- La couleur de marque est la seule variable de thème réglable (SPECS §6). -->
	{@html `<style>:root{--bg:${bg}}</style>`}
</svelte:head>

{@render children()}
