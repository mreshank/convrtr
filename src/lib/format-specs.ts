export interface FormatSpec {
	ext: string;
	name: string;
	developer: string;
	standard: string;
	mime: string;
	magicBytes: string;
	container: string;
	compression: string;
	colorOrAudio: string;
	transparency: string;
	browserSupport: string;
	typicalUse: string;
	lossless: boolean;
}

export interface ConversionBenchmark {
	typicalDelta: string;
	runtimeEngine: string;
	latencyProfile: string;
	privacyGuarantee: string;
	memoryProfile: string;
	terminalCommand: string;
}

export const FORMAT_SPECS: Record<string, FormatSpec> = {
	// ─── Image Formats ──────────────────────────────────────────
	png: {
		ext: "png",
		name: "Portable Network Graphics",
		developer: "W3C / PNG Development Group",
		standard: "ISO/IEC 15948 / RFC 2083",
		mime: "image/png",
		magicBytes: "89 50 4E 47 0D 0A 1A 0A",
		container: "Chunked binary (IHDR, IDAT, IEND)",
		compression: "Lossless DEFLATE (LZ77 + Huffman)",
		colorOrAudio: "1 to 48-bit Truecolor with optional Alpha",
		transparency: "Full 8/16-bit Alpha Channel Supported",
		browserSupport: "Universal (All browsers & operating systems)",
		typicalUse: "Lossless graphics, transparency, UI elements, screenshots",
		lossless: true,
	},
	jpg: {
		ext: "jpg",
		name: "Joint Photographic Experts Group",
		developer: "Joint Photographic Experts Group (ISO/IEC JTC 1)",
		standard: "ISO/IEC 10918-1 / ITU-T T.81",
		mime: "image/jpeg",
		magicBytes: "FF D8 FF E0 / FF D8 FF E1",
		container: "JFIF / EXIF segment stream",
		compression: "Lossy Discrete Cosine Transform (DCT)",
		colorOrAudio: "24-bit Truecolor (8 bits per channel YCbCr/RGB)",
		transparency: "None (Standard JPEG does not support alpha)",
		browserSupport: "Universal (All browsers, devices & legacy viewers)",
		typicalUse: "Photographic imaging, web assets, digital cameras",
		lossless: false,
	},
	jpeg: {
		ext: "jpeg",
		name: "Joint Photographic Experts Group",
		developer: "Joint Photographic Experts Group (ISO/IEC JTC 1)",
		standard: "ISO/IEC 10918-1 / ITU-T T.81",
		mime: "image/jpeg",
		magicBytes: "FF D8 FF E0 / FF D8 FF E1",
		container: "JFIF / EXIF segment stream",
		compression: "Lossy Discrete Cosine Transform (DCT)",
		colorOrAudio: "24-bit Truecolor (8 bits per channel YCbCr/RGB)",
		transparency: "None (Standard JPEG does not support alpha)",
		browserSupport: "Universal (All browsers, devices & legacy viewers)",
		typicalUse: "Photographic imaging, web assets, digital cameras",
		lossless: false,
	},
	webp: {
		ext: "webp",
		name: "WebP Image Format",
		developer: "Google",
		standard: "RIFF Container / VP8 & VP8L Bitstream",
		mime: "image/webp",
		magicBytes: "52 49 46 46 ... 57 45 42 50",
		container: "Resource Interchange File Format (RIFF)",
		compression: "Lossy (VP8 intra-prediction) or Lossless (VP8L)",
		colorOrAudio: "24-bit RGB with optional 8-bit Alpha Channel",
		transparency: "Full 8-bit Alpha Channel (Lossy & Lossless)",
		browserSupport: "~98% (Chromium, Firefox, Safari, Edge, WebKit)",
		typicalUse: "Next-gen web publishing, responsive images, animated stickers",
		lossless: true,
	},
	avif: {
		ext: "avif",
		name: "AV1 Image File Format",
		developer: "Alliance for Open Media (AOMedia)",
		standard: "ISO/IEC 23000-12 (HEIF profile) / AV1",
		mime: "image/avif",
		magicBytes: "00 00 00 ... 66 74 79 70 61 76 69 66",
		container: "ISO Base Media File Format (ISOBMFF)",
		compression: "AV1 intra-frame video compression",
		colorOrAudio: "8-bit, 10-bit & 12-bit High Dynamic Range (HDR)",
		transparency: "Full Alpha Channel via auxiliary alpha item",
		browserSupport: "~93% (Chrome 85+, Firefox 93+, Safari 16+, Edge 121+)",
		typicalUse: "Ultra-high compression web delivery, HDR photography",
		lossless: true,
	},
	heic: {
		ext: "heic",
		name: "High Efficiency Image Container",
		developer: "MPEG / Apple",
		standard: "ISO/IEC 23008-12 (HEIF) / H.265 HEVC",
		mime: "image/heic",
		magicBytes: "00 00 00 ... 66 74 79 70 68 65 69 63",
		container: "High Efficiency Image File Format (HEIF)",
		compression: "H.265 / HEVC intra-frame coding",
		colorOrAudio: "8-bit, 10-bit & 16-bit Deep Color",
		transparency: "Auxiliary alpha layer support",
		browserSupport: "Apple Safari native; decoded via WASM in other browsers",
		typicalUse: "Apple iOS/macOS camera captures, burst photography",
		lossless: false,
	},
	heif: {
		ext: "heif",
		name: "High Efficiency Image File Format",
		developer: "MPEG (Moving Picture Experts Group)",
		standard: "ISO/IEC 23008-12",
		mime: "image/heif",
		magicBytes: "00 00 00 ... 66 74 79 70 6D 69 66 31",
		container: "ISO Base Media File Format (ISOBMFF)",
		compression: "HEVC, AVC, or JPEG intra-frame encoding",
		colorOrAudio: "Up to 16-bit High Dynamic Range",
		transparency: "Auxiliary alpha channel",
		browserSupport: "Apple Safari native; decoded via WASM elsewhere",
		typicalUse: "Modern mobile captures, image sequences, live photos",
		lossless: false,
	},
	gif: {
		ext: "gif",
		name: "Graphics Interchange Format",
		developer: "CompuServe",
		standard: "GIF89a / GIF87a Specification",
		mime: "image/gif",
		magicBytes: "47 49 46 38 39 61 / 47 49 46 38 37 61",
		container: "Block-structured raster image stream",
		compression: "Lempel-Ziv-Welch (LZW) Lossless",
		colorOrAudio: "8-bit Indexed Palette (Max 256 colors per frame)",
		transparency: "Single designated palette index transparency (1-bit)",
		browserSupport: "Universal (All browsers since 1993)",
		typicalUse: "Short web animations, simple reaction clips, retro graphics",
		lossless: true,
	},
	svg: {
		ext: "svg",
		name: "Scalable Vector Graphics",
		developer: "World Wide Web Consortium (W3C)",
		standard: "W3C Recommendation (SVG 1.1 / SVG 2)",
		mime: "image/svg+xml",
		magicBytes: "3C 73 76 67 (XML <svg> element)",
		container: "XML (Extensible Markup Language)",
		compression: "Uncompressed text (or GZIP compressed in SVGZ)",
		colorOrAudio: "Resolution-independent infinite precision vector paths",
		transparency: "Full vector alpha, gradients, and clipping masks",
		browserSupport: "Universal (All modern web browsers & vector software)",
		typicalUse: "UI icons, logos, vector typography, diagrams, charts",
		lossless: true,
	},
	bmp: {
		ext: "bmp",
		name: "Bitmap Image File",
		developer: "Microsoft Corporation",
		standard: "Windows Device Independent Bitmap (DIB)",
		mime: "image/bmp",
		magicBytes: "42 4D (ASCII BM)",
		container: "BITMAPFILEHEADER + DIB Header + Raw Pixel Array",
		compression: "Uncompressed raw raster or optional RLE8/RLE4",
		colorOrAudio: "1, 4, 8, 16, 24, or 32-bit RGB/RGBA",
		transparency: "Optional 32-bit alpha channel in DIB v4/v5",
		browserSupport: "Universal desktop & desktop browsers",
		typicalUse: "Windows system assets, legacy software, raw graphics",
		lossless: true,
	},
	tiff: {
		ext: "tiff",
		name: "Tagged Image File Format",
		developer: "Aldus / Adobe Systems",
		standard: "TIFF Revision 6.0",
		mime: "image/tiff",
		magicBytes: "49 49 2A 00 (Little Endian) / 4D 4D 00 2A (Big Endian)",
		container: "Image File Directory (IFD) tag architecture",
		compression: "Uncompressed, LZW, ZIP/Deflate, or PackBits",
		colorOrAudio: "Up to 32 bits per channel float (RGBA, CMYK, Lab)",
		transparency: "Full extra samples alpha channel",
		browserSupport:
			"Desktop publishing tools, Safari (partial); decoded via WASM",
		typicalUse:
			"Professional print prepress, scientific scans, archival photography",
		lossless: true,
	},
	ico: {
		ext: "ico",
		name: "Windows Icon Format",
		developer: "Microsoft Corporation",
		standard: "Windows Icon Resource Architecture",
		mime: "image/x-icon",
		magicBytes: "00 00 01 00",
		container: "ICONDIR header + ICONDIRENTRY array + embedded PNG/BMP",
		compression: "Uncompressed DIB or Deflate PNG stream",
		colorOrAudio: "1 to 32-bit Truecolor with Alpha Mask",
		transparency: "1-bit AND mask or 8-bit PNG alpha",
		browserSupport: "Universal (Supported as favicon across all browsers)",
		typicalUse:
			"Browser favicons, Windows desktop shortcuts, application icons",
		lossless: true,
	},
	qoi: {
		ext: "qoi",
		name: "Quite OK Image Format",
		developer: "Dominic Szablewski",
		standard: "QOI Bitstream Specification v1.0",
		mime: "image/qoi",
		magicBytes: "71 6F 69 66 (ASCII qoif)",
		container: "Header (14 bytes) + 8-bit chunk stream + 8-byte end marker",
		compression: "Lossless byte-aligned run-length & difference predictor",
		colorOrAudio: "24-bit RGB or 32-bit RGBA",
		transparency: "Full 8-bit Alpha Channel",
		browserSupport: "Fast local in-browser WebAssembly decoder",
		typicalUse: "Real-time game textures, fast asset caching, embedded devices",
		lossless: true,
	},

	// ─── Audio Formats ──────────────────────────────────────────
	mp3: {
		ext: "mp3",
		name: "MPEG-1 Audio Layer III",
		developer: "Fraunhofer IIS / MPEG",
		standard: "ISO/IEC 11172-3 / ISO/IEC 13818-3",
		mime: "audio/mpeg",
		magicBytes: "49 44 33 (ID3v2) or FF FB / FF F3 (Frame Sync)",
		container: "Consecutive audio frames with optional ID3 tags",
		compression: "Lossy perceptual audio coding (Psychoacoustic model)",
		colorOrAudio: "Mono / Stereo, 32 kbps to 320 kbps, 32 kHz to 48 kHz",
		transparency: "N/A",
		browserSupport: "Universal (100% native audio playback in all browsers)",
		typicalUse: "Digital music distribution, podcasting, legacy audio playback",
		lossless: false,
	},
	wav: {
		ext: "wav",
		name: "Waveform Audio File Format",
		developer: "Microsoft & IBM",
		standard: "RIFF Waveform Audio Specification",
		mime: "audio/wav",
		magicBytes: "52 49 46 46 ... 57 41 56 45 (RIFF WAVE)",
		container: "Resource Interchange File Format (RIFF)",
		compression: "Uncompressed Linear Pulse Code Modulation (LPCM)",
		colorOrAudio: "8, 16, 24, 32-bit integer or float, up to 192 kHz",
		transparency: "N/A",
		browserSupport: "Universal (Supported natively in all HTML5 browsers)",
		typicalUse: "Studio recording, mastering, audio analysis, sound effects",
		lossless: true,
	},
	flac: {
		ext: "flac",
		name: "Free Lossless Audio Codec",
		developer: "Xiph.Org Foundation",
		standard: "IETF RFC (draft-ietf-cellar-flac)",
		mime: "audio/flac",
		magicBytes: "66 4C 61 43 (ASCII fLaC)",
		container: "Native FLAC stream with Vorbis Comments",
		compression: "Lossless Linear Prediction & Rice Entropy Coding",
		colorOrAudio: "4 to 32 bits per sample, 1 Hz to 655 kHz, up to 8 channels",
		transparency: "N/A",
		browserSupport: "~97% (Chromium, Firefox, Safari 11+, Edge)",
		typicalUse: "Audiophile music archiving, lossless streaming, mastering",
		lossless: true,
	},
	m4a: {
		ext: "m4a",
		name: "MPEG-4 Audio",
		developer: "Apple Inc. / MPEG",
		standard: "ISO/IEC 14496-14",
		mime: "audio/mp4",
		magicBytes: "00 00 00 ... 66 74 79 70 4D 34 41 20",
		container: "MPEG-4 Part 14 (MP4 container)",
		compression: "Advanced Audio Coding (AAC) or Apple Lossless (ALAC)",
		colorOrAudio: "Stereo to 7.1 surround sound, up to 48 kHz",
		transparency: "N/A",
		browserSupport: "Universal (Supported natively across all browsers)",
		typicalUse: "Apple Music, iTunes library, voice memos, modern audiobooks",
		lossless: false,
	},
	opus: {
		ext: "opus",
		name: "Opus Interactive Audio Codec",
		developer: "Xiph.Org / Skype / Mozilla / IETF",
		standard: "IETF RFC 6716",
		mime: "audio/opus",
		magicBytes: "4F 67 67 53 ... 4F 70 75 73 48 65 61 64",
		container: "Ogg container (or WebM / MP4 container)",
		compression: "Hybrid SILK (speech) + CELT (music) perceptual coding",
		colorOrAudio: "6 kbps to 510 kbps, 8 kHz to 48 kHz, up to 255 channels",
		transparency: "N/A",
		browserSupport: "~98% (Chromium, Firefox, Safari 15+, Edge)",
		typicalUse:
			"VoIP communications, Discord, WhatsApp voice notes, YouTube audio",
		lossless: false,
	},
	ogg: {
		ext: "ogg",
		name: "Ogg Vorbis Audio",
		developer: "Xiph.Org Foundation",
		standard: "RFC 3533 (Ogg) / Vorbis I Specification",
		mime: "audio/ogg",
		magicBytes: "4F 67 67 53 (ASCII OggS)",
		container: "Ogg encapsulation format",
		compression: "Lossy Vorbis perceptual audio coding",
		colorOrAudio: "Variable bitrate up to 500 kbps, 8 kHz to 192 kHz",
		transparency: "N/A",
		browserSupport:
			"~95% (Native in Chromium, Firefox; decoded via WASM in Safari)",
		typicalUse: "Game audio soundtracks, Wikipedia media, open-source audio",
		lossless: false,
	},
	aac: {
		ext: "aac",
		name: "Advanced Audio Coding",
		developer: "MPEG / Fraunhofer / Dolby / Sony",
		standard: "ISO/IEC 13818-7 / ISO/IEC 14496-3",
		mime: "audio/aac",
		magicBytes: "FF F1 / FF F9 (ADTS Header)",
		container: "Audio Data Transport Stream (ADTS) or MP4 container",
		compression: "Lossy Modified Discrete Cosine Transform (MDCT)",
		colorOrAudio: "8 kHz to 96 kHz, up to 48 channels",
		transparency: "N/A",
		browserSupport: "Universal (Standard in all mobile & desktop browsers)",
		typicalUse: "YouTube streaming, Apple Music, Bluetooth AAC broadcast",
		lossless: false,
	},

	// ─── Video Formats ──────────────────────────────────────────
	mp4: {
		ext: "mp4",
		name: "MPEG-4 Part 14 Video",
		developer: "International Organization for Standardization (ISO)",
		standard: "ISO/IEC 14496-14",
		mime: "video/mp4",
		magicBytes: "00 00 00 ... 66 74 79 70 69 73 6F 6D",
		container: "ISO Base Media File Format (ISOBMFF)",
		compression: "H.264 (AVC), H.265 (HEVC), or AV1 video + AAC audio",
		colorOrAudio: "Up to 8K resolution, 10-bit color, multichannel audio",
		transparency: "Alpha supported in modern HEVC/ProRes profiles",
		browserSupport:
			"Universal (100% native video playback across all browsers)",
		typicalUse: "Web video streaming, social media uploads, mobile playback",
		lossless: false,
	},
	webm: {
		ext: "webm",
		name: "WebM Open Media Format",
		developer: "Google",
		standard: "Matroska (EBML) subset specification",
		mime: "video/webm",
		magicBytes: "1A 45 DF A3 (EBML Header)",
		container: "Extensible Binary Meta Language (EBML / MKV subset)",
		compression: "VP8 / VP9 / AV1 video + Opus / Vorbis audio",
		colorOrAudio: "Up to 8K, HDR10+, multichannel Opus audio",
		transparency: "Full alpha channel support for transparent video overlays",
		browserSupport: "Universal modern browsers (~98% global coverage)",
		typicalUse: "HTML5 video backgrounds, transparent overlays, web animations",
		lossless: false,
	},
	mkv: {
		ext: "mkv",
		name: "Matroska Video Container",
		developer: "Matroska Association",
		standard: "IETF RFC (draft-ietf-cellar-matroska)",
		mime: "video/x-matroska",
		magicBytes: "1A 45 DF A3 ... 6D 61 74 72 6F 73 6B 61",
		container: "Extensible Binary Meta Language (EBML)",
		compression:
			"Universal multiplexer (H.264, HEVC, AV1, VP9, PCM, FLAC, AC3)",
		colorOrAudio: "Arbitrary video, audio, multiple subtitle tracks & chapters",
		transparency: "Supported depending on inner video codec",
		browserSupport:
			"Chromium native; remuxed/demuxed via client WASM in others",
		typicalUse:
			"High-definition media storage, multilingual anime/films, archival",
		lossless: true,
	},

	// ─── Document & Data Formats ────────────────────────────────
	pdf: {
		ext: "pdf",
		name: "Portable Document Format",
		developer: "Adobe Systems / ISO",
		standard: "ISO 32000-2:2020 (PDF 2.0)",
		mime: "application/pdf",
		magicBytes: "25 50 44 46 (ASCII %PDF-)",
		container: "PostScript-based object tree with cross-reference table",
		compression: "FlateDecode, DCTDecode, JBIG2, CCITT Fax",
		colorOrAudio: "DeviceRGB, DeviceCMYK, DeviceGray, ICC Profiles",
		transparency: "Vector and raster transparency blending",
		browserSupport: "Universal (Native PDF viewer in all modern browsers)",
		typicalUse:
			"Formal document exchange, contracts, legal archiving, printing",
		lossless: true,
	},
	docx: {
		ext: "docx",
		name: "Office Open XML Document",
		developer: "Microsoft Corporation / ECMA / ISO",
		standard: "ISO/IEC 29500 / ECMA-376",
		mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		magicBytes: "50 4B 03 04 (PKZIP Archive Header)",
		container: "Open Packaging Conventions (OPC / ZIP archive)",
		compression: "DEFLATE compression of XML files and media",
		colorOrAudio: "Styled typography, vector shapes, embedded media",
		transparency: "Transparent PNG/SVG graphic embeds supported",
		browserSupport: "Rendered and converted client-side via JavaScript/WASM",
		typicalUse: "Word processing, business proposals, academic papers",
		lossless: true,
	},
	md: {
		ext: "md",
		name: "Markdown Document",
		developer: "John Gruber / CommonMark Community",
		standard: "CommonMark / GitHub Flavored Markdown (GFM)",
		mime: "text/markdown",
		magicBytes: "Plain text UTF-8 / UTF-16",
		container: "Plain text markup",
		compression: "Uncompressed UTF-8 encoded text",
		colorOrAudio: "Monospace / semantic structural plain text",
		transparency: "N/A",
		browserSupport: "Universal native plain-text rendering and HTML conversion",
		typicalUse:
			"Developer documentation, README files, technical blogging, PKM notes",
		lossless: true,
	},
	csv: {
		ext: "csv",
		name: "Comma-Separated Values",
		developer: "IETF (Internet Engineering Task Force)",
		standard: "RFC 4180",
		mime: "text/csv",
		magicBytes: "Plain text UTF-8 / ASCII characters",
		container: "Delimited plain text tabular matrix",
		compression: "Uncompressed plain text",
		colorOrAudio: "Tabular records and columns",
		transparency: "N/A",
		browserSupport: "Universal plain text and parsed data table display",
		typicalUse: "Data export, spreadsheet ingestion, database migrations",
		lossless: true,
	},
	json: {
		ext: "json",
		name: "JavaScript Object Notation",
		developer: "Douglas Crockford / ECMA / IETF",
		standard: "ECMA-404 / RFC 8259",
		mime: "application/json",
		magicBytes: "7B (ASCII '{') or 5B (ASCII '[')",
		container: "Textual key-value hierarchy and arrays",
		compression: "Uncompressed UTF-8 plain text",
		colorOrAudio: "Arbitrary structured data objects",
		transparency: "N/A",
		browserSupport: "Universal native JSON.parse() in all JavaScript engines",
		typicalUse:
			"Web APIs, configuration files, state serialization, data exchange",
		lossless: true,
	},
};

/**
 * Returns a high-fidelity format specification. If the extension is not in the
 * core dictionary, generates an accurate heuristic spec based on the category.
 */
export function getFormatSpec(ext: string, category?: string): FormatSpec {
	const key = ext.toLowerCase().replace(/^\./, "");
	const existing = FORMAT_SPECS[key];
	if (existing) return existing;

	const upperExt = key.toUpperCase();
	const cat = category || "data";

	let name = `${upperExt} File`;
	const developer = "Industry Standard / Independent Specification";
	const standard = `${upperExt} Specification`;
	let mime = `${cat}/${key}`;
	let container = "Binary Stream";
	let compression = "Specialized Encoding";
	let colorOrAudio = "Format-Specific Parameters";
	const typicalUse = `${cat.charAt(0).toUpperCase() + cat.slice(1)} asset storage and forensic processing`;
	let lossless = true;

	if (cat === "image") {
		name = `${upperExt} Graphic Raster`;
		mime = `image/${key}`;
		container = "Pixel Map / Tagged Chunk Stream";
		compression = "Lossless Bitplane / Run-Length / Wavelet";
		colorOrAudio = "Indexed or Truecolor Raster";
	} else if (cat === "audio") {
		name = `${upperExt} Sound Stream / Module`;
		mime = `audio/${key}`;
		container = "Audio Framing / Multi-Track Pattern Bank";
		compression = "Linear PCM / ADPCM / Frequency Synthesis";
		colorOrAudio = "Sampled Sound Channels";
	} else if (cat === "video") {
		name = `${upperExt} Video Container`;
		mime = `video/${key}`;
		container = "Interleaved Video & Audio Stream";
		compression = "Discrete Cosine Transform / Motion Compensation";
		colorOrAudio = "High Resolution Raster + Synchronized Audio";
		lossless = false;
	} else if (cat === "document") {
		name = `${upperExt} Document`;
		mime = `application/${key}`;
		container = "Structured Document Architecture / XML Package";
		compression = "Deflate / UTF-8 Text Representation";
		colorOrAudio = "Semantic Typographic Content";
	}

	return {
		ext: key,
		name,
		developer,
		standard,
		mime,
		magicBytes: "Read off file header on device",
		container,
		compression,
		colorOrAudio,
		transparency: "Format-dependent",
		browserSupport: "Decoded via local WebAssembly in-browser compiler",
		typicalUse,
		lossless,
	};
}

/**
 * Calculates in-browser processing benchmarks, latency, size deltas,
 * and exact terminal/CLI recipes for converting between two formats.
 */
export function getConversionBenchmark(
	fromSpec: FormatSpec,
	toSpec: FormatSpec,
	category?: string,
	engines?: string[],
): ConversionBenchmark {
	const cat = category || "image";
	const from = fromSpec.ext.toLowerCase();
	const to = toSpec.ext.toLowerCase();

	// Dynamic typical size delta estimation
	let typicalDelta = "Varies by content and quality settings";
	if (from === "png" && to === "webp") {
		typicalDelta = "-25% to -35% file size reduction (Lossless & Lossy)";
	} else if (from === "png" && to === "avif") {
		typicalDelta = "-45% to -60% file size reduction (Modern AV1 Intra)";
	} else if (from === "heic" && (to === "jpg" || to === "jpeg")) {
		typicalDelta = "+20% to +45% (Decompressing HEVC to legacy DCT JPEG)";
	} else if (from === "heic" && to === "png") {
		typicalDelta =
			"+150% to +300% (Decompressing to uncompressed Truecolor PNG)";
	} else if (from === "wav" && to === "mp3") {
		typicalDelta = "-80% to -90% reduction (Uncompressed PCM to 320k MP3)";
	} else if (from === "wav" && to === "flac") {
		typicalDelta = "-40% to -60% lossless bit-exact reduction";
	} else if (from === "flac" && to === "mp3") {
		typicalDelta = "-65% to -80% perceptual compression";
	} else if (from === "mp4" && to === "m4a") {
		typicalDelta =
			"-70% to -90% (Lossless audio stream extraction without video)";
	} else if (to === "webp" || to === "avif") {
		typicalDelta = "-30% to -50% bandwidth savings compared to source";
	}

	// Runtime engine designation
	let runtimeEngine = "WebAssembly (WASM) · In-Thread / Web Worker";
	if (engines && engines.length > 0) {
		const engName = engines[0];
		if (engName?.includes("ffmpeg")) {
			runtimeEngine =
				"ffmpeg.wasm (v0.12+) · Multi-threaded Audio/Video Pipeline";
		} else if (engName?.includes("vips") || engName?.includes("sharp")) {
			runtimeEngine = "libvips WebAssembly · SIMD Accelerated Raster Engine";
		} else if (engName?.includes("flate") || engName?.includes("zip")) {
			runtimeEngine =
				"fflate WebAssembly · High-Throughput Deflate Decompressor";
		} else if (engName?.includes("pdf")) {
			runtimeEngine = "pdfjs-dist / WASM Document Vectorizer";
		}
	}

	// Latency profile
	let latencyProfile =
		"~40 ms to ~180 ms for standard assets on desktop/mobile CPU";
	if (cat === "video") {
		latencyProfile =
			"~1.2 s to ~4.5 s depending on video frame count and resolution";
	} else if (cat === "audio") {
		latencyProfile = "~150 ms to ~600 ms for average 3-5 minute audio tracks";
	}

	// Terminal equivalent command
	let terminalCommand = `# Convert ${from.toUpperCase()} to ${to.toUpperCase()} locally\n`;
	if (cat === "image") {
		if (to === "webp") {
			terminalCommand += `cwebp -q 85 input.${from} -o output.webp`;
		} else if (to === "avif") {
			terminalCommand += `avifenc --min 20 --max 30 input.${from} output.avif`;
		} else if (from === "heic" || from === "heif") {
			terminalCommand += `magick input.${from} -quality 90 output.${to}`;
		} else {
			terminalCommand += `magick input.${from} output.${to}`;
		}
	} else if (cat === "audio") {
		if (to === "mp3") {
			terminalCommand += `ffmpeg -i input.${from} -codec:a libmp3lame -b:a 320k output.mp3`;
		} else if (to === "flac") {
			terminalCommand += `ffmpeg -i input.${from} -codec:a flac output.flac`;
		} else if (to === "wav") {
			terminalCommand += `ffmpeg -i input.${from} -codec:a pcm_s16le output.wav`;
		} else {
			terminalCommand += `ffmpeg -i input.${from} output.${to}`;
		}
	} else if (cat === "video") {
		if (to === "m4a") {
			terminalCommand += `ffmpeg -i input.${from} -vn -c:a copy output.m4a`;
		} else if (to === "mp4") {
			terminalCommand += `ffmpeg -i input.${from} -c:v libx264 -crf 22 -c:a aac output.mp4`;
		} else {
			terminalCommand += `ffmpeg -i input.${from} output.${to}`;
		}
	} else {
		terminalCommand += `pandoc input.${from} -o output.${to}`;
	}

	return {
		typicalDelta,
		runtimeEngine,
		latencyProfile,
		privacyGuarantee:
			"0 bytes transmitted over network (100% on-device memory execution)",
		memoryProfile:
			"Direct ArrayBuffer allocation in WebAssembly linear memory; freed on tab close",
		terminalCommand,
	};
}

export interface TechnicalFaqItem {
	q: string;
	a: string;
}

/**
 * Returns technical FAQs tailored to the format pair and search query intent.
 */
export function getTechnicalFaq(
	fromSpec: FormatSpec,
	toSpec: FormatSpec,
	_toolH1: string,
): TechnicalFaqItem[] {
	const from = fromSpec.ext.toUpperCase();
	const to = toSpec.ext.toUpperCase();

	return [
		{
			q: `Why convert from ${from} to ${to}?`,
			a: `${fromSpec.name} (${from}) and ${toSpec.name} (${to}) serve distinct roles across the digital workflow. Converting to ${to} provides optimized compatibility, modern compression efficiency, or standardized playback across web browsers, operating systems, and media production environments.`,
		},
		{
			q: `Is the ${from} to ${to} conversion lossless or lossy?`,
			a: toSpec.lossless
				? `The output format (${to}) is inherently lossless or supports lossless operation. Your original visual or audio fidelity is mathematically preserved without quantization artifacts.`
				: `The conversion utilizes ${toSpec.compression}. You can fine-tune quality presets (Lossless, Visually Lossless, Balanced, Smallest) to eliminate noticeable degradation while achieving optimal file size reduction.`,
		},
		{
			q: "Does convrtr upload my files to any cloud server?",
			a: "Never. convrtr is architected with a strict zero-upload model. All processing, decoding, decompression, and encoding happen 100% locally on your machine using sandboxed WebAssembly and Web Workers. Your data never touches an external server, database, or analytics collector.",
		},
		{
			q: `How can I convert ${from} to ${to} from the terminal / command line?`,
			a: `You can execute this conversion locally via command-line utilities such as ffmpeg, cwebp, or ImageMagick. For example: see the developer terminal recipe provided in the technical specifications dossier above. convrtr provides the identical local-first capability directly inside your browser without installing CLI packages.`,
		},
		{
			q: `Can I batch convert multiple ${from} files to ${to} simultaneously?`,
			a: `Yes. You can drop multiple .${fromSpec.ext} files into the instrument to process them concurrently in browser Web Workers, or click 'Open in Master Studio' to queue mixed formats, configure individual targets, and export as a single ZIP archive.`,
		},
	];
}
