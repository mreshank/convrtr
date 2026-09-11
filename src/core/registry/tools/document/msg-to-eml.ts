import type { Tool } from "../../types";

export const msgToEml: Tool = {
	id: "document/msg-to-eml",
	slug: "msg-to-eml",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/vnd.ms-outlook", "application/octet-stream"],
		ext: ["msg"],
	},
	output: { ext: "eml", mime: "message/rfc822" },
	engines: ["extract:msg-to-eml"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "MIME Complete",
				explanation:
					"Extracts Subject, From, To, Date, HTML body, plain text body, and all binary attachments directly into a standard RFC 822 .eml document.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"MSG to EML — Convert Outlook .msg Emails to .eml Online Free | convrtr",
		h1: "Convert MSG to EML",
		intent:
			"Convert Microsoft Outlook (.msg) messages into standard .eml files directly in your browser. Open Outlook emails on Mac (Apple Mail), iPhone, Android, or Thunderbird without Outlook installed and without sending confidential emails to third-party servers.",
		faq: [
			{
				q: "How do I open an Outlook .msg file on a Mac or Linux?",
				a: "Mac and Linux do not have native support for Microsoft Compound File .msg format. Converting your .msg to a standard .eml file allows it to open immediately in Apple Mail, Thunderbird, or any text editor.",
			},
			{
				q: "Will email attachments and images be preserved?",
				a: "Yes. All attachments, filenames, and embedded HTML message formatting are extracted and encoded into standard MIME multipart sections inside the .eml file.",
			},
			{
				q: "Is my email content kept strictly confidential?",
				a: "Yes. The entire Compound File parsing and MIME compilation happens 100% locally in your browser. Your sensitive business emails, customer data, and attachments are never uploaded to any remote server.",
			},
		],
		related: [],
	},
};
