export type Segment =
	| { kind: 'text'; content: string }
	| { kind: 'inline-code'; content: string }
	| { kind: 'inline-math'; content: string }
	| { kind: 'display-math'; content: string }
	| { kind: 'code-block'; lang: string; content: string };

/**
 * Parse a raw text string into typed segments for rich rendering.
 *
 * Priority order (highest wins):
 *  1. Fenced code block  ```lang\n...\n```
 *  2. Display math       $$...$$
 *  3. Inline code        `...`
 *  4. Inline math        $...$  (non-empty, no leading/trailing space)
 *  5. Plain text
 *
 * Unmatched opening delimiters fall through to plain text — no crashes.
 */
export function parseRichText(text: string): Segment[] {
	const segments: Segment[] = [];
	let i = 0;

	while (i < text.length) {
		// ── 1. Fenced code block ──────────────────────────────────────────────
		if (text.startsWith('```', i)) {
			const openEnd = text.indexOf('\n', i + 3);
			if (openEnd !== -1) {
				const lang = text.slice(i + 3, openEnd).trim();
				const closeIdx = findFenceClose(text, openEnd + 1);
				if (closeIdx !== -1) {
					const content = text.slice(openEnd + 1, closeIdx);
					segments.push({ kind: 'code-block', lang, content });
					// advance past the closing ``` and optional trailing newline
					i = closeIdx + 3;
					if (text[i] === '\n') i++;
					continue;
				}
			}
			// No matching close — fall through to plain text (consume one char)
		}

		// ── 2. Display math $$ ... $$ ─────────────────────────────────────────
		if (text.startsWith('$$', i)) {
			const closeIdx = text.indexOf('$$', i + 2);
			if (closeIdx !== -1) {
				const content = text.slice(i + 2, closeIdx);
				if (content.length > 0) {
					segments.push({ kind: 'display-math', content });
					i = closeIdx + 2;
					continue;
				}
			}
			// No matching close or empty — fall through
		}

		// ── 3. Inline code ` ... ` ────────────────────────────────────────────
		if (text[i] === '`') {
			const closeIdx = text.indexOf('`', i + 1);
			if (closeIdx !== -1) {
				const content = text.slice(i + 1, closeIdx);
				if (content.length > 0) {
					segments.push({ kind: 'inline-code', content });
					i = closeIdx + 1;
					continue;
				}
			}
			// No matching close or empty — fall through
		}

		// ── 4. Inline math $ ... $ ────────────────────────────────────────────
		if (text[i] === '$') {
			const closeIdx = text.indexOf('$', i + 1);
			if (closeIdx !== -1) {
				const content = text.slice(i + 1, closeIdx);
				// Reject empty, or content with leading/trailing whitespace (currency heuristic)
				if (content.length > 0 && content[0] !== ' ' && content[content.length - 1] !== ' ') {
					segments.push({ kind: 'inline-math', content });
					i = closeIdx + 1;
					continue;
				}
			}
			// No matching close or invalid — fall through
		}

		// ── 5. Plain text — accumulate until the next potential delimiter ──────
		const start = i;
		i++;
		while (i < text.length) {
			const ch = text[i];
			if (ch === '`' || ch === '$') break;
			if (text.startsWith('```', i)) break;
			i++;
		}
		const chunk = text.slice(start, i);
		if (segments.length > 0 && segments[segments.length - 1].kind === 'text') {
			// Merge consecutive text segments
			(segments[segments.length - 1] as { kind: 'text'; content: string }).content += chunk;
		} else {
			segments.push({ kind: 'text', content: chunk });
		}
	}

	return segments;
}

/**
 * Find the index of a closing ``` fence starting from `from`.
 * Returns the index of the opening backtick of the closing fence, or -1.
 */
function findFenceClose(text: string, from: number): number {
	let i = from;
	while (i < text.length) {
		// A closing fence is ``` at the start of a line (or after a newline)
		if (text.startsWith('```', i)) {
			// Check that it's at start of line (i === from means first line after open)
			const prevChar = i === 0 ? '\n' : text[i - 1];
			if (prevChar === '\n') {
				// Make sure the rest of the line is just ``` (possibly with whitespace)
				const lineEnd = text.indexOf('\n', i + 3);
				const rest = lineEnd === -1 ? text.slice(i + 3) : text.slice(i + 3, lineEnd);
				if (rest.trim() === '') {
					return i;
				}
			}
		}
		i++;
	}
	return -1;
}
