import type { ParamValue } from "@/core/quality";
import { pngEncoder } from "../image/encoders/png";
import type { Engine } from "../types";
import { decodeFlac } from "./flac";
import { parseWav, type WavAudio } from "./wav";

/**
 * Draws a waveform image from an audio file.
 *
 * The only tool here with no fidelity claim to make: it produces a picture of
 * audio, not audio, so "lossless" does not apply in either direction. What it
 * can be is *accurate*, and that turns on one decision — how a column of pixels
 * summarises the samples underneath it.
 *
 * Each column covers many samples: a three-minute track at 44.1kHz drawn 1000
 * pixels wide is roughly 8,000 samples per column. Sampling one of them, which
 * is the obvious approach, produces a picture that changes shape depending on
 * which samples happen to be landed on — and badly understates transients,
 * because a snare hit lasting a few hundred samples is usually missed
 * entirely. This takes the minimum and maximum across the whole column, so
 * every peak in the file is visible in the drawing. That is also what audio
 * editors do, and why their waveforms look like the sound.
 */

type Scheme = {
	background: [number, number, number, number];
	wave: [number, number, number, number];
};

/**
 * Palettes rather than free colour choice: the registry has no colour control,
 * and three defensible options beat a hex field nobody wants to type into.
 */
const SCHEMES: Record<string, Scheme> = {
	dark: { background: [10, 10, 10, 255], wave: [180, 255, 90, 255] },
	light: { background: [255, 255, 255, 255], wave: [20, 20, 20, 255] },
	// Fully transparent background, for dropping onto a page or slide.
	transparent: { background: [0, 0, 0, 0], wave: [20, 20, 20, 255] },
};

function clamp(
	value: ParamValue | undefined,
	fallback: number,
	min: number,
	max: number,
): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	return Math.min(max, Math.max(min, Math.round(value)));
}

function render(
	audio: WavAudio,
	params: Record<string, ParamValue>,
): ImageData {
	const width = clamp(params.width, 1200, 200, 4000);
	const height = clamp(params.height, 300, 80, 1200);
	const schemeName = typeof params.scheme === "string" ? params.scheme : "dark";
	const scheme = SCHEMES[schemeName] ?? SCHEMES.dark;
	if (!scheme) throw new Error("Unknown colour scheme.");

	const frames = audio.samples[0]?.length ?? 0;
	if (frames === 0) throw new Error("This file contains no audio to draw.");

	const pixels = new Uint8ClampedArray(width * height * 4);
	// Fill the background first; the wave is drawn over it.
	for (let i = 0; i < width * height; i++) {
		pixels[i * 4] = scheme.background[0];
		pixels[i * 4 + 1] = scheme.background[1];
		pixels[i * 4 + 2] = scheme.background[2];
		pixels[i * 4 + 3] = scheme.background[3];
	}

	const scale = 2 ** (audio.bitsPerSample - 1);
	const middle = height / 2;
	const perColumn = frames / width;

	for (let column = 0; column < width; column++) {
		const from = Math.floor(column * perColumn);
		const to = Math.min(frames, Math.floor((column + 1) * perColumn));

		// Minimum and maximum across every sample in the column, averaged over
		// channels so a stereo file draws as one shape rather than two overlaid.
		let low = 0;
		let high = 0;
		for (let i = from; i < to; i++) {
			let sum = 0;
			for (const channel of audio.samples) sum += channel[i] ?? 0;
			const value = sum / audio.samples.length / scale;
			if (value < low) low = value;
			if (value > high) high = value;
		}

		const top = Math.max(0, Math.round(middle - high * middle));
		const bottom = Math.min(height - 1, Math.round(middle - low * middle));

		for (let y = top; y <= bottom; y++) {
			const at = (y * width + column) * 4;
			pixels[at] = scheme.wave[0];
			pixels[at + 1] = scheme.wave[1];
			pixels[at + 2] = scheme.wave[2];
			pixels[at + 3] = scheme.wave[3];
		}
	}

	return { data: pixels, width, height, colorSpace: "srgb" };
}

export function createWaveformEngine(format: "wav" | "flac"): Engine {
	return {
		id: `waveform:${format}`,

		async probe() {
			// Pixels are written directly, so there is no canvas to feature-detect.
			return typeof WebAssembly === "object";
		},

		async run(
			input: ArrayBuffer,
			params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
		) {
			onProgress(0.15, "READ");
			const audio =
				format === "wav" ? parseWav(input) : await decodeFlac(input);

			onProgress(0.5, "DRAW");
			const image = render(audio, params);

			onProgress(0.75, "ENCODE");
			// The same PNG encoder the image tools use, so the drawing gets a real
			// lossless encode rather than a canvas export.
			const output = await pngEncoder.encode(image, params);
			onProgress(1, "ENCODE");
			return output;
		},
	};
}
