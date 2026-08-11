import { THEME_STORAGE_KEY } from "@/lib/theme";

const script = `
(function () {
	try {
		var pref = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || 'system';
		var dark = pref === 'dark' ||
			(pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
		document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
	} catch (e) {
		/* Deliberately does NOT set data-theme.
		 * Writing 'light' here would satisfy the :not([data-theme="light"])
		 * exclusion in tokens.css and switch OFF the prefers-color-scheme
		 * fallback — forcing a dark-preferring visitor into light mode
		 * *because* JavaScript ran, which is worse than the no-JS path.
		 * Leaving the attribute unset lets the CSS media query resolve it. */
	}
})();
`;

export function ThemeScript() {
	return (
		<script
			// biome-ignore lint/security/noDangerouslySetInnerHtml: fixed, build-time-constant script (no user input) that must run before paint to avoid a theme flash
			dangerouslySetInnerHTML={{ __html: script }}
			suppressHydrationWarning
		/>
	);
}
