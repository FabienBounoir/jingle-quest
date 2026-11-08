<script lang="ts">
	import '../app.css';
	import { initSound, playClick } from '$lib/sound.svelte';
	let { data, children } = $props();

	// Un seul écouteur pour tout le site : tout ce qui ressemble à un bouton fait « bulle » au clic.
	const CLICKABLE = 'button, .btn, [role="tab"], [role="radio"], [role="option"], .tabbar a, label.opt, label.type';
	$effect(() => {
		initSound();
		const onClick = (e: MouseEvent) => {
			const el = (e.target as Element | null)?.closest(CLICKABLE);
			if (!el || el.closest('[data-silent]') || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
			void playClick();
		};
		document.addEventListener('click', onClick, true);
		return () => document.removeEventListener('click', onClick, true);
	});
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
