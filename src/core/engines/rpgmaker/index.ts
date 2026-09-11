import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { decryptRpgmvm, decryptRpgmvo, decryptRpgmvp } from "./parser";

/**
 * Decrypts RPG Maker MV/MZ (.rpgmvp) encrypted images back to clean PNG bytes.
 * Automatically recovers the 16-byte XOR key from the PNG header structure,
 * or accepts a custom hex key from System.json.
 */
export const rpgmvpToPngEngine: Engine = {
	id: "extract:rpgmvp-to-png",

	async probe() {
		return true; // Pure JS XOR arithmetic
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.2, "DECRYPT");
		const customKey = typeof params.key === "string" ? params.key : undefined;
		const output = decryptRpgmvp(input, customKey);
		onProgress(1, "DONE");
		return output;
	},
};

/**
 * Decrypts RPG Maker MV/MZ (.rpgmvo) encrypted audio back to clean OGG audio.
 */
export const rpgmvoToOggEngine: Engine = {
	id: "extract:rpgmvo-to-ogg",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.2, "DECRYPT");
		const customKey = typeof params.key === "string" ? params.key : undefined;
		const output = decryptRpgmvo(input, customKey);
		onProgress(1, "DONE");
		return output;
	},
};

/**
 * Decrypts RPG Maker MV/MZ (.rpgmvm) encrypted audio back to clean M4A audio.
 */
export const rpgmvmToM4aEngine: Engine = {
	id: "extract:rpgmvm-to-m4a",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.2, "DECRYPT");
		const customKey = typeof params.key === "string" ? params.key : undefined;
		const output = decryptRpgmvm(input, customKey);
		onProgress(1, "DONE");
		return output;
	},
};
