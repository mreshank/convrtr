import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { magnetLink, parseTorrent } from "./parser";

export * from "./parser";

/**
 * BitTorrent metainfo (.torrent) inspector engine.
 * Bdecodes the dictionary, re-hashes raw info bytes for the infohash, and
 * emits structured JSON plus a magnet link — WebCrypto, still client-side.
 */
export const torrentToJsonEngine: Engine = {
	id: "extract:torrent-to-json",

	async probe() {
		return typeof crypto !== "undefined" && !!crypto.subtle;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress?.(0.2, "Decoding metainfo...");
		const info = await parseTorrent(new Uint8Array(input));
		onProgress?.(0.7, "Hashing info dictionary...");
		const json = `${JSON.stringify({ ...info, magnet: magnetLink(info) }, null, 2)}\n`;
		onProgress?.(1.0, "Complete");
		return new TextEncoder().encode(json).buffer as ArrayBuffer;
	},
};
