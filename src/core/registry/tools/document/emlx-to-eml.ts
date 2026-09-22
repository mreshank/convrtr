import type { Tool } from "../../types";

export const emlxToEml: Tool = {
	id: "document/emlx-to-eml",
	slug: "emlx-to-eml",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["message/rfc822", "application/octet-stream"],
		ext: ["emlx"],
	},
	output: { ext: "eml", mime: "message/rfc822" },
	engines: ["extract:emlx-to-eml"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Exact Message",
				explanation:
					"Reads the length prefix and returns the embedded RFC 822 message bit-exact. Headers, MIME bodies and attachments are untouched.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "EMLX to EML — Open Apple Mail Files on Any OS | convrtr",
		h1: "Convert Apple Mail (.emlx) to EML",
		intent:
			"Free single emails out of Apple Mail's .emlx envelope into universal .eml files that Thunderbird, Outlook and archival tools open natively. The message transfers bit-exact; Mail.app's flag metadata stays behind — entirely in your browser, nothing uploaded.",
		faq: [
			{
				q: "Where do .emlx files come from?",
				a: "Apple Mail stores each message as an .emlx file (~/Library/Mail/) — a byte-count line, the raw message, and a plist of Mail.app state. Copying them to Windows or Linux leaves them unreadable without extraction.",
			},
			{
				q: "Is anything lost in conversion?",
				a: "No message content: headers, bodies and attachments are byte-identical. Only Mail.app-local state (read flags, colours, thread metadata in the plist trailer) is left behind — it has no meaning outside Mail anyway.",
			},
			{
				q: "How is this different from MBOX splitting?",
				a: "MBOX holds many messages behind From-separators (see mbox-to-zip); each .emlx already holds exactly one message behind a length prefix. Different envelopes, same bit-exact philosophy.",
			},
			{
				q: "Is my email uploaded anywhere?",
				a: "No. Envelope stripping runs entirely inside your browser.",
			},
		],
		related: [
			"document/mbox-to-zip",
			"document/msg-to-eml",
			"document/vcf-to-csv",
		],
	},
};
