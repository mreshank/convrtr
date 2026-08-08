export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "convrtr.theme";

export function resolveTheme(
	pref: ThemePreference,
	systemPrefersDark: boolean,
): ResolvedTheme {
	if (pref === "system") return systemPrefersDark ? "dark" : "light";
	return pref;
}
