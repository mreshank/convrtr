import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { measureLoudness } from "../loudness";
import { parseWav } from "../wav";

/**
 * Checks the loudness measurement against ffmpeg's `ebur128`, an independent
 * implementation of the same standard.
 *
 * The dynamic signal is the point. An e2e test on a steady tone passes whether
 * or not the relative gate is implemented, because a signal with no quiet
 * passages has nothing to gate — verified by disabling the gate and watching
 * that test still pass. Gating is what separates BS.1770 from a weighted RMS,
 * and it only shows up on material that actually has loud and quiet parts.
 */

function ffmpegAvailable(): boolean {
	try {
		execSync("ffmpeg -version", { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

const HAVE_FFMPEG = ffmpegAvailable();

/** Integrated loudness per ffmpeg, read from its R128 summary on stderr. */
function ffmpegLoudness(path: string): number {
	const out = execSync(
		`ffmpeg -nostats -i "${path}" -filter_complex ebur128 -f null - 2>&1`,
		{ encoding: "utf8" },
	);
	const summary = out.split("Integrated loudness:")[1] ?? "";
	return Number.parseFloat(
		summary.match(/I:\s+(-?\d+(?:\.\d+)?)/)?.[1] ?? "NaN",
	);
}

function load(path: string) {
	const file = readFileSync(path);
	return parseWav(
		file.buffer.slice(
			file.byteOffset,
			file.byteOffset + file.byteLength,
		) as ArrayBuffer,
	);
}

describe.skipIf(!HAVE_FFMPEG)("integrated loudness", () => {
	const work = HAVE_FFMPEG ? mkdtempSync(join(tmpdir(), "convrtr-lufs-")) : "";

	/** Loud for `loud` seconds, then far quieter for `quiet` seconds. */
	function makeDynamic(name: string, loud: number, quiet: number): string {
		const path = join(work, name);
		execSync(
			`ffmpeg -y -f lavfi -i "sine=frequency=440:duration=${loud}:sample_rate=48000" ` +
				`-f lavfi -i "sine=frequency=440:duration=${quiet}:sample_rate=48000" ` +
				`-filter_complex "[1:a]volume=-40dB[q];[0:a][q]concat=n=2:v=0:a=1[out]" ` +
				`-map "[out]" -c:a pcm_s16le "${path}" 2>/dev/null`,
		);
		return path;
	}

	it("agrees with ffmpeg on a steady signal", () => {
		const path = join(work, "steady.wav");
		execSync(
			`ffmpeg -y -f lavfi -i "sine=frequency=440:duration=3:sample_rate=48000" -c:a pcm_s16le "${path}" 2>/dev/null`,
		);

		const mine = measureLoudness(load(path)).integrated ?? Number.NaN;
		expect(Math.abs(mine - ffmpegLoudness(path))).toBeLessThan(0.5);
	});

	it("agrees with ffmpeg on a signal with quiet passages", () => {
		// Half loud, half 40dB down. Without the relative gate the quiet half
		// drags the figure several LU below what the standard specifies, and
		// below what ffmpeg reports.
		const path = makeDynamic("dynamic.wav", 3, 3);

		const mine = measureLoudness(load(path)).integrated ?? Number.NaN;
		const theirs = ffmpegLoudness(path);

		expect(
			Math.abs(mine - theirs),
			`measured ${mine.toFixed(2)} LUFS against ffmpeg's ${theirs.toFixed(2)}`,
		).toBeLessThan(0.5);
	});

	it("gates out a long quiet tail rather than averaging it in", () => {
		// The same loud content, with more and more quiet appended. The gated
		// measurement barely moves; an ungated one falls steadily.
		const short = measureLoudness(
			load(makeDynamic("tail-short.wav", 3, 2)),
		).integrated;
		const long = measureLoudness(
			load(makeDynamic("tail-long.wav", 3, 8)),
		).integrated;

		expect(short).not.toBeNull();
		expect(long).not.toBeNull();
		expect(
			Math.abs((short ?? 0) - (long ?? 0)),
			"appending quiet must not change the integrated loudness materially",
		).toBeLessThan(0.5);
	});

	/**
	 * K-weighting is invisible at mid frequencies, which is where the obvious
	 * test signal sits. A 440Hz tone passes through the curve almost unchanged,
	 * so removing the filter entirely leaves every test above passing — verified
	 * by doing exactly that. Bass and treble are where the curve does its work:
	 * the high-pass pulls low frequencies down hard, the shelf lifts highs by
	 * about 4dB, and an unweighted measurement gets both wrong in opposite
	 * directions.
	 */
	it.each([
		{ hz: 50, label: "bass, which K-weighting attenuates" },
		{ hz: 8000, label: "treble, which K-weighting lifts" },
	])("agrees with ffmpeg at $hz Hz ($label)", ({ hz }) => {
		const path = join(work, `tone-${hz}.wav`);
		execSync(
			`ffmpeg -y -f lavfi -i "sine=frequency=${hz}:duration=3:sample_rate=48000" -c:a pcm_s16le "${path}" 2>/dev/null`,
		);

		const mine = measureLoudness(load(path)).integrated ?? Number.NaN;
		const theirs = ffmpegLoudness(path);

		expect(
			Math.abs(mine - theirs),
			`at ${hz}Hz measured ${mine.toFixed(2)} LUFS against ffmpeg's ${theirs.toFixed(2)}`,
		).toBeLessThan(0.5);
	});

	it("reports null for silence rather than a misleading number", () => {
		const path = join(work, "silence.wav");
		execSync(
			`ffmpeg -y -f lavfi -i "anullsrc=r=48000:cl=stereo" -t 2 -c:a pcm_s16le "${path}" 2>/dev/null`,
		);
		expect(existsSync(path)).toBe(true);

		const result = measureLoudness(load(path));
		expect(result.integrated).toBeNull();
		expect(result.peak).toBe(0);
	});
});
