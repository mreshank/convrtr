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
	cont: "Upload nothing.",
	cta: { href: "/convert", label: "Start converting" },
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
// in the family. The lead reads `TOOLS.length` rather than a hand-typed
// number, so it cannot go stale as tools are added. It is phrased as a live
// inventory count on purpose: the chapter headline above it already carries
// the "flat list, no menu" claim, and repeating it here would stack the same
// sentence twice.
export const TOOL_GRID_PROPS = {
	eyebrow: "Inventory // live count",
	title: {
		lead: `${TOOLS.length} tools.`,
		cont: "Counted, not claimed.",
	},
};

// One bundle, so `page.tsx` needs a single import rather than one name per
// band -- the route composes families, it should not have to enumerate data.

// The homepage tells one story -- a single file's journey from drop to
// download -- in six chapters. Each chapter's eyebrow, headline and lede live
// here, next to every other line of homepage copy, so the narrative arc can
// be read and edited in one place rather than reconstructed from JSX.
export const STORY_CHAPTERS = {
	problem: {
		index: "01",
		eyebrow: "THE PROBLEM",
		title: { lead: "Cloud converters", cont: "are surveillance pipelines." },
		lede: "Upload your file, wait in a queue, hope the server deletes it. Every step of that ritual exists to serve someone else's infrastructure. This chapter is why convrtr refuses to have a server at all.",
	},
	journey: {
		index: "02",
		eyebrow: "THE JOURNEY",
		title: { lead: "One file,", cont: "five stages, zero uploads." },
		lede: "Follow a photo from the moment it lands in the tab to the moment its converted twin downloads. Each stage below names the real code that runs it -- nothing here is a metaphor.",
	},
	graph: {
		index: "03",
		eyebrow: "THE GRAPH",
		title: { lead: "Every format", cont: "is a node. Every tool is an edge." },
		lede: "There is no menu of conversions because there doesn't need to be one: the registry is a graph, and the engine walks it. Pick a format and watch its lineage branch -- then follow a two-hop chain the router found on its own.",
	},
	refusals: {
		index: "04",
		eyebrow: "THE REFUSALS",
		title: { lead: "What it is,", cont: "and what it will not do." },
		lede: "Five properties the product holds, six behaviours it refuses. Each absence is checked against a file in this repo, not asserted in marketing copy.",
	},
	arsenal: {
		index: "05",
		eyebrow: "THE ARSENAL",
		title: { lead: "One flat list.", cont: "Every tool, no menu." },
		lede: "The registry keeps growing -- new decoders land without rearranging anything, because a graph has no shelves to restock.",
	},
	carry: {
		index: "06",
		eyebrow: "TAKE IT WITH YOU",
		title: { lead: "In the tab,", cont: "in Chrome, in your inbox." },
		lede: "The same engine, everywhere you already work: docked beside any page as an extension, or announced to your inbox the moment new decoders land.",
	},
};
// The five stages every conversion passes through, in order. Each `detail`
// names the real module or function responsible -- `detectFileExtension` and
// `findConversionRoute` in `converter-match.ts`, the WASM workers under
// `src/core/engines`, and the `lineage` receipt in `session-store.ts` -- so
// the timeline doubles as an index into the codebase.
export const PIPELINE_STAGES = [
	{
		code: "DROP",
		title: "The file lands in the tab",
		body: "Drag, drop, or pick. Bytes are staged in page memory and never addressed to anyone else -- there is no server endpoint to send them to.",
		detail: "FileReader ➔ ArrayBuffer, in the page",
	},
	{
		code: "SNIFF",
		title: "The header is read, not the name",
		body: "The real extension is resolved from the file itself, so a misnamed download still routes to the decoder that can actually open it.",
		detail: "converter-match.ts — detectFileExtension",
	},
	{
		code: "ROUTE",
		title: "The graph finds the shortest path",
		body: "Breadth-first search across every convert and extract tool, up to three hops deep, preferring clean interchange formats like PNG, WAV, MP4 and PDF.",
		detail: "converter-match.ts — findConversionRoute (BFS, 3 hops)",
	},
	{
		code: "EXECUTE",
		title: "WASM engines run in a sandbox",
		body: "Decoders and encoders execute in isolated WebAssembly workers inside the browser sandbox. The network can be off; the conversion doesn't notice.",
		detail: "src/core/engines — 100% client-side workers",
	},
	{
		code: "EMIT",
		title: "The twin downloads with a receipt",
		body: "The converted file downloads straight from the page, carrying a lineage receipt -- which file it came from, and which step in the chain it is.",
		detail: "session-store.ts — StagedConversion.lineage",
	},
];

// The eight input formats with the richest direct lineage -- the most
// branches out of `conversionBranches` -- so the explorer opens on graphs
// worth looking at. Derived, like every other registry claim on this page.
export const LINEAGE_SOURCES = supportedFormats()
	.map((ext) => ({ ext, count: conversionBranches(ext).length }))
	.filter((entry) => entry.count > 0)
	.sort((a, b) => b.count - a.count || (a.ext < b.ext ? -1 : 1))
	.slice(0, 8)
	.map((entry) => entry.ext);

export const HOME = {
	hero: HERO_PROPS,
	terminal: TERMINAL_PROPS,
	features: FEATURES,
	gridFeatures: GRID_FEATURES,
	formats: SUPPORTED_FORMATS,
	heicBranches: HEIC_BRANCHES,
	compliance: COMPLIANCE_PROPS,
	toolGrid: TOOL_GRID_PROPS,
	chapters: STORY_CHAPTERS,
	pipelineStages: PIPELINE_STAGES,
	lineageSources: LINEAGE_SOURCES,
};
