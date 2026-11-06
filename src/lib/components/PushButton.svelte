<script lang="ts">
	// « Me prévenir à l'ouverture » : abonnement Web Push de ce navigateur. Invisible si le navigateur
	// ne sait pas faire (ex. iPhone hors application installée sur l'écran d'accueil) ou si le
	// déploiement n'a pas de clés VAPID.
	let { vapidKey }: { vapidKey: string | null } = $props();

	type Status = 'unsupported' | 'loading' | 'off' | 'on' | 'denied';
	let status = $state<Status>('loading');
	let busy = $state(false);

	const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

	$effect(() => {
		if (!vapidKey || !supported()) {
			status = 'unsupported';
			return;
		}
		if (Notification.permission === 'denied') {
			status = 'denied';
			return;
		}
		navigator.serviceWorker.ready
			.then((reg) => reg.pushManager.getSubscription())
			.then((sub) => (status = sub ? 'on' : 'off'))
			.catch(() => (status = 'unsupported'));
	});

	function keyBytes(b64: string) {
		const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
		return Uint8Array.from(s, (c) => c.charCodeAt(0));
	}

	async function toggle() {
		busy = true;
		try {
			const reg = await navigator.serviceWorker.ready;
			const current = await reg.pushManager.getSubscription();
			if (current) {
				await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: current.endpoint }) });
				await current.unsubscribe();
				status = 'off';
				return;
			}
			if ((await Notification.requestPermission()) !== 'granted') {
				status = Notification.permission === 'denied' ? 'denied' : 'off';
				return;
			}
			const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey!) });
			const res = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) });
			status = res.ok ? 'on' : 'off';
		} catch {
			status = 'off';
		} finally {
			busy = false;
		}
	}
</script>

{#if status !== 'unsupported' && status !== 'loading'}
	<div class="card push">
		<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
		<div class="txt">
			<p class="title">Me prévenir à l'ouverture</p>
			<p class="muted">
				{#if status === 'denied'}Notifications bloquées : autorise-les dans les réglages du navigateur.{:else}Une notification sur ce navigateur, même onglet fermé.{/if}
			</p>
		</div>
		{#if status !== 'denied'}
			<button type="button" class="btn small {status === 'on' ? 'on' : ''}" aria-pressed={status === 'on'} disabled={busy} onclick={toggle}>
				{status === 'on' ? 'C’est noté !' : 'Activer'}
			</button>
		{/if}
	</div>
{/if}

<style>
	.push { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; text-align: left; padding: 16px 20px; transform: rotate(-1deg); }
	.txt { flex: 1 1 200px; }
	.title { margin: 0; font: 700 19px var(--font-title); }
	.muted { margin: 0; }
	.btn.on { background: var(--green); }
</style>
