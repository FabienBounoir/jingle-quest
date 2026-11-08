<script lang="ts">
	import { sound, toggleSound } from '$lib/sound.svelte';
</script>

<!-- data-silent : ce bouton gère son propre son (il ne doit pas cliquer quand on coupe). -->
<button type="button" class="sound" data-silent aria-pressed={sound.enabled} aria-label={sound.enabled ? 'Couper le son' : 'Activer le son'} title={sound.enabled ? 'Couper le son' : 'Activer le son'} onclick={toggleSound}>
	<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
		<path d="M4 9v6h4l5 4V5L8 9z" />
		{#if sound.enabled}<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />{:else}<path d="M17 9l5 6M22 9l-5 6" />{/if}
	</svg>
</button>

<style>
	.sound { width: 44px; height: 44px; flex: none; border: 3px solid var(--ink); border-radius: 50%; background: var(--paper); box-shadow: 0 3px 0 var(--ink); color: var(--ink); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
	.sound[aria-pressed='false'] { background: var(--grey); }
</style>
