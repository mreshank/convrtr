"use client";

import { useEffect, useRef, useState } from "react";
import { DropField } from "@/components/instrument/DropField";
import { FidelityBadge } from "@/components/instrument/FidelityBadge";
import { FileReadout } from "@/components/instrument/FileReadout";
import { OptionsPanel } from "@/components/instrument/OptionsPanel";
import { ProgressBar } from "@/components/instrument/ProgressBar";
import { outputFilename, readFile, saveOutput } from "@/core/io";
import { runJob } from "@/core/pipeline/client";
import { makeJobId } from "@/core/pipeline/protocol";
import {
	describeFidelity,
	initialQuality,
	type QualityState,
} from "@/core/quality";
import { getTool } from "@/core/registry";
import { formatBytes, formatDelta } from "@/lib/format";

type Result = { bytes: ArrayBuffer; size: number };

export function ToolClient({ toolId }: { toolId: string }) {
	const tool = getTool(toolId);
	if (!tool) throw new Error(`Unknown tool ${toolId}`);

	const [file, setFile] = useState<File | null>(null);
	const [quality, setQuality] = useState<QualityState>(() =>
		initialQuality(tool),
	);
	const [converting, setConverting] = useState(false);
	const [ratio, setRatio] = useState(0);
	const [phase, setPhase] = useState("");
	const [elapsed, setElapsed] = useState(0);
	const [result, setResult] = useState<Result | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Held so CANCEL has something to call .abort() on — an inline
	// `new AbortController().signal` at the call site would make the signal
	// unreachable from outside the async function that created it.
	const controllerRef = useRef<AbortController | null>(null);
	const startedAtRef = useRef(0);

	useEffect(() => {
		if (!converting) return;
		const timer = window.setInterval(() => {
			setElapsed((Date.now() - startedAtRef.current) / 1000);
		}, 100);
		return () => window.clearInterval(timer);
	}, [converting]);

	const convert = async () => {
		if (!file || converting) return;

		const controller = new AbortController();
		controllerRef.current = controller;

		setError(null);
		setResult(null);
		setRatio(0);
		setPhase("");
		setElapsed(0);
		startedAtRef.current = Date.now();
		setConverting(true);

		try {
			const input = await readFile(file);
			const output = await runJob(
				{
					id: makeJobId(),
					engines: tool.engines,
					input,
					params: quality.params,
				},
				(event) => {
					if (event.type === "progress") {
						setRatio(event.ratio);
						setPhase(event.phase);
					}
				},
				controller.signal,
			);
			setResult({ bytes: output, size: output.byteLength });
		} catch (caught) {
			const cancelled =
				caught instanceof DOMException && caught.name === "AbortError";
			// A cancellation is not an error: the input file stays loaded and
			// re-runnable, with no error message shown.
			if (!cancelled) {
				setError(
					caught instanceof Error ? caught.message : "Conversion failed",
				);
			}
		} finally {
			controllerRef.current = null;
			setConverting(false);
		}
	};

	const cancel = () => {
		controllerRef.current?.abort();
	};

	const save = async () => {
		if (!file || !result) return;
		await saveOutput(
			result.bytes,
			outputFilename(file.name, tool.output.ext),
			tool.output.mime,
		);
	};

	return (
		<main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
			<div className="flex items-start justify-between">
				<h1 className="text-[28px] tracking-[-0.02em]">{tool.seo.h1}</h1>
				<FidelityBadge label={describeFidelity(tool, quality)} />
			</div>

			{!file && (
				<DropField
					accept={tool.accept}
					formats={tool.accept.ext.map((ext) => ext.toUpperCase())}
					onFiles={(files) => setFile(files[0] ?? null)}
				/>
			)}

			{file && (
				<div
					className="flex flex-col gap-6 border p-6"
					style={{
						borderColor: "var(--hairline)",
						borderRadius: "var(--radius)",
					}}
				>
					<FileReadout
						name={file.name}
						facts={[
							(tool.accept.ext[0] ?? tool.output.ext).toUpperCase(),
							formatBytes(file.size),
						]}
					/>

					<OptionsPanel tool={tool} state={quality} onChange={setQuality} />

					{converting && (
						<div className="flex flex-col gap-3">
							<ProgressBar
								ratio={ratio}
								phase={phase || "QUEUED"}
								elapsedSeconds={elapsed}
							/>
							<button
								type="button"
								onClick={cancel}
								className="mono self-end border px-4 py-2 text-[12px]"
								style={{ color: "var(--error)", borderColor: "var(--error)" }}
							>
								CANCEL
							</button>
						</div>
					)}

					{!converting && error && (
						<span
							className="mono text-[12px]"
							style={{ color: "var(--error)" }}
						>
							{error}
						</span>
					)}

					{!converting && result && (
						<div className="flex items-center justify-between">
							<span data-testid="result" className="mono text-[12px]">
								{formatBytes(file.size)} {"→"} {formatBytes(result.size)}{" "}
								{formatDelta(file.size, result.size)}
							</span>
							<button
								type="button"
								onClick={save}
								className="mono border px-4 py-2 text-[12px]"
								style={{ color: "var(--signal)", borderColor: "var(--signal)" }}
							>
								SAVE
							</button>
						</div>
					)}

					{!converting && (
						<button
							type="button"
							onClick={convert}
							className="mono self-end border px-4 py-2 text-[12px]"
							style={{ color: "var(--signal)", borderColor: "var(--signal)" }}
						>
							CONVERT
						</button>
					)}
				</div>
			)}

			<span className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>
				LOCAL ONLY {"·"} 0 BYTES UPLOADED {"·"} WORKS OFFLINE
			</span>
		</main>
	);
}
