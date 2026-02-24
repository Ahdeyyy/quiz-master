<script lang="ts">
	import { highlight } from '$lib/shiki';
	import { parseRichText } from '$lib/rich-text';
	import katex from 'katex';

	let { text, inline = false }: { text: string; inline?: boolean } = $props();

	const segments = $derived(parseRichText(text));

	function renderMath(expression: string, displayMode: boolean): string {
		try {
			// katex.renderToString HTML-escapes all user content — safe to inject
			return katex.renderToString(expression, { throwOnError: false, displayMode });
		} catch {
			return `<code class="text-red-500">${expression}</code>`;
		}
	}
</script>

<!-- eslint-disable svelte/no-at-html-tags -->
{#each segments as seg, i (i)}
	{#if seg.kind === 'text'}
		{seg.content}
	{:else if seg.kind === 'inline-code'}
		<code class="rounded bg-zinc-100 px-1 py-0.5 font-mono text-sm text-zinc-800"
			>{seg.content}</code
		>
	{:else if seg.kind === 'inline-math'}
		{@html renderMath(seg.content, false)}
	{:else if seg.kind === 'display-math'}
		<div class="my-4 overflow-x-auto text-center">
			{@html renderMath(seg.content, true)}
		</div>
	{:else if seg.kind === 'code-block'}
		{#if inline}
			<code class="rounded bg-zinc-100 px-1 py-0.5 font-mono text-sm text-zinc-800"
				>{seg.content}</code
			>
		{:else}
			{#await highlight(seg.content, seg.lang)}
				<pre
					class="my-4 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm text-zinc-800"><code>{seg.content}</code></pre>
			{:then html}
				<div class="shiki-wrapper my-4 overflow-x-auto rounded-lg border border-zinc-200">
					{@html html}
				</div>
			{:catch}
				<pre
					class="my-4 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm text-zinc-800"><code>{seg.content}</code></pre>
			{/await}
		{/if}
	{/if}
{/each}
