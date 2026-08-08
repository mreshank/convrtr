import { THEME_STORAGE_KEY } from "@/lib/theme";

const script = `
(function () {
	try {
		var pref = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || 'system';
		var dark = pref === 'dark' ||
			(pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
		document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
	} catch (e) {
		document.documentElement.setAttribute('data-theme', 'light');
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
