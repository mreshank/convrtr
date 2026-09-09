"use client";

import { useEffect, useState } from "react";
import { getSample } from "@/content/samples/registry";
import { JobError, runJob } from "@/core/pipeline/client";
import { makeJobId } from "@/core/pipeline/protocol";
import {
	describeFidelity,
	fidelityScore,
	fidelityState,
	initialQuality,
} from "@/core/quality";
import { getTool, type Tool } from "@/core/registry";
import { AsymCard, MediaFrame, MonoMeta } from "@/design/primitives";
import { formatBytes, formatDelta } from "@/lib/format";
import { FidelityScore } from "./FidelityScore";
import { FileReadout } from "./FileReadout";

type Props = {
	toolId: string;
	sampleId: string;
};

type Readout = {
	inputBytes: number;
	outputBytes: number;
	elapsedMs: number;
	fidelityLabel: string;
	fidelityValue: number;
	imageUrl?: string;
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
export function LiveDemo({ toolId, sampleId }: Props) {
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
			const quality = initialQuality(tool);
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
				style={{ background: "var(--surface-alt)" }}
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
							fidelity={fidelityState(tool, initialQuality(tool))}
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
					borderColor: "var(--ink)",
					borderStyle: "dashed",
					background: "var(--surface-alt)",
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
