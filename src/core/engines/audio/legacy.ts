import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";

function coreUrls() {
	const origin = self.location.origin;
	return {
		coreURL: `${origin}/ffmpeg/ffmpeg-core.js`,
		wasmURL: `${origin}/ffmpeg/ffmpeg-core.wasm`,
		classWorkerURL: `${origin}/ffmpeg/worker.js`,
	};
}

export type LegacyAudioFormat = "opus" | "ogg" | "silk" | "amr";
export type LegacyAudioTarget = "mp3" | "wav";

export function createAudioLegacyEngine(
	from: LegacyAudioFormat,
	to: LegacyAudioTarget,
): Engine {
	return {
		id: `ffmpeg:${from}->${to}`,

		async probe() {
			return typeof WebAssembly === "object";
		},

		async run(
			input: ArrayBuffer,
			_params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			onNotice?: (message: string) => void,
		) {
			onProgress(0.01, "DOWNLOAD");
			const { FFmpeg } = await import("@ffmpeg/ffmpeg");
			const ffmpeg = new FFmpeg();

			const log: string[] = [];
			ffmpeg.on("log", ({ message }) => {
				log.push(message);
				if (log.length > 60) log.shift();
			});

			await ffmpeg.load(coreUrls());

			const inputName = `input.${from}`;
			const outputName = `output.${to}`;
			await ffmpeg.writeFile(inputName, new Uint8Array(input));

			ffmpeg.on("progress", ({ progress }) => {
				if (Number.isFinite(progress) && progress > 0) {
					onProgress(0.1 + Math.min(1, progress) * 0.85, "CONVERT");
				}
			});

			onProgress(0.2, "ENCODE");

			const args =
				to === "mp3"
					? ["-i", inputName, "-c:a", "libmp3lame", "-b:a", "192k", outputName]
					: ["-i", inputName, "-c:a", "pcm_s16le", outputName];

			const code = await ffmpeg.exec(args);

			if (code !== 0) {
				throw new Error(
					`ffmpeg could not convert this audio file (exit ${code}). ${log.slice(-3).join(" ")}`,
				);
			}

			const output = await ffmpeg.readFile(outputName);
			const bytes =
				typeof output === "string" ? new TextEncoder().encode(output) : output;

			if (bytes.length === 0) {
				throw new Error(
					"ffmpeg reported success but produced an empty audio file.",
				);
			}

			onNotice?.(
				"Transcoded to universal MP3 audio for maximum compatibility with all desktop media players and editors.",
			);

			onProgress(1, "COMPLETE");
			return bytes.slice().buffer as ArrayBuffer;
		},
	};
}
