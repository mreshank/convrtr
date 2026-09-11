"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	type BatchRowState,
	BatchTable,
} from "@/components/instrument/BatchTable";
import { DropField } from "@/components/instrument/DropField";
import { ErrorPanel } from "@/components/instrument/ErrorPanel";
import { FidelityScore } from "@/components/instrument/FidelityScore";
import { FileReadout } from "@/components/instrument/FileReadout";
import { HeavyDownloadGate } from "@/components/instrument/HeavyDownloadGate";
import { OptionsPanel } from "@/components/instrument/OptionsPanel";
import { ProgressBar } from "@/components/instrument/ProgressBar";
import {
	canStreamToDisk,
	createOutputFile,
	outputFilename,
	readFile,
	type StagedConversion,
	saveOutput,
	stageFilesForConversion,
} from "@/core/io";
import { preflight } from "@/core/io/preflight";
import { pickSaveFile, SAVE_CANCELLED } from "@/core/io/sink";
import { type ZipEntry, zipOutputs } from "@/core/io/zip";
import type { BatchItem } from "@/core/pipeline/batch";
import { runBatch } from "@/core/pipeline/batch";
import {
	JobError,
	runJob,
	runManyJob,
	runStreamJob,
} from "@/core/pipeline/client";
import { type ErrorCode, makeJobId } from "@/core/pipeline/protocol";
import {
	describeFidelity,
	fidelityScore,
	fidelityState,
	initialQuality,
	type QualityState,
} from "@/core/quality";
import { getTool } from "@/core/registry";
import {
	getAvailableTargetFormatsForFile,
	type TargetOption,
} from "@/core/registry/converter-match";
import { ArrowUpRight } from "@/design/primitives/ArrowUpRight";
import { formatBytes, formatDelta } from "@/lib/format";

/**
 * Which path a conversion actually took, as observed from the engine's own
 * progress phases rather than inferred from the chosen preset.
 *
 * The preset says what was *asked* for. This says what happened — and the two
 * can differ honestly in both directions: a WebM holding AV1 and Opus copies
 * straight into MP4 even though `webm->mp4` conservatively declares that it
 * usually cannot, and a container that turns out not to carry its source codec
 * re-encodes even when a copy was requested. Only image engines emit neither
 * phase, so `path` stays undefined for them and nothing extra is shown.
 */
const HEAVY_DOWNLOAD_KEY = "convrtr:heavy-download-allowed";

type ConversionPath = "copy" | "encode";

type Result = { bytes: ArrayBuffer; size: number; path?: ConversionPath };

/**
 * Reduces a stream of progress phases to the path taken.
 *
 * A single re-encoded track makes the whole operation a re-encode, so
 * "encode" wins once seen and is never downgraded — otherwise a conversion
 * that re-encoded the audio and then copied the video would report a copy.
 */
function observePath(
	current: ConversionPath | null,
	phase: string,
): ConversionPath | null {
	if (phase === "ENCODE") return "encode";
	if (phase === "COPY" && current !== "encode") return "copy";
	return current;
}

function describePath(path: ConversionPath): string {
	return path === "copy" ? "STREAMS COPIED" : "RE-ENCODED";
}

export function ToolClient({ toolId }: { toolId: string }) {
	const router = useRouter();
	const tool = getTool(toolId);
	if (!tool) throw new Error(`Unknown tool ${toolId}`);

	const fromExt = (tool.accept.ext[0] ?? tool.output.ext).toUpperCase();
	const toExt = tool.output.ext.toUpperCase();
	const masterHref = `/convert?from=${encodeURIComponent(fromExt.toLowerCase())}&to=${encodeURIComponent(toExt.toLowerCase())}`;

	// `items` is the source of truth for what's loaded, single file or many.
	// `file` below derives the single-file case from it so the rest of the
	// single-file block — state, handlers, and JSX — is untouched from
	// before batch support existed: same variable, same branches, same
	// `data-testid`s the existing Playwright suite drives.
	const [items, setItems] = useState<BatchItem[]>([]);
	const file = items.length === 1 ? (items[0]?.file ?? null) : null;

	/**
	 * Several files that will become one, rather than several conversions.
	 *
	 * Without this, dropping four PDFs on the merge tool would run the batch
	 * path and hand back four PDFs — each "merged" with nothing.
	 */
	const combining = tool.combinesInputs === true && items.length > 1;

	const [quality, setQuality] = useState<QualityState>(() =>
		initialQuality(tool),
	);
	const [converting, setConverting] = useState(false);
	const [ratio, setRatio] = useState(0);
	const [phase, setPhase] = useState("");
	const [elapsed, setElapsed] = useState(0);
	const [result, setResult] = useState<Result | null>(null);
	/**
	 * A conversion that wrote straight to disk. Separate from `result` because
	 * there are no bytes to hold: the file already exists, so there is nothing
	 * to preview and nothing left to save. Conflating the two would put a SAVE
	 * button in front of a file that had already been written.
	 */
	const [streamed, setStreamed] = useState<{
		bytes: number;
		path?: ConversionPath;
	} | null>(null);
	/**
	 * What preflight decided when the file arrived. Recorded then rather than
	 * at CONVERT time because the save dialog has to open inside the click
	 * handler, leaving no room to work it out first.
	 */
	const [strategy, setStrategy] = useState<"memory" | "stream">("memory");
	/**
	 * Things the engine wants the user to know about a conversion that
	 * succeeded — a track that could not be carried, or a codec combination
	 * that is legal but may not play. Kept in state so they persist beside the
	 * result, rather than flashing past inside a progress bar that disappears
	 * the moment the conversion finishes.
	 */
	const [notices, setNotices] = useState<string[]>([]);

	/**
	 * What the engine actually produced, for the few tools whose output type
	 * depends on the file rather than the tool — extracted cover art is JPEG or
	 * PNG depending on what was embedded. Falls back to the tool's declaration,
	 * which is right for everything else.
	 */
	const [outputType, setOutputType] = useState<{
		ext: string;
		mime: string;
	} | null>(null);
	/**
	 * Length of the loaded file, for tools whose controls are bounded by it.
	 * Undefined until the probe resolves, and for every tool that never asks.
	 */
	const [duration, setDuration] = useState<number | undefined>(undefined);

	/**
	 * Whether the user has agreed to this tool's large one-time download.
	 *
	 * Remembered per browser: the file it pays for is cached by the browser
	 * afterwards, so asking again would be asking about a cost that has already
	 * been paid. Read lazily rather than in an initialiser because localStorage
	 * throws in some privacy modes, and a converter that will not render is a
	 * far worse outcome than one that asks twice.
	 */
	const [downloadAllowed, setDownloadAllowed] = useState(false);
	useEffect(() => {
		if (!tool.heavyDownloadMb) return;
		try {
			if (localStorage.getItem(HEAVY_DOWNLOAD_KEY) === "yes") {
				setDownloadAllowed(true);
			}
		} catch {
			// Storage unavailable; the gate simply shows each session.
		}
	}, [tool.heavyDownloadMb]);

	const allowHeavyDownload = () => {
		setDownloadAllowed(true);
		try {
			localStorage.setItem(HEAVY_DOWNLOAD_KEY, "yes");
		} catch {
			// Not remembering the choice is survivable; refusing to convert is not.
		}
	};
	const [error, setError] = useState<{
		code: ErrorCode;
		detail?: string;
	} | null>(null);

	// Held so CANCEL has something to call .abort() on — an inline
	// `new AbortController().signal` at the call site would make the signal
	// unreachable from outside the async function that created it.
	const controllerRef = useRef<AbortController | null>(null);
	const startedAtRef = useRef(0);

	// --- Batch (2+ files) state. Entirely additive: the single-file state
	// above is never read or written by anything below this point. ---
	const [batchRows, setBatchRows] = useState<BatchRowState[]>([]);
	const [batchConverting, setBatchConverting] = useState(false);
	const [batchElapsed, setBatchElapsed] = useState(0);
	// Driven directly by `onItemEvent`, not derived from `batchRows` — see
	// the comment inside `batchConvert` on why the two can lag each other.
	const [batchSettledCount, setBatchSettledCount] = useState(0);
	const batchControllerRef = useRef<AbortController | null>(null);
	const batchStartedAtRef = useRef(0);
	// Output bytes live outside React state: they are write-once per item,
	// never rendered directly (only their derived size is), and keeping
	// multi-megabyte ArrayBuffers out of state avoids re-render churn as
	// other rows keep progressing.
	const batchOutputsRef = useRef<
		Map<string, { output: ArrayBuffer; outputName: string }>
	>(new Map());

	useEffect(() => {
		if (!converting) return;
		const timer = window.setInterval(() => {
			setElapsed((Date.now() - startedAtRef.current) / 1000);
		}, 100);
		return () => window.clearInterval(timer);
	}, [converting]);

	useEffect(() => {
		if (!batchConverting) return;
		const timer = window.setInterval(() => {
			setBatchElapsed((Date.now() - batchStartedAtRef.current) / 1000);
		}, 100);
		return () => window.clearInterval(timer);
	}, [batchConverting]);

	const handleFiles = (dropped: File[]) => {
		// Check capacity at the moment the file arrives, not when CONVERT is
		// pressed. Reading a file this device cannot hold kills the tab with no
		// error at all — the user sees a crash they would reasonably blame on
		// the site. Refusing here means they find out while they can still do
		// something about it.
		const largest = dropped.reduce(
			(worst, candidate) => (candidate.size > worst.size ? candidate : worst),
			dropped[0] ?? new File([], ""),
		);
		const verdict = preflight(largest.size);
		if (!verdict.ok) {
			setItems([]);
			setBatchRows([]);
			setError({
				code: "OUT_OF_MEMORY",
				detail: `${verdict.reason} ${verdict.suggestion}`,
			});
			return;
		}

		setError(null);
		setStrategy(verdict.strategy);
		setDuration(undefined);

		// Only for tools that need it, and only ever for the first file: a time
		// range over a batch would mean applying one file's timeline to another.
		// Both time controls are bounded by the file, so both need the probe.
		// Listing only `timerange` here left the frame tool's slider stuck at a
		// maximum of zero — the control rendered, and was simply unusable.
		const needsDuration = tool.quality.advanced.some(
			(param) => param.control === "timerange" || param.control === "timestamp",
		);
		const first = dropped[0];
		if (needsDuration && first) {
			// Fire and forget. A failed probe leaves the control at zero rather
			// than blocking the drop — the conversion itself reports a file it
			// cannot read far more clearly than a silent failure here would.
			void import("@/core/engines/video/probe")
				.then(({ probeDuration }) => probeDuration(first))
				.then((seconds) => {
					setDuration(seconds);
					// An untouched range means "the whole file", so seed the end
					// handle rather than leaving it at zero, where it would read
					// as an empty selection.
					setQuality((current) =>
						current.params.end === 0
							? { ...current, params: { ...current.params, end: seconds } }
							: current,
					);
				})
				.catch(() => setDuration(undefined));
		}
		const newItems: BatchItem[] = dropped.map((droppedFile) => ({
			id: makeJobId(),
			file: droppedFile,
		}));
		setItems(newItems);
		batchOutputsRef.current = new Map();
		setBatchSettledCount(0);
		setBatchRows(
			newItems.length > 1
				? newItems.map((item) => ({
						id: item.id,
						name: item.file.name,
						inputSize: item.file.size,
						status: "queued" as const,
					}))
				: [],
		);
	};

	const convert = async () => {
		if (!file || converting) return;

		const controller = new AbortController();
		controllerRef.current = controller;

		setError(null);
		setResult(null);
		setStreamed(null);
		setNotices([]);
		setOutputType(null);
		setRatio(0);
		setPhase("");
		setElapsed(0);

		// Stream when the file is big enough for preflight to say so, the tool's
		// engines can do it, and the browser can write to disk without buffering.
		// All three have to hold: streaming a small file only costs the user an
		// extra dialog, and claiming to stream without the capability would fail
		// after the work rather than before it.
		const willStream =
			strategy === "stream" && tool.streamable === true && canStreamToDisk();

		// The dialog must open in the same task as the click, so this happens
		// before any await that is not itself part of showing it.
		let handle: FileSystemFileHandle | null = null;
		if (willStream) {
			try {
				const picked = await pickSaveFile(
					outputFilename(file.name, tool.output.ext),
					tool.output.mime,
				);
				// Dismissing the dialog means the user chose not to convert, which
				// is not an error and must not leave a spinner running.
				if (picked === SAVE_CANCELLED) {
					controllerRef.current = null;
					return;
				}
				handle = picked;
			} catch (caught) {
				setError({
					code: "ENGINE_FAILURE",
					detail: caught instanceof Error ? caught.message : undefined,
				});
				controllerRef.current = null;
				return;
			}
		}

		startedAtRef.current = Date.now();
		setConverting(true);

		try {
			// Accumulated in a local rather than state: a state setter read back
			// in the same async function would see the value from this render,
			// not the one just written.
			let observed: ConversionPath | null = null;

			if (handle) {
				const bytes = await runStreamJob(
					{
						id: makeJobId(),
						engines: tool.engines,
						// The File itself, not its bytes: the demuxer slices it as it
						// reads, which is the whole reason this path exists.
						input: file,
						params: quality.params,
						handle,
						mode: "stream",
					},
					(event) => {
						if (event.type === "progress") {
							setRatio(event.ratio);
							setPhase(event.phase);
							observed = observePath(observed, event.phase);
						}
						if (event.type === "notice") {
							setNotices((current) => [...current, event.message]);
						}
					},
					controller.signal,
				);
				setStreamed({ bytes, path: observed ?? undefined });
				return;
			}

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
						observed = observePath(observed, event.phase);
					}
					if (event.type === "notice") {
						setNotices((current) => [...current, event.message]);
					}
					if (event.type === "outputType") {
						setOutputType({ ext: event.ext, mime: event.mime });
					}
				},
				controller.signal,
			);
			setResult({
				bytes: output,
				size: output.byteLength,
				path: observed ?? undefined,
			});
		} catch (caught) {
			const cancelled =
				caught instanceof DOMException && caught.name === "AbortError";
			// A cancellation is not an error: the input file stays loaded and
			// re-runnable, with no error message shown.
			if (!cancelled) {
				// The worker assigns a taxonomy code and JobError carries it to
				// here; anything else that escapes is genuinely an unclassified
				// converter failure.
				setError({
					code: caught instanceof JobError ? caught.code : "ENGINE_FAILURE",
					detail: caught instanceof Error ? caught.message : undefined,
				});
			}
		} finally {
			controllerRef.current = null;
			setConverting(false);
		}
	};

	const convertMany = async () => {
		if (!combining || converting) return;

		const controller = new AbortController();
		controllerRef.current = controller;

		setError(null);
		setResult(null);
		setStreamed(null);
		setNotices([]);
		setOutputType(null);
		setRatio(0);
		setPhase("");
		setElapsed(0);
		startedAtRef.current = Date.now();
		setConverting(true);

		try {
			// Read in the order dropped: that order is the page order, and the
			// tool's copy says so.
			const inputs = await Promise.all(
				items.map((item) => readFile(item.file)),
			);
			const output = await runManyJob(
				{
					id: makeJobId(),
					engines: tool.engines,
					inputs,
					params: quality.params,
					mode: "many",
				},
				(event) => {
					if (event.type === "progress") {
						setRatio(event.ratio);
						setPhase(event.phase);
					}
					if (event.type === "notice") {
						setNotices((current) => [...current, event.message]);
					}
				},
				controller.signal,
			);
			setResult({ bytes: output, size: output.byteLength });
		} catch (caught) {
			const cancelled =
				caught instanceof DOMException && caught.name === "AbortError";
			if (!cancelled) {
				setError({
					code: caught instanceof JobError ? caught.code : "ENGINE_FAILURE",
					detail: caught instanceof Error ? caught.message : undefined,
				});
			}
		} finally {
			controllerRef.current = null;
			setConverting(false);
		}
	};

	const saveCombined = async () => {
		if (!result) return;
		// Named after the tool rather than any one input: none of the inputs is
		// "the" source, and picking the first would be arbitrary.
		await saveOutput(
			result.bytes,
			`${tool.slug}.${tool.output.ext}`,
			tool.output.mime,
		);
	};

	const cancel = () => {
		controllerRef.current?.abort();
	};

	const replace = () => {
		if (converting || batchConverting) return;
		setItems([]);
		setBatchRows([]);
		batchOutputsRef.current = new Map();
		setBatchSettledCount(0);
		setQuality(initialQuality(tool));
		setResult(null);
		setStreamed(null);
		setStrategy("memory");
		setNotices([]);
		setOutputType(null);
		setDuration(undefined);
		setError(null);
		setRatio(0);
		setPhase("");
		setElapsed(0);
	};

	const save = async () => {
		if (!file || !result) return;
		await saveOutput(
			result.bytes,
			outputFilename(file.name, outputType?.ext ?? tool.output.ext),
			outputType?.mime ?? tool.output.mime,
		);
	};

	// --- Batch handlers ---

	const batchConvert = async () => {
		if (items.length <= 1 || batchConverting) return;

		const controller = new AbortController();
		batchControllerRef.current = controller;

		batchOutputsRef.current = new Map();
		setBatchRows(
			items.map((item) => ({
				id: item.id,
				name: item.file.name,
				inputSize: item.file.size,
				status: "queued",
			})),
		);
		batchStartedAtRef.current = Date.now();
		setBatchElapsed(0);
		setBatchSettledCount(0);
		setBatchConverting(true);

		// Counts settlements as `onItemEvent` reports them, independent of
		// `batchRows` state, so the aggregate progress bar below ticks up per
		// file in real time rather than jumping from 0 to N only once the
		// whole batch (see the comment on `runBatch`'s return below) settles.
		const settledIds = new Set<string>();

		const outcomes = await runBatch(
			items,
			{
				engines: tool.engines,
				params: quality.params,
				outputExt: tool.output.ext,
			},
			(event) => {
				if (event.type === "progress") {
					setBatchRows((prev) =>
						prev.map((row) =>
							row.id === event.id
								? {
										id: row.id,
										name: row.name,
										inputSize: row.inputSize,
										status: "converting",
										ratio: event.ratio,
										phase: event.phase,
									}
								: row,
						),
					);
					return;
				}

				settledIds.add(event.id);
				setBatchSettledCount(settledIds.size);

				// `error` and `cancelled` events carry everything a final row
				// needs, so they can flip immediately. `done` cannot: the
				// event says an item finished, but its output bytes only
				// become available once every item in the batch has settled
				// and `runBatch` returns them below — so a `done` row here
				// deliberately still omits `outputSize` (see `BatchRowState`)
				// and the final pass after the await fills it in.
				if (event.type === "error") {
					setBatchRows((prev) =>
						prev.map((row) =>
							row.id === event.id
								? {
										id: row.id,
										name: row.name,
										inputSize: row.inputSize,
										status: "error",
										code: event.code,
										message: event.message,
									}
								: row,
						),
					);
				} else if (event.type === "cancelled") {
					setBatchRows((prev) =>
						prev.map((row) =>
							row.id === event.id
								? {
										id: row.id,
										name: row.name,
										inputSize: row.inputSize,
										status: "cancelled",
									}
								: row,
						),
					);
				} else if (event.type === "done") {
					// The event now carries the converted bytes, so a finished
					// file becomes saveable the moment it finishes rather than
					// when the slowest file in the batch does. On a folder of
					// 200 photos that is the difference between per-row actions
					// meaning something and being decorative.
					setBatchRows((prev) =>
						prev.map((row) =>
							row.id === event.id
								? {
										id: row.id,
										name: row.name,
										inputSize: row.inputSize,
										status: "done",
										outputSize: event.outputSize,
									}
								: row,
						),
					);
					batchOutputsRef.current.set(event.id, {
						output: event.output,
						outputName: event.outputName,
					});
				}
			},
			controller.signal,
		);

		for (const outcome of outcomes) {
			if (outcome.status === "done") {
				batchOutputsRef.current.set(outcome.id, {
					output: outcome.output,
					outputName: outcome.outputName,
				});
			}
		}

		setBatchRows((prev) =>
			prev.map((row): BatchRowState => {
				const outcome = outcomes.find((candidate) => candidate.id === row.id);
				if (!outcome) return row;
				if (outcome.status === "done") {
					return {
						id: row.id,
						name: row.name,
						inputSize: row.inputSize,
						status: "done",
						outputSize: outcome.outputSize,
					};
				}
				if (outcome.status === "error") {
					return {
						id: row.id,
						name: row.name,
						inputSize: row.inputSize,
						status: "error",
						code: outcome.code,
						message: outcome.message,
					};
				}
				return {
					id: row.id,
					name: row.name,
					inputSize: row.inputSize,
					status: "cancelled",
				};
			}),
		);

		batchControllerRef.current = null;
		setBatchConverting(false);
	};

	const batchCancel = () => {
		batchControllerRef.current?.abort();
	};

	const saveRow = async (id: string) => {
		const output = batchOutputsRef.current.get(id);
		if (!output) return;
		await saveOutput(output.output, output.outputName, tool.output.mime);
	};

	const saveAllZip = async () => {
		const entries: ZipEntry[] = [];
		for (const row of batchRows) {
			if (row.status !== "done") continue;
			const output = batchOutputsRef.current.get(row.id);
			if (!output) continue;
			entries.push({ name: output.outputName, data: output.output });
		}
		if (entries.length === 0) return;
		const blob = await zipOutputs(entries);
		const bytes = await blob.arrayBuffer();
		await saveOutput(bytes, `${tool.slug}.zip`, "application/zip");
	};

	const outputExt = (outputType?.ext ?? tool.output.ext).toLowerCase();
	const availableNextTargets = useMemo(() => {
		if (!result || !outputExt) return [];
		return getAvailableTargetFormatsForFile(outputExt);
	}, [result, outputExt]);

	const availableBatchNextTargets = useMemo(() => {
		if (!tool.output.ext) return [];
		return getAvailableTargetFormatsForFile(tool.output.ext.toLowerCase());
	}, [tool.output.ext]);

	const continueSingleConversion = (targetExt?: string) => {
		if (!result || !file) return;
		const ext = outputType?.ext ?? tool.output.ext;
		const mime = outputType?.mime ?? tool.output.mime;
		const filename = outputFilename(file.name, ext);
		const outputFile = createOutputFile(result.bytes, filename, mime);

		stageFilesForConversion([
			{
				file: outputFile,
				targetExt,
				parentName: file.name,
				step: 2,
			},
		]);
		const targetQuery = targetExt
			? `&to=${encodeURIComponent(targetExt.toLowerCase())}`
			: "";
		router.push(
			`/convert?from=${encodeURIComponent(ext.toLowerCase())}${targetQuery}`,
		);
	};

	const continueBatchRow = (id: string, targetExt?: string) => {
		const output = batchOutputsRef.current.get(id);
		if (!output) return;
		const outputFile = createOutputFile(
			output.output,
			output.outputName,
			tool.output.mime,
		);
		const row = batchRows.find((r) => r.id === id);
		stageFilesForConversion([
			{
				file: outputFile,
				targetExt,
				parentName: row?.name,
				step: 2,
			},
		]);
		const targetQuery = targetExt
			? `&to=${encodeURIComponent(targetExt.toLowerCase())}`
			: "";
		router.push(
			`/convert?from=${encodeURIComponent(tool.output.ext.toLowerCase())}${targetQuery}`,
		);
	};

	const continueAllBatch = (targetExt?: string) => {
		const staged: StagedConversion[] = [];
		for (const row of batchRows) {
			if (row.status !== "done") continue;
			const output = batchOutputsRef.current.get(row.id);
			if (!output) continue;
			const outputFile = createOutputFile(
				output.output,
				output.outputName,
				tool.output.mime,
			);
			staged.push({
				file: outputFile,
				targetExt,
				parentName: row.name,
				step: 2,
			});
		}
		if (staged.length === 0) return;
		stageFilesForConversion(staged);
		const targetQuery = targetExt
			? `&to=${encodeURIComponent(targetExt.toLowerCase())}`
			: "";
		router.push(
			`/convert?from=${encodeURIComponent(tool.output.ext.toLowerCase())}${targetQuery}`,
		);
	};

	const batchDoneCount = batchSettledCount;
	const batchAggregateRatio =
		batchRows.length > 0 ? batchDoneCount / batchRows.length : 0;
	const batchHasSaveable = batchRows.some((row) => row.status === "done");
	const batchFidelity = {
		score: fidelityScore(tool, quality),
		label: describeFidelity(tool, quality),
		state: fidelityState(tool, quality),
	};

	return (
		<div className="flex w-full flex-col gap-[var(--gap-md)] p-[calc(var(--space-base)*4)]">
			{/*
			 * No <h1> here: ConverterPage (the template wrapping this component)
			 * owns the page's one heading, and renders `tool.seo.h1` there. This
			 * used to duplicate that exact text in a second <h1>, which broke
			 * the document outline for screen readers and confused Playwright's
			 * strict-mode heading locators. FidelityScore keeps its original
			 * top-right position via `justify-end` now that it's the row's only
			 * child.
			 *
			 * This was also a <main>, nested inside layout.tsx's own <main
			 * className="flex-1">. HTML forbids nesting main landmarks, and a
			 * screen reader announced this page's main region twice. layout.tsx
			 * owns the page's one main landmark for every route; the instrument
			 * is content inside the page, not the page itself, so this is a
			 * <div> now.
			 *
			 * `mx-auto w-full max-w-4xl` used to live here, capping and centring
			 * this div at 896px independently of ConverterPage — the same 896
			 * expressed a second, unrelated way (Tailwind's `max-w-4xl` literal)
			 * right beside the page heading, which sat in the surrounding
			 * 1600px frame and never matched it: the title measured ~328px left
			 * of the instrument it names at 1920px. `ConverterPage` now wraps
			 * this component in a `[data-converter-measure]` element — the same
			 * `--converter-width` (896px) token its heading pieces measure
			 * against — so this div only needs `w-full` to reach exactly the
			 * width that ancestor already caps and centres. Two 896s that had
			 * to independently agree are one token now; a bare `max-w-4xl` here
			 * would put the second one right back.
			 *
			 * `gap-6` (24px) was `--gap-md` exactly, so it is now
			 * `gap-[var(--gap-md)]`. `p-8` (32px) matched nothing in the scale
			 * (8/12/24/80px) but is 4 × `--space-base` (8px), so it is now
			 * `p-[calc(var(--space-base)*4)]` rather than a bare literal or a
			 * new token.
			 */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<Link
					href={masterHref}
					data-testid="open-master-converter-btn"
					className="group inline-flex items-center gap-2 border px-3 py-1.5 mono text-[11px] transition-all hover:border-[var(--accent)] hover:bg-[var(--surface)]"
					style={{
						borderColor: "var(--rule)",
						borderRadius: "var(--radius)",
						background: "var(--ground)",
						color: "var(--ink)",
						textDecoration: "none",
					}}
					title={`Open Master Converter with ${fromExt} → ${toExt} preset`}
				>
					<span
						className="h-1.5 w-1.5 rounded-full"
						style={{ background: "var(--accent)" }}
					/>
					<span className="tracking-[0.04em]">OPEN IN MASTER CONVERTER</span>
					<span
						className="border px-1.5 py-0.5 text-[10px]"
						style={{
							borderColor: "var(--rule-strong)",
							borderRadius: "var(--radius)",
							color: "var(--accent)",
							background: "var(--surface)",
						}}
					>
						{fromExt} → {toExt}
					</span>
					<ArrowUpRight
						size={12}
						className="opacity-70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
					/>
				</Link>

				<FidelityScore
					score={fidelityScore(tool, quality)}
					label={describeFidelity(tool, quality)}
					fidelity={fidelityState(tool, quality)}
				/>
			</div>

			{items.length === 0 && (
				<div className="flex flex-col gap-3">
					<DropField
						accept={tool.accept}
						formats={tool.accept.ext.map((ext) => ext.toUpperCase())}
						onFiles={handleFiles}
					/>
					<div
						className="flex flex-wrap items-center justify-between gap-3 border border-dashed px-4 py-3"
						style={{
							borderColor: "var(--rule)",
							borderRadius: "var(--radius)",
							background: "var(--surface)",
						}}
					>
						<div className="flex items-center gap-2">
							<span
								className="mono text-[10px] tracking-[0.06em]"
								style={{ color: "var(--accent)" }}
							>
								[ BATCH & MULTI-FILE STUDIO ]
							</span>
							<span
								className="text-[12px]"
								style={{ color: "var(--ink-muted)" }}
							>
								Want to batch convert multiple {fromExt} files to {toExt}{" "}
								simultaneously or mix formats?
							</span>
						</div>
						<Link
							href={masterHref}
							className="mono inline-flex items-center gap-1.5 text-[11px] underline underline-offset-4 transition-colors hover:text-[var(--accent)]"
							style={{ color: "var(--ink)" }}
						>
							<span>Open this config in Master Studio</span>
							<ArrowUpRight size={12} />
						</Link>
					</div>
				</div>
			)}

			{file && (
				<div
					className="flex flex-col gap-6 border p-6"
					style={{
						borderColor: "var(--rule)",
						borderRadius: "var(--radius)",
					}}
				>
					<div className="flex items-start justify-between gap-4">
						<FileReadout
							name={file.name}
							facts={[
								(tool.accept.ext[0] ?? tool.output.ext).toUpperCase(),
								formatBytes(file.size),
							]}
						/>
						<button
							type="button"
							onClick={replace}
							disabled={converting}
							className="mono border px-3 py-1 text-[11px]"
							style={{
								color: "var(--ink-muted)",
								borderColor: "var(--rule)",
								borderRadius: "var(--radius)",
								background: "transparent",
							}}
						>
							REPLACE
						</button>
					</div>

					<OptionsPanel
						tool={tool}
						state={quality}
						onChange={setQuality}
						duration={duration}
					/>

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
								style={{
									color: "var(--ink)",
									borderColor: "var(--ink)",
									borderStyle: "dashed",
								}}
							>
								CANCEL
							</button>
						</div>
					)}

					{!converting && error && (
						<ErrorPanel
							code={error.code}
							detail={error.detail}
							inputFormat={tool.accept.ext[0]?.toUpperCase()}
							onRetry={convert}
							onDismiss={() => setError(null)}
						/>
					)}

					{!converting && result && (
						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<span data-testid="result" className="mono text-[12px]">
									{formatBytes(file.size)} {"→"} {formatBytes(result.size)}{" "}
									{formatDelta(file.size, result.size)}
									{result.path ? ` · ${describePath(result.path)}` : ""}
								</span>
								<div className="flex items-center gap-2">
									<button
										type="button"
										data-testid="continue-conversion-btn"
										onClick={() => continueSingleConversion()}
										aria-label="Continue converting output file"
										className="mono border px-3 py-2 text-[12px] font-medium transition-all hover:bg-[var(--accent)] hover:text-[var(--ground)]"
										style={{
											color: "var(--accent)",
											borderColor: "var(--accent)",
											borderRadius: "var(--radius)",
											background: "transparent",
											cursor: "pointer",
										}}
									>
										CONTINUE CONVERTING →
									</button>
									<button
										type="button"
										onClick={save}
										className="mono border px-4 py-2 text-[12px]"
										style={{
											color: "var(--ink)",
											borderColor: "var(--ink)",
											borderRadius: "var(--radius)",
											cursor: "pointer",
										}}
									>
										SAVE
									</button>
								</div>
							</div>

							{availableNextTargets.length > 0 && (
								<div
									data-testid="direct-target-pills"
									className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-dashed"
									style={{ borderColor: "var(--rule)" }}
								>
									<span
										className="mono text-[10px]"
										style={{ color: "var(--ink-muted)" }}
									>
										CONTINUE AS:
									</span>
									{availableNextTargets.slice(0, 4).map((opt: TargetOption) => (
										<button
											key={opt.ext}
											type="button"
											data-testid={`continue-as-${opt.ext}`}
											onClick={() => continueSingleConversion(opt.ext)}
											aria-label={`Continue conversion to ${opt.label}`}
											className="mono border px-2 py-0.5 text-[10px] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
											style={{
												color: "var(--ink)",
												borderColor: "var(--rule-strong)",
												borderRadius: "var(--radius)",
												background: "var(--surface)",
												cursor: "pointer",
											}}
										>
											→ {opt.label}
										</button>
									))}
								</div>
							)}
						</div>
					)}

					{!converting && streamed && (
						<div className="flex items-center justify-between">
							<span data-testid="streamed" className="mono text-[12px]">
								{formatBytes(file.size)} {"→"} {formatBytes(streamed.bytes)}{" "}
								{formatDelta(file.size, streamed.bytes)}
								{streamed.path ? ` · ${describePath(streamed.path)}` : ""} {"·"}{" "}
								SAVED TO DISK
							</span>
						</div>
					)}

					{!converting && notices.length > 0 && (
						<ul
							data-testid="notices"
							className="flex flex-col gap-2 border p-4 text-[13px]"
							style={{
								borderColor: "var(--ink)",
								borderStyle: "dashed",
								borderRadius: "var(--radius)",
								color: "var(--ink)",
							}}
						>
							{notices.map((notice) => (
								<li key={notice}>{notice}</li>
							))}
						</ul>
					)}

					{!converting && tool.heavyDownloadMb && !downloadAllowed && (
						<HeavyDownloadGate
							megabytes={tool.heavyDownloadMb}
							formatLabel={(tool.accept.ext[0] ?? "").toUpperCase()}
							onAccept={() => {
								allowHeavyDownload();
								void convert();
							}}
						/>
					)}

					{!converting && !(tool.heavyDownloadMb && !downloadAllowed) && (
						<button
							type="button"
							onClick={convert}
							className="mono self-end border px-4 py-2 text-[12px]"
							style={{
								color: "var(--ink)",
								borderColor: "var(--ink)",
							}}
						>
							CONVERT
						</button>
					)}
				</div>
			)}

			{combining && (
				<div
					className="flex flex-col gap-6 border p-6"
					style={{
						borderColor: "var(--rule)",
						borderRadius: "var(--radius)",
					}}
				>
					<div className="flex items-start justify-between gap-4">
						<FileReadout
							name={`${items.length} FILES`}
							facts={[
								(tool.accept.ext[0] ?? "").toUpperCase(),
								formatBytes(
									items.reduce((sum, item) => sum + item.file.size, 0),
								),
							]}
						/>
						<button
							type="button"
							onClick={replace}
							className="mono border px-4 py-2 text-[12px]"
							style={{
								color: "var(--ink-muted)",
								borderColor: "var(--rule)",
							}}
						>
							REPLACE
						</button>
					</div>

					{/* Numbered, because this order is the page order and the user
					    needs to be able to check it before converting. */}
					<ol
						data-testid="combine-order"
						className="flex flex-col gap-1"
						style={{ color: "var(--ink-muted)" }}
					>
						{items.map((item, index) => (
							<li key={item.id} className="mono text-[12px]">
								{index + 1}. {item.file.name}
							</li>
						))}
					</ol>

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
								style={{
									color: "var(--ink)",
									borderColor: "var(--ink)",
									borderStyle: "dashed",
								}}
							>
								CANCEL
							</button>
						</div>
					)}

					{!converting && error && (
						<ErrorPanel
							code={error.code}
							detail={error.detail}
							inputFormat={tool.accept.ext[0]?.toUpperCase()}
							onRetry={convertMany}
							onDismiss={() => setError(null)}
						/>
					)}

					{!converting && notices.length > 0 && (
						<ul
							data-testid="notices"
							className="flex flex-col gap-2 border p-4 text-[13px]"
							style={{
								borderColor: "var(--ink)",
								borderStyle: "dashed",
								borderRadius: "var(--radius)",
								color: "var(--ink)",
							}}
						>
							{notices.map((notice) => (
								<li key={notice}>{notice}</li>
							))}
						</ul>
					)}

					{!converting && result && (
						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<span data-testid="result" className="mono text-[12px]">
									{items.length} {"→"} 1 {"·"} {formatBytes(result.size)}
								</span>
								<div className="flex items-center gap-2">
									<button
										type="button"
										data-testid="continue-conversion-btn"
										onClick={() => continueSingleConversion()}
										aria-label="Continue converting output file"
										className="mono border px-3 py-2 text-[12px] font-medium transition-all hover:bg-[var(--accent)] hover:text-[var(--ground)]"
										style={{
											color: "var(--accent)",
											borderColor: "var(--accent)",
											borderRadius: "var(--radius)",
											background: "transparent",
											cursor: "pointer",
										}}
									>
										CONTINUE CONVERTING →
									</button>
									<button
										type="button"
										onClick={saveCombined}
										className="mono border px-4 py-2 text-[12px]"
										style={{ color: "var(--ink)", borderColor: "var(--ink)" }}
									>
										SAVE
									</button>
								</div>
							</div>

							{availableNextTargets.length > 0 && (
								<div
									data-testid="combine-direct-target-pills"
									className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-dashed"
									style={{ borderColor: "var(--rule)" }}
								>
									<span
										className="mono text-[10px]"
										style={{ color: "var(--ink-muted)" }}
									>
										CONTINUE AS:
									</span>
									{availableNextTargets.slice(0, 4).map((opt: TargetOption) => (
										<button
											key={opt.ext}
											type="button"
											data-testid={`combine-continue-as-${opt.ext}`}
											onClick={() => continueSingleConversion(opt.ext)}
											aria-label={`Continue conversion to ${opt.label}`}
											className="mono border px-2 py-0.5 text-[10px] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
											style={{
												color: "var(--ink)",
												borderColor: "var(--rule-strong)",
												borderRadius: "var(--radius)",
												background: "var(--surface)",
												cursor: "pointer",
											}}
										>
											→ {opt.label}
										</button>
									))}
								</div>
							)}
						</div>
					)}

					{!converting && (
						<button
							type="button"
							onClick={convertMany}
							className="mono self-end border px-4 py-2 text-[12px]"
							style={{ color: "var(--ink)", borderColor: "var(--ink)" }}
						>
							CONVERT
						</button>
					)}
				</div>
			)}

			{items.length > 1 && !combining && (
				<div
					className="flex flex-col gap-6 border p-6"
					style={{
						borderColor: "var(--rule)",
						borderRadius: "var(--radius)",
					}}
				>
					<div className="flex items-start justify-between gap-4">
						<FileReadout
							name={`${items.length} FILES`}
							facts={[
								(tool.accept.ext[0] ?? tool.output.ext).toUpperCase(),
								formatBytes(
									items.reduce((sum, item) => sum + item.file.size, 0),
								),
							]}
						/>
						<button
							type="button"
							onClick={replace}
							disabled={batchConverting}
							className="mono border px-3 py-1 text-[11px]"
							style={{
								color: "var(--ink-muted)",
								borderColor: "var(--rule)",
								borderRadius: "var(--radius)",
								background: "transparent",
							}}
						>
							REPLACE
						</button>
					</div>

					<OptionsPanel tool={tool} state={quality} onChange={setQuality} />

					<BatchTable
						rows={batchRows}
						fidelity={batchFidelity}
						onSaveRow={saveRow}
						onContinueRow={continueBatchRow}
						inputFormat={tool.accept.ext[0]?.toUpperCase()}
					/>

					{batchConverting && (
						<div className="flex flex-col gap-3">
							<ProgressBar
								ratio={batchAggregateRatio}
								phase={`${batchDoneCount}/${batchRows.length} FILES`}
								elapsedSeconds={batchElapsed}
							/>
							<button
								type="button"
								onClick={batchCancel}
								className="mono self-end border px-4 py-2 text-[12px]"
								style={{
									color: "var(--ink)",
									borderColor: "var(--ink)",
									borderStyle: "dashed",
								}}
							>
								CANCEL
							</button>
						</div>
					)}

					{!batchConverting && (
						<div className="flex flex-wrap items-center justify-end gap-3">
							{batchHasSaveable && (
								<>
									<button
										type="button"
										data-testid="batch-continue-btn"
										onClick={() => continueAllBatch()}
										className="mono border px-4 py-2 text-[12px] font-medium transition-all hover:bg-[var(--accent)] hover:text-[var(--ground)]"
										style={{
											color: "var(--accent)",
											borderColor: "var(--accent)",
											borderRadius: "var(--radius)",
											background: "transparent",
											cursor: "pointer",
										}}
									>
										CONTINUE WITH OUTPUTS →
									</button>
									{availableBatchNextTargets
										.slice(0, 3)
										.map((opt: TargetOption) => (
											<button
												key={opt.ext}
												type="button"
												data-testid={`batch-continue-as-${opt.ext}`}
												onClick={() => continueAllBatch(opt.ext)}
												className="mono border px-3 py-2 text-[11px] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
												style={{
													color: "var(--ink)",
													borderColor: "var(--rule-strong)",
													borderRadius: "var(--radius)",
													background: "var(--surface)",
													cursor: "pointer",
												}}
											>
												→ {opt.label}
											</button>
										))}
									<button
										type="button"
										onClick={saveAllZip}
										className="mono border px-4 py-2 text-[12px]"
										style={{
											color: "var(--ink)",
											borderColor: "var(--ink)",
										}}
									>
										SAVE ALL (ZIP)
									</button>
								</>
							)}
							<button
								type="button"
								onClick={batchConvert}
								className="mono border px-4 py-2 text-[12px]"
								style={{
									color: "var(--ink)",
									borderColor: "var(--ink)",
								}}
							>
								CONVERT
							</button>
						</div>
					)}
				</div>
			)}

			<span className="mono text-[11px]" style={{ color: "var(--ink-muted)" }}>
				LOCAL ONLY {"·"} 0 BYTES UPLOADED {"·"} WORKS OFFLINE
			</span>
		</div>
	);
}
