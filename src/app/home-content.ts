import { TOOLS } from "@/core/registry";
import { conversionBranches, supportedFormats } from "@/core/registry/stats";

// Derived once, here, so page.tsx never calls the registry itself and every
// consumer of a "how many / which formats" claim reads the same values.
export const SUPPORTED_FORMATS = supportedFormats();
export const HEIC_BRANCHES = conversionBranches("heic");

// v2's first screen: the fused headline, a pill pair. "Nothing uploads" is
// the whole architecture claim in three words -- every conversion in
// `src/core` runs client-side, and there is no account system or analytics
// call anywhere in this codebase to contradict it.
export const HERO_PROPS = {
	lead: "Convert anything.",
	cont: "Nothing uploads.",
	cta: { href: "/tools", label: "Start converting" },
	secondary: { href: "/blog", label: "Read the blog" },
};

// What the browser actually does for heic-to-jpg: `heic.ts` decodes HEIC via
// `libheif-js/wasm-bundle` client-side, and `quality-profiles.ts`'s
// "balanced" default for the mozjpeg encoder is quality 78. Real code paths,
// not invented numbers.
export const TERMINAL_PROPS = {
	label: "What happens when you convert a file",
	lines: [
		{ text: "photo.heic selected — 4.2 MB" },
		{ text: "decoding locally, no upload", tone: "muted" as const },
		{ text: "libheif → jpeg, quality 78", tone: "muted" as const },
		{ text: "photo.jpg ready — 1.1 MB", tone: "accent" as const },
	],
};

// What using the product is actually like. Every claim is checked against a
// real file, not asserted:
//   Local / Fast  -- `next.config.ts`'s `output: "export"` means there is no
//     server at all in production, and `e2e/network-guard.ts` watches every
//     request the built page makes in `pnpm run ci`, failing if a single
//     byte leaves the device. "No round trip" is not a design choice that
//     could regress; there is nothing on the other end of one.
//   Private -- no route or component anywhere under `src/app`, `src/core` or
//     `src/components` implements sign-up/sign-in (grepped, zero hits), and
//     no analytics dependency exists in `package.json` -- both halves of
//     "no account, no telemetry" are checked, not assumed.
//   Offline -- `src/components/ServiceWorkerRegistration.tsx` registers the
//     service worker `scripts/generate-sw.mjs` generates, and
//     `e2e/offline.spec.ts` proves the *pipeline*, not just the HTML, keeps
//     converting with the network cut off after one online run.
//   Honest -- `FidelityScore.tsx:97`'s `aria-label` is the only place the
//     word "lossless" appears; what a sighted user gets is `isSolid()`
//     (`FidelityScore.tsx:139`) choosing a solid or dashed ring. "Drawn" is
//     what is actually painted; "stated" would be true only for a
//     screen-reader user.
export const FEATURES = [
	{ label: "Local", body: "Files never leave the device." },
	{ label: "Fast", body: "No round trip to a server." },
	{ label: "Private", body: "No account, no telemetry." },
	{ label: "Offline", body: "Works with the network off." },
	{ label: "Honest", body: "Fidelity is drawn, not implied." },
];

// FeatureStrip's angle is what the product is *like to use*; this grid's is
// what it *refuses to do* -- six absences, none restating a FEATURES label.
// Each is checked against a file, same discipline as FEATURES above:
//   No upload / No account / No telemetry -- the same evidence as FEATURES'
//     Local/Fast/Private above (`next.config.ts`, `e2e/network-guard.ts`,
//     the sign-up/analytics grep).
//   No hidden loss -- `FidelityScore.tsx:139` sets `strokeDasharray` if and
//     only if `isSolid()` is false, i.e. exactly for `lossy` and
//     `inherently-lossy`. Whenever the ring is broken, something was given
//     up -- the one direction this label claims.
//   No lock-in -- this used to read "N open formats, never a proprietary
//     one", which is false: `src/core/registry/tools/video/mlw-to-mp4.ts:4`
//     says outright that "MLW is a proprietary screen-recording/course-app
//     container", `mlw` is in that tool's `accept.ext`, and
//     `supportedFormats()` folds every tool's `accept.ext` in -- so `mlw`
//     renders in the FormatStrip marquee a few hundred pixels above where
//     the old claim denied it existed. The true property, from the same
//     file: that tool exists precisely to read a proprietary container and
//     hand back a plain, unencrypted MP4 -- reading proprietary formats to
//     get you *out* of them, not holding you in one.
//   No install required -- this used to read "No install", which is also
//     false: `src/app/manifest.ts:22-58` declares `display: "standalone"`
//     with full icon sets, and `ServiceWorkerRegistration.tsx` backs it --
//     convrtr is a genuinely installable PWA. What is true is the weaker,
//     real claim: `ServiceWorkerRegistration.tsx`'s own comment says "every
//     conversion already runs fully client-side without a service worker;
//     offline support is strictly additive" -- so installing is optional,
//     never required to use the page you are already on.
export const GRID_FEATURES = [
	{ label: "No upload", body: "Conversion runs in the page." },
	{ label: "No account", body: "Nothing to sign up for." },
	{ label: "No telemetry", body: "No analytics beacon." },
	{
		label: "No hidden loss",
		body: "A broken ring means something was given up.",
	},
	{
		label: "No lock-in",
		body: "Reads MLW's proprietary container just to hand you back a plain MP4.",
	},
	{
		label: "No install required",
		body: "Works in the tab you already have open. Installing is optional.",
	},
];

// The checkable equivalent of a certification badge this product does not
// hold: every claim here is what `e2e/network-guard.ts` asserts in
// `pnpm run ci`, which watches every request the page makes and fails if a
// single byte leaves the device.
export const COMPLIANCE_PROPS = {
	claims: [
		"No file leaves the device",
		"No account required",
		"No analytics beacon",
	],
	status: { label: "Verified in CI", ok: true },
};

// `ToolGrid` takes its eyebrow and headline as props, like every sibling
// family -- copy lives with the rest of this page's content, not hardcoded
// in the family. The count in `cont` reads `TOOLS.length` rather than a
// hand-typed number, so it cannot go stale as tools are added.
export const TOOL_GRID_PROPS = {
	eyebrow: "Every tool, no menu",
	title: {
		lead: "One flat list.",
		cont: `${TOOLS.length} tools, nothing to open first.`,
	},
};

// One bundle, so `page.tsx` needs a single import rather than one name per
// band -- the route composes families, it should not have to enumerate data.
export const HOME = {
	hero: HERO_PROPS,
	terminal: TERMINAL_PROPS,
	features: FEATURES,
	gridFeatures: GRID_FEATURES,
	formats: SUPPORTED_FORMATS,
	heicBranches: HEIC_BRANCHES,
	compliance: COMPLIANCE_PROPS,
	toolGrid: TOOL_GRID_PROPS,
};
