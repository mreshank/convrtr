import type { ComparisonMeta } from "./types";

export const COMPARISONS: ComparisonMeta[] = [
	{
		slug: "webp-vs-avif",
		title: "WebP vs AVIF: Which Modern Image Format Wins in 2026?",
		description:
			"A direct technical comparison between WebP and AVIF. Compare compression ratios, decoding speed, browser support, and visual fidelity.",
		formatA: "WebP",
		formatB: "AVIF",
		category: "image",
		summary:
			"WebP and AVIF are the two dominant next-generation image formats on the web. AVIF offers 20-30% smaller file sizes at identical perceptual quality and full HDR support, while WebP boasts near-instant decoding speeds and universal browser backwards-compatibility.",
		prosA: [
			"Universal support across all modern and legacy browsers",
			"Significantly faster decoding and rendering CPU footprint",
			"Superior transparency (alpha channel) support over legacy PNG",
			"Smaller memory footprint on mobile devices",
		],
		prosB: [
			"20-30% higher compression efficiency than WebP at equivalent SSIM",
			"Native 10-bit and 12-bit HDR color depth support",
			"Based on the open-source, royalty-free AV1 video codec",
			"Reduced banding in deep shadows and gradients",
		],
		specs: [
			{
				feature: "Developer",
				formatA: "Google",
				formatB: "Alliance for Open Media (AOMedia)",
			},
			{
				feature: "Base Codec",
				formatA: "VP8 / VP8L",
				formatB: "AV1 (HEVC alternative)",
			},
			{
				feature: "Compression Type",
				formatA: "Lossy & Lossless",
				formatB: "Lossy & Lossless",
			},
			{
				feature: "HDR / 10-Bit Color",
				formatA: "No (8-bit only)",
				formatB: "Yes (10-bit & 12-bit)",
			},
			{ feature: "Alpha Transparency", formatA: "Yes", formatB: "Yes" },
			{ feature: "Global Browser Support", formatA: "~98%", formatB: "~93%" },
			{
				feature: "Encoding Speed",
				formatA: "Fast",
				formatB: "Moderate to Slow",
			},
		],
		verdict:
			"Use AVIF for hero graphics, photography, and bandwidth-constrained assets where maximum compression matters. Use WebP when instantaneous decoding latency, wide legacy support, or high-throughput batch generation is required.",
		relatedTools: [
			"image/avif-to-png",
			"image/avif-to-jpg",
			"image/webp-to-png",
			"image/png-to-webp",
		],
	},
	{
		slug: "flac-vs-wav",
		title: "FLAC vs WAV: Lossless Audio Quality, File Size & Metadata Compared",
		description:
			"Is WAV higher quality than FLAC? Compare audio fidelity, bit-for-bit accuracy, file size differences, and ID3/Vorbis tag metadata support.",
		formatA: "FLAC",
		formatB: "WAV",
		category: "audio",
		summary:
			"FLAC and WAV contain identical uncompressed audio samples. FLAC uses lossless compression (like a ZIP file for PCM audio) to cut file sizes by 40-60% without dropping a single bit, while WAV is an uncompressed RIFF container.",
		prosA: [
			"40-60% smaller file size with zero loss in audio fidelity",
			"Robust Vorbis comment metadata support (cover art, artist, lyrics)",
			"Built-in MD5 checksum to instantly verify audio integrity",
			"Standard format for audiophile digital archiving",
		],
		prosB: [
			"Universal compatibility across all DAWs, OS audio players, and hardware",
			"Zero CPU overhead for decoding (raw PCM streams straight to DAC)",
			"Standard for live multi-track studio recording",
			"Direct compatibility with legacy audio processing software",
		],
		specs: [
			{
				feature: "Fidelity",
				formatA: "100% Bit-Perfect Lossless",
				formatB: "100% Uncompressed PCM",
			},
			{
				feature: "Typical File Size",
				formatA: "20-30 MB / track",
				formatB: "50-70 MB / track",
			},
			{
				feature: "Metadata Support",
				formatA: "Full Vorbis Comments & Artwork",
				formatB: "Limited (INFO chunk/ID3)",
			},
			{
				feature: "Integrity Verification",
				formatA: "Native MD5 Checksum",
				formatB: "None",
			},
			{
				feature: "DAW Latency",
				formatA: "Sub-millisecond decode",
				formatB: "Zero decode overhead",
			},
			{
				feature: "Standard Sample Rates",
				formatA: "Up to 384kHz / 32-bit",
				formatB: "Up to 384kHz / 32-bit",
			},
		],
		verdict:
			"For listening, storage, and digital distribution, FLAC is vastly superior due to its halved file size and rich metadata. WAV remains the gold standard for real-time digital audio workstation (DAW) editing where direct byte addressing is needed.",
		relatedTools: [
			"audio/flac-to-wav",
			"audio/wav-to-flac",
			"audio/trim-flac",
			"audio/normalise-flac",
		],
	},
	{
		slug: "opus-vs-mp3",
		title: "Opus vs MP3: Why Opus Outperforms MP3 at Every Bitrate",
		description:
			"Technical comparison between Opus and MP3. Learn why modern VoIP, Discord, and streaming platforms migrated from MP3 to Opus.",
		formatA: "Opus",
		formatB: "MP3",
		category: "audio",
		summary:
			"Opus is an IETF standard combining Skype's SILK speech codec and Xiph's CELT music codec. It achieves transparent musical fidelity at 96-128 kbps where MP3 requires 256-320 kbps, while maintaining ultra-low latency for real-time speech.",
		prosA: [
			"Dramatically superior fidelity per bitrate (64kbps Opus matches 128kbps MP3)",
			"Ultra-low latency (5ms to 26.5ms) ideal for interactive voice and gaming",
			"Dynamic bitrate and bandwidth switching on the fly",
			"Free, open, and royalty-free IETF standard (RFC 6716)",
		],
		prosB: [
			"100% hardware compatibility in every car stereo, MP3 player, and legacy device",
			"Universal recognition by non-technical users",
			"Universal support in legacy audio editing tools",
		],
		specs: [
			{
				feature: "Release Year",
				formatA: "2012 (IETF)",
				formatB: "1993 (Fraunhofer)",
			},
			{
				feature: "Target Bitrates",
				formatA: "6 kbps – 510 kbps",
				formatB: "32 kbps – 320 kbps",
			},
			{
				feature: "Algorithmic Latency",
				formatA: "5 ms – 26.5 ms",
				formatB: "100 ms – 200 ms",
			},
			{
				feature: "Sampling Frequency",
				formatA: "8 kHz to 48 kHz",
				formatB: "16 kHz to 48 kHz",
			},
			{
				feature: "Transparent Quality",
				formatA: "~96 - 128 kbps",
				formatB: "~256 - 320 kbps",
			},
			{
				feature: "Speech & Music Fusion",
				formatA: "Dual-mode SILK + CELT",
				formatB: "Pure psychoacoustic MDCT",
			},
		],
		verdict:
			"Opus is mathematically and psychoacoustically superior to MP3 in every single performance dimension. Unless targeting 20-year-old standalone hardware players, use Opus for modern streaming, voice, and web delivery.",
		relatedTools: [
			"audio/wav-to-opus",
			"audio/opus-to-mp3",
			"audio/wav-to-mp3",
		],
	},
	{
		slug: "heic-vs-jpg",
		title: "HEIC vs JPG: Apple High Efficiency vs Universal Image Format",
		description:
			"Compare Apple's default iPhone camera format (HEIC) against standard JPEG. File size, photo quality, compatibility, and conversion guide.",
		formatA: "HEIC",
		formatB: "JPG",
		category: "image",
		summary:
			"HEIC (High Efficiency Image Container) is Apple's standard photo capture format based on HEVC (H.265). It cuts JPEG file sizes in half while preserving 16-bit color, live photo bursts, and depth maps, but lacks universal Windows and Android viewing support.",
		prosA: [
			"Approximately 50% smaller file size than JPEG at identical visual quality",
			"Supports 16-bit color depth (compared to JPEG's 8-bit limit)",
			"Stores multiple photos, Live Photo videos, and depth maps in one container",
			"Lossless editing capability (stores rotation and crops non-destructively)",
		],
		prosB: [
			"Opens natively on 100% of devices, browsers, and operating systems",
			"Zero conversion or compatibility issues when emailing or uploading to portals",
			"Universal support in print shops and web content management systems",
		],
		specs: [
			{
				feature: "Underlying Compression",
				formatA: "HEVC (H.265)",
				formatB: "Discrete Cosine Transform (DCT)",
			},
			{
				feature: "File Size Ratio",
				formatA: "~50% of JPG",
				formatB: "Baseline (100%)",
			},
			{
				feature: "Color Depth",
				formatA: "Up to 16-bit",
				formatB: "8-bit only",
			},
			{
				feature: "Multiple Frames / Burst",
				formatA: "Yes (Live Photos, bursts)",
				formatB: "No (Single frame only)",
			},
			{
				feature: "Native Windows Support",
				formatA: "Requires paid HEVC extension",
				formatB: "Universal",
			},
			{
				feature: "Native Web Browser Support",
				formatA: "Limited (Safari only)",
				formatB: "Universal",
			},
		],
		verdict:
			"Capture in HEIC on iPhone to maximize device storage and dynamic range. Convert to JPG or WebP whenever sharing to Windows PCs, uploading to websites, or submitting documents.",
		relatedTools: ["image/compress-jpg", "image/avif-to-jpg"],
	},
	{
		slug: "geojson-vs-kml",
		title: "GeoJSON vs KML: Modern Web GIS vs Legacy Google Earth Format",
		description:
			"Comparing spatial data formats: GeoJSON vs KML. Which format should you use for web mapping, Leaflet, Mapbox, and GIS pipelines?",
		formatA: "GeoJSON",
		formatB: "KML",
		category: "document",
		summary:
			"GeoJSON is an open JSON-based geospatial standard used natively by Mapbox, Leaflet, and modern JavaScript web maps. KML is an XML-based format developed by Keyhole (Google) for 3D Earth visualization and styling annotations.",
		prosA: [
			"Native JSON format parsed instantly by JavaScript with zero XML overhead",
			"Standard payload format for Mapbox GL, Leaflet, and OpenLayers",
			"Compact syntax and easy manipulation in backend Node/Python APIs",
			"Supported natively in MongoDB, PostgreSQL (PostGIS), and Elasticsearch",
		],
		prosB: [
			"Native support for 3D camera angles, fly-overs, and altitudes in Google Earth",
			"Supports embedded visual styling (placemark icons, line widths, balloons)",
			"Can be packaged with custom images and 3D models as KMZ archives",
		],
		specs: [
			{
				feature: "Data Encoding",
				formatA: "JSON (RFC 7946)",
				formatB: "XML (OGC Standard)",
			},
			{
				feature: "Browser Parsing Speed",
				formatA: "Instant (JSON.parse)",
				formatB: "Slower (DOMParser / xml2js)",
			},
			{
				feature: "Coordinate Order",
				formatA: "[Longitude, Latitude, Elevation]",
				formatB: "[Longitude, Latitude, Altitude]",
			},
			{
				feature: "3D Camera Tours",
				formatA: "No native camera schema",
				formatB: "Yes (<Camera>, <LookAt>)",
			},
			{
				feature: "Web Mapping Ecosystem",
				formatA: "Industry Standard",
				formatB: "Legacy / Conversion required",
			},
		],
		verdict:
			"Use GeoJSON for all modern web maps, dashboards, and spatial data APIs. Use KML only when creating presentations or tours for Google Earth.",
		relatedTools: [
			"document/kml-to-geojson",
			"document/kmz-to-geojson",
			"document/gpx-to-geojson",
		],
	},
	{
		slug: "goodnotes-vs-pdf",
		title: "GoodNotes vs PDF: Vector Ink Fidelity and Note Exporting",
		description:
			"Comparing proprietary GoodNotes files (.goodnotes) with universal PDF documents. How vector strokes, layers, and annotations translate.",
		formatA: "GoodNotes",
		formatB: "PDF",
		category: "document",
		summary:
			"GoodNotes files (.goodnotes) are zipped SQLite / protobuf packages storing editable handwriting strokes, handwriting recognition tokens, and template layers. PDF is a standardized read-only page description format.",
		prosA: [
			"Fully editable handwriting vector strokes and undo history",
			"Embedded optical character recognition (OCR) handwriting search index",
			"Preserves notebook paper styles, page stickers, and audio recordings",
		],
		prosB: [
			"Opens on every phone, tablet, e-reader, and computer in existence",
			"Standard for printing, academic submissions, and professional archiving",
			"Immune to GoodNotes app version deprecations and sync conflicts",
		],
		specs: [
			{
				feature: "Format Architecture",
				formatA: "ZIP with SQLite / Protobuf",
				formatB: "ISO 32000 Document Specification",
			},
			{
				feature: "Stroke Editability",
				formatA: "Full Vector Handwriting Stems",
				formatB: "Flattened Vector Paths or Annotations",
			},
			{
				feature: "Platform Support",
				formatA: "GoodNotes App (iOS / macOS / Windows)",
				formatB: "Universal (All devices & OS)",
			},
			{
				feature: "Searchability",
				formatA: "GoodNotes In-App Handwriting OCR",
				formatB: "Standard PDF Text Extraction",
			},
		],
		verdict:
			"Keep your working notebooks in .goodnotes for ongoing writing and editing. Convert to PDF whenever submitting assignments, sharing notes with colleagues, or creating long-term archives.",
		relatedTools: ["document/goodnotes-to-pdf"],
	},
	{
		slug: "rpa-vs-zip",
		title: "Ren'Py RPA vs ZIP: Game Asset Packaging and Decompression",
		description:
			"Understanding Ren'Py RPA archive structures vs standard ZIP files. How visual novel scripts, sprites, and audio are packaged and unpacked.",
		formatA: "Ren'Py RPA",
		formatB: "ZIP",
		category: "document",
		summary:
			"Ren'Py RPA archives are obfuscated game containers storing images, scripts, and audio for visual novel games. Unlike standard ZIP archives, RPA uses Python pickle or XOR indexing to prevent accidental asset spoilers.",
		prosA: [
			"Native loading and streaming inside the Ren'Py visual novel engine",
			"Obfuscated index prevents casual browsing of game endings and sprites",
			"Optimized sequential file seeking for game runtimes",
		],
		prosB: [
			"Standard archive format opened natively by Windows Explorer and macOS Finder",
			"Compatible with all compression utilities (7-Zip, WinRAR, Unarchiver)",
			"Inspectable file hierarchy with standard directory trees",
		],
		specs: [
			{
				feature: "Index Architecture",
				formatA: "Python Pickle / Hex Obfuscated Table",
				formatB: "Central Directory Record (CDR)",
			},
			{
				feature: "Primary Use Case",
				formatA: "Visual Novel Game Asset Protection",
				formatB: "Universal File Compression & Distribution",
			},
			{
				feature: "Extraction Tooling",
				formatA: "Specialized Unpacker (or convrtr)",
				formatB: "Built into all operating systems",
			},
			{
				feature: "Compression Type",
				formatA: "Deflate or Uncompressed Raw Chunks",
				formatB: "Deflate / BZip2 / LZMA",
			},
		],
		verdict:
			"RPA is specifically tailored for Ren'Py game engines. When modding, localizing, or translating game assets, convert RPA to standard ZIP in convrtr to extract all files without installing Python.",
		relatedTools: [
			"document/rpa-to-zip",
			"document/pck-to-zip",
			"document/pak-to-zip",
			"document/wad-to-zip",
		],
	},
];

export function getComparison(slug: string): ComparisonMeta | undefined {
	return COMPARISONS.find((c) => c.slug === slug);
}
