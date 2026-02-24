import type { Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

const SUPPORTED_LANGS = [
	'javascript',
	'typescript',
	'python',
	'rust',
	'go',
	'java',
	'c',
	'cpp',
	'bash',
	'json',
	'html',
	'css',
	'sql'
] as const;

function getHighlighter(): Promise<Highlighter> {
	if (!highlighterPromise) {
		// Dynamic import keeps Shiki out of the initial bundle (code-split)
		highlighterPromise = import('shiki').then(({ createHighlighter }) =>
			createHighlighter({
				themes: ['github-light', 'github-dark'],
				langs: [...SUPPORTED_LANGS]
			})
		);
	}
	return highlighterPromise;
}

/**
 * Syntax-highlight `code` for the given language using Shiki's dual-theme mode.
 * The returned HTML string contains CSS custom property vars (--shiki-light,
 * --shiki-dark, etc.) that switch automatically via the prefers-color-scheme
 * media query defined in layout.css.
 *
 * Falls back to plain `text` highlighting for unknown languages.
 */
export async function highlight(code: string, lang: string): Promise<string> {
	const hl = await getHighlighter();

	const safeLang = (SUPPORTED_LANGS as readonly string[]).includes(lang) ? lang : 'text';

	return hl.codeToHtml(code, {
		lang: safeLang,
		themes: {
			light: 'github-light',
			dark: 'github-dark'
		},
		defaultColor: false
	});
}
