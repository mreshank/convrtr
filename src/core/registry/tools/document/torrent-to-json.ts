import type { Tool } from "../../types";

export const torrentToJson: Tool = {
	id: "document/torrent-to-json",
	slug: "torrent-to-json",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/x-bittorrent", "application/octet-stream"],
		ext: ["torrent"],
	},
	output: { ext: "json", mime: "application/json" },
	engines: ["extract:torrent-to-json"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Metainfo",
				explanation:
					"Bdecodes the dictionary, re-hashes raw info bytes for the infohash, and flattens single/multi-file layouts into an exact file table plus a magnet link.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Torrent to JSON — Inspect Metainfo Without a Client | convrtr",
		h1: "Convert Torrent File to JSON + Magnet",
		intent:
			"Inspect any .torrent without a BitTorrent client: file list with sizes, trackers, creation info, private flag — plus the true infohash re-hashed from raw bytes and a ready magnet link. Archivists, seedbox managers and the curious. Entirely in your browser.",
		faq: [
			{
				q: "Why not just open it in qBittorrent?",
				a: "Sometimes you only need the facts — what files, how big, which trackers, is it private — before deciding to add 40GB to a client. This answers in one click with no install.",
			},
			{
				q: "Is the infohash trustworthy?",
				a: "Yes: it's SHA-1 over the raw info-dict bytes (WebCrypto), not a re-serialization — byte-identical to what every client computes, so the magnet just works.",
			},
			{
				q: "Does this download or share anything?",
				a: "No. Metainfo inspection touches no swarm — no peers, no trackers, no traffic. It reads the file you already have.",
			},
			{
				q: "Is my file uploaded anywhere?",
				a: "No. Bdecoding and hashing run entirely inside your browser.",
			},
		],
		related: [
			"document/cue-to-json",
			"document/rpp-to-json",
			"document/als-to-json",
		],
	},
};
