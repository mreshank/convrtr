import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { msgToEml, parseMsg } from "./parser";

/**
 * Extracts an Outlook .msg email message into standard RFC 822 .eml format
 * with body and base64-encoded attachments.
 */
export const msgToEmlEngine: Engine = {
	id: "extract:msg-to-eml",

	async probe() {
		return true; // Pure client-side binary CFB parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.2, "PARSE");
		const msg = parseMsg(input);
		onProgress(0.8, "COMPOSE");
		const eml = msgToEml(msg);
		onProgress(1.0, "COMPLETE");
		const bytes = new TextEncoder().encode(eml);
		return bytes.buffer;
	},
};
