"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { getSample } from "@/content/samples/registry";
import { JobError, runJob } from "@/core/pipeline/client";
import { makeJobId } from "@/core/pipeline/protocol";
import {
	applyPreset,
	describeFidelity,
	fidelityScore,
	fidelityState,
	initialQuality,
} from "@/core/quality";
import { getTool, type QualityPreset, type Tool } from "@/core/registry";
import { AsymCard, MediaFrame, MonoMeta } from "@/design/primitives";
import { formatBytes, formatDelta } from "@/lib/format";
import { FidelityScore } from "./FidelityScore";
import { FileReadout } from "./FileReadout";

type Props = {
	toolId: string;
	sampleId: string;
	/**
	 * Pins the demo to a specific preset instead of the tool's own
	 * `defaultPreset` -- I4: a collective's `why` can stake a claim on a
	 * named preset ("the exact preset this catalogue's own WAV normaliser
	 * labels 'Podcast'"), and without a way to pin one, the interactive
	 * proof on that page runs whatever preset happens to be the tool's
	 * default, which need not be the one the prose is about. Omitted, this
	 * falls back to `initialQuality(tool)`, unchanged from before.
	 */
	presetId?: QualityPreset;
};

type Readout = {
	inputBytes: number;
	outputBytes: number;
	elapsedMs: number;
	fidelityLabel: string;
	fidelityValue: number;
	imageUrl?: string;
};

/**
 * Both this component's own cards sit on `--surface-alt`, the pale ground
 * `SiteFooter` is the only other place in the system to invert to -- and
 * every text/border colour inside them (`MonoMeta`, `FileReadout`,
 * `FidelityScore`'s ink stroke and label, the RUN DEMO border, the static
 * specimen's dashed border and body copy) reads `var(--ink)` / `var(--ink-muted)`
 * / `var(--rule)`, which resolve to white / grey / near-black-on-black --
 * the values meant for the site's black canvas. Setting only `background`
 * to the literal token, as this used to, left every one of those colours
 * unchanged: white text measured at 1.16:1 against the pale card, far below
 * even large-text AA.
 *
 * `SiteFooter.tsx` already solved exactly this by redefining the tokens
 * rather than each descendant's colour -- redefining `--ink`/`--ink-muted`/
 * `--rule` here the same way fixes every one of those consumers at once,
 * including two components (`FileReadout`, `FidelityScore`) that have no
 * idea they might ever sit on anything but the black canvas.
 *
 * `color: var(--ink)` has to be restated here too, alongside the custom
 * property, not just the property alone -- `body { color: var(--ink) }` in
 * tokens.css resolves `color` to white once, at the body, and CSS `color`
 * is an inherited property: a descendant that never redeclares `color`
 * keeps inheriting that already-resolved white no matter what `--ink`
 * itself is redefined to further down. `MonoMeta`'s `.meta` class does not
 * redeclare `color`, so without this line here it stayed white regardless
 * of the token redefinition above -- measured at 1.16:1 against the pale
 * card before this line existed.
 */
const PALE_CARD_TOKENS: CSSProperties = {
	["--ground" as string]: "var(--surface-alt)",
	["--ink" as string]: "var(--ink-inverse)",
	["--ink-muted" as string]: "var(--ink-inverse)",
	["--rule" as string]: "var(--rule-subtle)",
	background: "var(--ground)",
	color: "var(--ink)",
};

const PLACEHOLDER = (
	<div
		aria-hidden="true"
		style={{ background: "var(--rule-subtle)", width: "100%", height: "100%" }}
	/>
);

/**
 * A real conversion, run on demand, over a sample this repo generates rather
 * than fetches -- see spec §8.1. At rest: identity plus a `RUN DEMO`
 * affordance, nothing fetched. On click: the sample is fetched same-origin
 * and handed to the exact `runJob` pipeline `ToolClient` calls, so the
 * readout is a real measurement, not a recording.
 *
 * A tool declaring `heavyDownloadMb` never reaches any of that -- spec
 * §8.2's second refusal -- and shows a labelled static specimen instead,
 * checked first and unconditionally so nothing below it can be reached for
 * that tool.
 */
export function LiveDemo({ toolId, sampleId, presetId }: Props) {
	const tool = getTool(toolId);
	const [state, setState] = useState<"idle" | "running" | "error">("idle");
	const [readout, setReadout] = useState<Readout | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		return () => {
			if (readout?.imageUrl) URL.revokeObjectURL(readout.imageUrl);
		};
	}, [readout]);

	if (!tool) return null;
	if (tool.heavyDownloadMb) return <HeavySpecimen tool={tool} />;

	const sample = getSample(sampleId);
	if (!sample) return null;

	// I4: pinned to `presetId` when the caller names one, otherwise the
	// tool's own default -- exactly `initialQuality`'s behaviour, so a demo
	// with no `presetId` runs identically to before this prop existed.
	const quality = presetId ? applyPreset(tool, presetId) : initialQuality(tool);

	async function run() {
		if (!tool || !sample) return;
		setState("running");
		setError(null);
		const start = performance.now();
		try {
			const response = await fetch(sample.source);
			const input = await response.arrayBuffer();
			// Captured now, not after `runJob`: `postMessage` below transfers
			// `input` to the worker rather than copying it, which detaches it on
			// the main thread and leaves `byteLength` reading 0 from then on.
			const inputBytes = input.byteLength;
			const output = await runJob(
				{
					id: makeJobId(),
					engines: tool.engines,
					input,
					params: quality.params,
				},
				() => {},
				new AbortController().signal,
			);
			const elapsedMs = performance.now() - start;
			const imageUrl = tool.output.mime.startsWith("image/")
				? URL.createObjectURL(new Blob([output], { type: tool.output.mime }))
				: undefined;
			setReadout({
				inputBytes,
				outputBytes: output.byteLength,
				elapsedMs,
				fidelityLabel: describeFidelity(tool, quality),
				fidelityValue: fidelityScore(tool, quality),
				imageUrl,
			});
			setState("idle");
		} catch (caught) {
			setError(
				caught instanceof JobError
					? caught.message
					: "The demo conversion failed.",
			);
			setState("error");
		}
	}

	return (
		<AsymCard variant="b" aspect="4/3">
			<div
				className="flex h-full flex-col justify-between gap-3 p-4"
				style={PALE_CARD_TOKENS}
			>
				<MediaFrame>
					{readout?.imageUrl ? (
						// biome-ignore lint/performance/noImgElement: a client-generated blob URL, not a URL Next's image optimiser (disabled for this static export) can process.
						<img
							src={readout.imageUrl}
							alt={`${tool.seo.h1} result`}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
						/>
					) : (
						PLACEHOLDER
					)}
				</MediaFrame>

				<MonoMeta as="p">{sample.label}</MonoMeta>

				{readout ? (
					<div className="flex items-center gap-3">
						<FidelityScore
							score={readout.fidelityValue}
							label={readout.fidelityLabel}
							fidelity={fidelityState(tool, quality)}
							size={28}
						/>
						<FileReadout
							name={tool.seo.h1}
							facts={[
								`${formatBytes(readout.inputBytes)} → ${formatBytes(readout.outputBytes)}`,
								formatDelta(readout.inputBytes, readout.outputBytes),
								`${Math.round(readout.elapsedMs)}ms`,
							]}
						/>
					</div>
				) : (
					<button
						type="button"
						onClick={run}
						disabled={state === "running"}
						className="mono self-start border px-4 py-2 text-[12px]"
						style={{ color: "var(--ink)", borderColor: "var(--ink)" }}
					>
						{state === "running" ? "RUNNING…" : "RUN DEMO"}
					</button>
				)}

				{error ? (
					<span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
						{error}
					</span>
				) : null}
			</div>
		</AsymCard>
	);
}

/**
 * Spec §8.2's second refusal, made concrete: the ffmpeg.wasm tier costs 31MB
 * before it can run at all, so a demo here would silently spend someone's
 * connection on a decoration. This shows what the tool does without running
 * it, and says plainly why there is no `RUN DEMO` button.
 */
function HeavySpecimen({ tool }: { tool: Tool }) {
	const format = tool.accept.ext[0]?.toUpperCase() ?? tool.accept.ext[0];
	return (
		<AsymCard variant="c" aspect="4/3">
			<div
				className="flex h-full flex-col justify-center gap-3 border p-6"
				style={{
					...PALE_CARD_TOKENS,
					borderColor: "var(--ink)",
					borderStyle: "dashed",
				}}
			>
				<span
					className="mono text-[11px] tracking-[0.08em]"
					style={{ color: "var(--ink-muted)" }}
				>
					STATIC SPECIMEN
				</span>
				<p className="text-[13px]" style={{ color: "var(--ink)" }}>
					{format} needs a one-time {tool.heavyDownloadMb}MB download before
					this converter can run, so a live demo here would spend that download
					on a decoration. This shows what it does without running it — open the
					converter to try it for real.
				</p>
			</div>
		</AsymCard>
	);
}
