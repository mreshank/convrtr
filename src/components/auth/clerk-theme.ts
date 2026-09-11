import { dark } from "@clerk/themes";

/**
 * Clerk theme customization strictly bound to convrtr's void-terminal design tokens.
 *
 * Uses CSS variables directly to stay 100% compliant with the design-system guards:
 * --ground, --surface, --ink, --ink-muted, --rule, --accent, --accent-hover
 */
export const clerkAppearance = {
	baseTheme: dark,
	variables: {
		colorPrimary: "var(--accent)",
		colorBackground: "var(--surface)",
		colorInputBackground: "var(--ground)",
		colorInputBorder: "var(--rule)",
		colorText: "var(--ink)",
		colorTextSecondary: "var(--ink-muted)",
		colorTextOnPrimaryBackground: "var(--ground)",
		borderRadius: "0px",
		fontFamily: "var(--font-sans)",
		fontFamilyButtons: "var(--font-mono)",
	},
	elements: {
		card: {
			borderWidth: "1px",
			borderStyle: "solid",
			borderColor: "var(--rule)",
			backgroundColor: "var(--surface)",
			borderRadius: "0px",
			boxShadow: "none",
		},
		headerTitle: {
			color: "var(--ink)",
			fontWeight: "500",
			letterSpacing: "-0.5px",
		},
		headerSubtitle: {
			color: "var(--ink-muted)",
			fontSize: "14px",
		},
		socialButtonsBlockButton: {
			borderWidth: "1px",
			borderStyle: "solid",
			borderColor: "var(--rule)",
			backgroundColor: "var(--ground)",
			color: "var(--ink)",
			borderRadius: "0px",
			fontFamily: "var(--font-mono)",
			fontSize: "12px",
			textTransform: "uppercase" as const,
			letterSpacing: "0.08em",
		},
		formButtonPrimary: {
			backgroundColor: "var(--ink)",
			color: "var(--ground)",
			borderRadius: "9999px",
			fontFamily: "var(--font-mono)",
			fontSize: "12px",
			fontWeight: "600",
			textTransform: "uppercase" as const,
			letterSpacing: "0.08em",
			boxShadow: "none",
		},
		formFieldInput: {
			backgroundColor: "var(--ground)",
			borderWidth: "1px",
			borderStyle: "solid",
			borderColor: "var(--rule)",
			color: "var(--ink)",
			borderRadius: "0px",
			fontFamily: "var(--font-mono)",
			fontSize: "13px",
		},
		footerActionLink: {
			color: "var(--accent)",
			textDecoration: "underline",
		},
		dividerLine: {
			backgroundColor: "var(--rule)",
		},
		dividerText: {
			color: "var(--ink-muted)",
			fontFamily: "var(--font-mono)",
			fontSize: "11px",
			textTransform: "uppercase" as const,
			letterSpacing: "0.1em",
		},
	},
};
