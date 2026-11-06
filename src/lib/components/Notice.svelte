<script lang="ts">
	// Retour d'une form action : { ok } en vert, { error } en rouge.
	let { form }: { form: { ok?: string; error?: string } | null | undefined } = $props();
</script>

{#if form?.error}
	<p class="notice error" role="alert">{form.error}</p>
{:else if form?.ok}
	<p class="notice ok" role="status">{form.ok}</p>
{/if}
