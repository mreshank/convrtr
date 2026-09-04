"use client";

import { useEffect, useState } from "react";
import {
	resolveTheme,
	THEME_STORAGE_KEY,
	type ThemePreference,
} from "@/lib/theme";

const OPTIONS: { id: ThemePreference; label: string }[] = [
	{ id: "system", label: "SYS" },
	{ id: "light", label: "LIGHT" },
	{ id: "dark", label: "DARK" },
];

function isThemePreference(value: string | null): value is ThemePreference {
	return value === "system" || value === "light" || value === "dark";
}

function systemPrefersDark(): boolean {
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(pref: ThemePreference): void {
	document.documentElement.setAttribute(
		"data-theme",
		resolveTheme(pref, systemPrefersDark()),
	);
}

/**
 * A three-way SYS / LIGHT / DARK control implementing the spec's locked
 * decision: system-following by default, with an explicit override. It
 * writes the same `convrtr.theme` key `ThemeScript` reads before paint, and
 * resolves the visible theme through the exact `resolveTheme` function the
 * unit tests already exercise — so the tested function is the one that
 * actually ships, instead of `ThemeScript`'s inline reimplementation being
 * the only thing that runs in production.
 */
export function ThemeToggle() {
	// Starts at "system" for both the server render and the first client
	// render, so hydration never mismatches; the real stored preference (if
	// any) is picked up in the effect below, after paint.
	const [pref, setPref] = useState<ThemePreference>("system");

	useEffect(() => {
		const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
		if (isThemePreference(stored)) setPref(stored);
	}, []);

	const choose = (next: ThemePreference) => {
		setPref(next);
		window.localStorage.setItem(THEME_STORAGE_KEY, next);
		applyTheme(next);
	};

	return (
		<div role="radiogroup" aria-label="Theme" className="flex gap-2">
			{OPTIONS.map((option) => {
				const selected = option.id === pref;
				return (
					// biome-ignore lint/a11y/useSemanticElements: a native <input type="radio"> can't carry the segmented-button styling or the label text as its own accessible content.
					<button
						key={option.id}
						type="button"
						role="radio"
						aria-checked={selected}
						aria-label={option.label}
						onClick={() => choose(option.id)}
						className="mono border px-2 py-1 text-[11px] tracking-[0.08em]"
						style={{
							color: selected ? "var(--text-primary)" : "var(--text-muted)",
							borderColor: selected ? "var(--text-primary)" : "var(--hairline)",
							borderRadius: "var(--radius)",
							background: "transparent",
						}}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
