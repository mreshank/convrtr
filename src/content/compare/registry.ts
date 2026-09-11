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
	{
		slug: "png-vs-jpg",
		title: "PNG vs JPG: Transparency, Quality & When to Use Which",
		description:
			"Detailed technical comparison between PNG and JPG (JPEG). Understand lossless vs lossy compression, alpha channel transparency, and file size optimization.",
		formatA: "PNG",
		formatB: "JPG",
		category: "image",
		summary:
			"PNG is a lossless raster format that preserves crisp edges and 8-bit alpha transparency, making it optimal for graphics and user interfaces. JPG uses lossy discrete cosine transform compression to drastically reduce photographic file sizes at the cost of slight high-frequency compression artifacts.",
		prosA: [
			"Lossless compression preserves 100% pixel-perfect clarity",
			"Full 8-bit alpha channel transparency support",
			"No compression artifacts around sharp text or vector illustrations",
			"Ideal for screenshots, logos, and user interface graphics",
		],
		prosB: [
			"Substantially smaller file sizes for photographic imagery",
			"Universal support across all software, cameras, and devices",
			"Customizable compression ratios for bandwidth optimization",
			"Standard format for digital photography and image sensors",
		],
		specs: [
			{
				feature: "Compression Architecture",
				formatA: "Lossless Deflate (LZ77 + Huffman)",
				formatB: "Lossy Discrete Cosine Transform (DCT)",
			},
			{
				feature: "Alpha Transparency",
				formatA: "Yes (256 levels of alpha)",
				formatB: "No transparency support",
			},
			{
				feature: "Best For",
				formatA: "Screenshots, Logos, UI, Line Art",
				formatB: "Real-world photography, complex textures",
			},
			{
				feature: "Color Depth",
				formatA: "Up to 48-bit Truecolor + Alpha",
				formatB: "24-bit RGB (8 bits per channel)",
			},
			{
				feature: "Artifacts",
				formatA: "Zero visual artifacts",
				formatB: "Ringing and blocking around sharp edges",
			},
		],
		verdict:
			"Choose PNG for icons, logos, screenshots, and graphics requiring transparent backgrounds or sharp text. Choose JPG for photographs and complex real-world imagery where smaller file size is essential.",
		relatedTools: ["image/png-to-jpg", "image/jpg-to-png", "image/png-to-webp"],
	},
	{
		slug: "webp-vs-png",
		title: "WebP vs PNG: Is WebP Really Better Than PNG for Modern Websites?",
		description:
			"Compare WebP and PNG file sizes, transparency handling, browser support, and compression performance for web graphics and illustrations.",
		formatA: "WebP",
		formatB: "PNG",
		category: "image",
		summary:
			"WebP was engineered specifically to supersede legacy web image formats. In lossless mode, WebP files are on average 26% smaller than equivalent PNGs while supporting identical alpha channel transparency and broad browser rendering support.",
		prosA: [
			"26% smaller file size than PNG while maintaining 100% lossless fidelity",
			"Supports both lossy and lossless modes with alpha transparency",
			"Faster website load times and improved Core Web Vitals (LCP)",
			"Modern web standard supported by all major browsers",
		],
		prosB: [
			"Ubiquitous desktop editor support (Photoshop, older apps, OS previews)",
			"Bit-for-bit standard for archival asset storage",
			"Immediate encoding without modern codec dependencies",
			"Universal printing and publishing pipeline compatibility",
		],
		specs: [
			{
				feature: "Compression Algorithm",
				formatA: "VP8L predictive spatial transform",
				formatB: "Deflate (LZ77 + Huffman filters)",
			},
			{
				feature: "Average Size vs PNG",
				formatA: "~25-35% smaller",
				formatB: "Baseline reference",
			},
			{
				feature: "Transparency Support",
				formatA: "Yes (in both lossy and lossless)",
				formatB: "Yes (8-bit alpha channel)",
			},
			{
				feature: "Animation Support",
				formatA: "Yes (Animated WebP)",
				formatB: "Limited (APNG extension)",
			},
			{
				feature: "Global Browser Support",
				formatA: "~98% of all browsers",
				formatB: "100% universal support",
			},
		],
		verdict:
			"Convert PNG to WebP for modern web deployment to cut page weight and improve site speed. Keep PNG as your master source file in design applications.",
		relatedTools: [
			"image/webp-to-png",
			"image/png-to-webp",
			"image/webp-to-jpg",
		],
	},
	{
		slug: "mp4-vs-mkv",
		title: "MP4 vs MKV: Which Video Container Should You Choose?",
		description:
			"Compare MP4 and MKV container formats. Analyze streaming compatibility, multiple audio and subtitle tracks, hardware decoding, and crash recovery.",
		formatA: "MP4",
		formatB: "MKV",
		category: "video",
		summary:
			"MP4 is the universal standard for web streaming, social media, and mobile playback. MKV (Matroska) is an extensible, open-standard multimedia container designed for media archival, supporting virtually any video codec, multi-language audio tracks, and styled subtitles.",
		prosA: [
			"Universal playback across all browsers, smartphones, TVs, and gaming consoles",
			"Native HTML5 <video> browser playback without transcoding",
			"Optimized faststart 'moov atom' streaming over HTTP",
			"Standard export format for social platforms (YouTube, TikTok, Instagram)",
		],
		prosB: [
			"Supports virtually any audio/video codec (AV1, VP9, DTS-HD, TrueHD, FLAC)",
			"Multiple selectable subtitle tracks (SSA/ASS styled anime subs, PGS, VTT)",
			"Crash resilience: interrupted recordings remain playable up to the crash point",
			"Multiple audio language tracks within a single container",
		],
		specs: [
			{
				feature: "Container Standard",
				formatA: "ISO/IEC 14496-14 (MPEG-4 Part 14)",
				formatB: "Matroska Open Standard (EBML)",
			},
			{
				feature: "Browser Native Playback",
				formatA: "Universal (H.264/AAC)",
				formatB: "Requires transcoding or external player",
			},
			{
				feature: "Subtitle Flexibility",
				formatA: "Basic timed text (TX3G)",
				formatB: "Full ASS/SSA, PGS, VTT, SRT embedded",
			},
			{
				feature: "Interrupted Recording",
				formatA: "Header corruption if cut abruptly",
				formatB: "Segment-based; fully recoverable",
			},
			{
				feature: "Audio Passthrough",
				formatA: "AAC, MP3, AC3 (limited)",
				formatB: "Lossless FLAC, DTS-HD Master, TrueHD",
			},
		],
		verdict:
			"Use MP4 for sharing, web streaming, social media uploads, and broad device playback. Use MKV for movie archiving, multi-language anime/films with styled subtitles, and live screen recordings in OBS.",
		relatedTools: [
			"video/mkv-to-mp4",
			"video/mp4-to-webm",
			"video/webm-to-mp4",
		],
	},
	{
		slug: "epub-vs-pdf",
		title: "EPUB vs PDF: E-Reader Reflowable Text vs Fixed Page Print Fidelity",
		description:
			"Should you read or publish in EPUB or PDF? Compare responsive reflowable typography, mobile reading convenience, print fidelity, and device compatibility.",
		formatA: "EPUB",
		formatB: "PDF",
		category: "document",
		summary:
			"EPUB is designed for dynamic reading, automatically reflowing text to fit any screen size or font adjustment. PDF locks content to a rigid digital page canvas, ensuring identical typography, diagrams, and print margins regardless of device.",
		prosA: [
			"Reflowable text adapts seamlessly to any screen size, orientation, and font size",
			"Natural reading experience on Kindle, Kobo, iPad, and mobile screens",
			"Significantly lighter file size than scanned or rendered PDFs",
			"Built-in accessibility (screen reader text-to-speech, custom contrast and margins)",
		],
		prosB: [
			"100% pixel-perfect fixed layout preserving exact typography, columns, and print margins",
			"Universal standard for legal documents, academic papers, contracts, and printing",
			"Robust vector drawings, embedded fonts, and precise page numbering",
			"Viewable identically on any operating system without layout shifting",
		],
		specs: [
			{
				feature: "Layout Engine",
				formatA: "Dynamic Reflowable HTML5/CSS",
				formatB: "Fixed PostScript Geometry Canvas",
			},
			{
				feature: "Mobile Screen UX",
				formatA: "Optimal (text wraps automatically)",
				formatB: "Requires pinch-to-zoom and panning",
			},
			{
				feature: "File Structure",
				formatA: "Open ZIP package of XHTML/CSS",
				formatB: "Binary document with embedded object streams",
			},
			{
				feature: "Digital Signatures & Forms",
				formatA: "Unsupported",
				formatB: "Industry-standard cryptographic signatures",
			},
			{
				feature: "Target Use",
				formatA: "Novels, prose, technical ebooks",
				formatB: "Forms, contracts, research papers, print prep",
			},
		],
		verdict:
			"Convert PDF to EPUB or text for comfortable reading on mobile devices and e-readers. Use PDF for contracts, print materials, and academic papers with rigid formatting.",
		relatedTools: [
			"document/epub-to-markdown",
			"document/cbz-to-pdf",
			"document/goodnotes-to-pdf",
		],
	},
	{
		slug: "m4a-vs-mp3",
		title: "M4A (AAC) vs MP3: Audio Compression, Sound Quality & Compatibility",
		description:
			"Is M4A better quality than MP3? Compare AAC compression efficiency at equivalent bitrates, Apple ecosystem integration, and hardware compatibility.",
		formatA: "M4A",
		formatB: "MP3",
		category: "audio",
		summary:
			"M4A (typically encoded with AAC) is the technological successor to MP3, delivering noticeably crisper audio at lower bitrates. MP3 remains the most universally compatible audio format ever created.",
		prosA: [
			"Superior audio fidelity to MP3 at identical bitrates (128 kbps AAC rivals 192 kbps MP3)",
			"Native format for Apple Music, iTunes, YouTube, and modern streaming platforms",
			"Supports multi-channel 5.1 and 7.1 surround sound audio",
			"Efficient psychoacoustic modeling prevents high-frequency smearing",
		],
		prosB: [
			"100% universal hardware and software compatibility across decades of devices",
			"Supported on every car stereo, MP3 player, legacy Hi-Fi system, and game engine",
			"Simple, rock-solid ID3v1/ID3v2 tagging standard",
			"Zero licensing royalties on modern decoders",
		],
		specs: [
			{
				feature: "Default Codec",
				formatA: "Advanced Audio Coding (AAC) or ALAC",
				formatB: "MPEG-1 Audio Layer III",
			},
			{
				feature: "Compression Efficiency",
				formatA: "Transparent audio at ~160-256 kbps",
				formatB: "Requires 320 kbps for near-transparency",
			},
			{
				feature: "Surround Channels",
				formatA: "Up to 48 independent channels",
				formatB: "Stereo (2 channels) and Joint Stereo",
			},
			{
				feature: "Maximum Sample Rate",
				formatA: "Up to 96 kHz",
				formatB: "Up to 48 kHz",
			},
			{
				feature: "Container Architecture",
				formatA: "MPEG-4 Part 14 Container (.m4a)",
				formatB: "Raw Elementary Bitstream",
			},
		],
		verdict:
			"Use M4A (AAC) for recording voice notes, Apple devices, and modern music collections to save disk space with higher clarity. Convert M4A to MP3 when broad compatibility with car stereos or legacy media players is required.",
		relatedTools: ["audio/mp4-to-m4a", "audio/wav-to-mp3", "audio/opus-to-mp3"],
	},
	{
		slug: "vtt-vs-srt",
		title: "WebVTT vs SRT: HTML5 Web Subtitles vs Classic Video Text",
		description:
			"Detailed comparison between WebVTT (.vtt) and SubRip (.srt). Compare CSS styling, positioning, HTML5 <track> browser support, and video player compatibility.",
		formatA: "WebVTT",
		formatB: "SRT",
		category: "document",
		summary:
			"WebVTT is the W3C web standard subtitle format built specifically for HTML5 video with native CSS styling and viewport cue positioning. SRT is the classic plain-text subtitle format supported universally by desktop video players and editing suites.",
		prosA: [
			"Native W3C subtitle standard for HTML5 <video> <track> elements",
			"Supports CSS styling (colors, fonts, text shadows, background boxes)",
			"Precise screen positioning, line alignment, and vertical writing cues",
			"Supports voice identification tags (<v Roger>), timestamps, and karaoke cues",
		],
		prosB: [
			"The most widely supported subtitle format in video history",
			"Compatible with VLC, MPV, Plex, YouTube, and all desktop media players",
			"Dead-simple human-readable plain text structure (counter, timecode, text)",
			"Extremely easy to edit manually in any text editor",
		],
		specs: [
			{
				feature: "Timecode Syntax",
				formatA: "00:00:00.000 (period delimiter)",
				formatB: "00:00:00,000 (comma delimiter)",
			},
			{
				feature: "Header Requirement",
				formatA: "Mandatory 'WEBVTT' first line",
				formatB: "No header (starts directly with index 1)",
			},
			{
				feature: "CSS Styling Support",
				formatA: "Native via ::cue CSS selector",
				formatB: "Basic HTML tags only (<i>, <b>, <font>)",
			},
			{
				feature: "Positioning Cues",
				formatA: "line:, position:, size:, align: tags",
				formatB: "Center-bottom screen default only",
			},
			{
				feature: "HTML5 Browser Support",
				formatA: "Native in all web browsers",
				formatB: "Requires browser conversion to WebVTT",
			},
		],
		verdict:
			"Use WebVTT for web video players, online streaming platforms, and styled captioning. Convert SRT to WebVTT for immediate playback in HTML5 video elements.",
		relatedTools: [
			"document/srt-to-vtt",
			"document/vtt-to-srt",
			"document/ass-to-srt",
		],
	},
];

export function getComparison(slug: string): ComparisonMeta | undefined {
	return COMPARISONS.find((c) => c.slug === slug);
}

export function getComparisonsByFormat(format: string): ComparisonMeta[] {
	const f = format.toLowerCase();
	return COMPARISONS.filter(
		(c) =>
			c.formatA.toLowerCase() === f ||
			c.formatB.toLowerCase() === f ||
			c.slug.includes(f),
	);
}
