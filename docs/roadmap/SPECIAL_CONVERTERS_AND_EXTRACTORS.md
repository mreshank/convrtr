# convrtr — Special Converters, Extractors & Decrypters (Master Source of Truth)

> **The Long-Tail Manifesto:**
> The web converter ecosystem is dominated by identical tools converting PNG to JPG and MP4 to MP3. Meanwhile, thousands of real people every week find themselves stranded with proprietary, obfuscated, abandoned, or light-DRM file formats. Whether a file format is requested by a hundred thousand users or ten people on a Reddit forum, if the underlying bytes exist and can be safely extracted or converted in the user's browser, **convrtr will build it**.
>
> **The Zero-Server Guarantee:**
> Proprietary files often carry immense personal, financial, legal, or creative stakes: security camera footage of a crime, hours of digital artwork timelapse, corporate meeting recordings, or game assets. Unlike shady "free online converter" sites that upload user files to opaque servers, **convrtr executes 100% client-side in the browser** using Web Crypto, `fflate`, WebAssembly, and native Web APIs. Nothing is ever uploaded.

---

## Catalogue Summary Matrix

| Format Extension | Format Name | Domain | Primary Technical Nature | Feasibility | Status |
|---|---|---|---|---|---|
| `.mlw` | MyLiveWallpaper / Course Wrapper | Screen/Video | AES-128-GCM encrypted MP4 container | `TRIVIAL` | **SHIPPED** |
| `.procreate` | Procreate Artwork & Timelapse | Creative Art | ZIP archive containing `video.mp4` & PNG preview | `TRIVIAL` | **SHIPPED** |
| `.rpgmvp` / `.rpgmvo` / `.rpgmvm` | RPG Maker MV/MZ Encrypted Assets | Game Modding | 16-byte fake header + 16-byte XOR obfuscated PNG/OGG/M4A | `TRIVIAL` | **SHIPPED** |
| `.tgs` | Telegram Animated Sticker | Animation / Vector | GZIP-compressed Lottie animation JSON | `TRIVIAL` | **SHIPPED** |
| `.dav` / `.dhav` | Dahua / Amcrest CCTV Footage | Surveillance | DHAV packet framing over H.264/H.265 NAL units | `SOLVED` | **SHIPPED** |
| `.264` / `.h264` | Raw H.264 Elementary Stream | Surveillance | Naked Annex B NAL units lacking container metadata | `SOLVED` | **SHIPPED** |
| `.xmind` | XMind Mindmap | Productivity | ZIP archive with `content.json` node tree | `TRIVIAL` | **SHIPPED** |
| `.clip` | Clip Studio Paint Canvas | Creative Art | SQLite 3 database with embedded canvas preview tiles | `SOLVED` | **SHIPPED** |
| `.pkg` / `.tex` | Wallpaper Engine Package & Texture | Personalization | Custom container with embedded MP4s & DXT textures | `SOLVED` | **SHIPPED** |
| `.sf2` / `.sfz` | SoundFont Instrument Bank | Audio / Music | RIFF `sfbk` chunks containing 16-bit PCM samples | `SOLVED` | **SHIPPED** |
| `.goodnotes` | GoodNotes Notebook | Note-Taking | ZIP archive containing PDF vectors and page documents | `SOLVED` | **SHIPPED** |
| `.pck` | Godot Engine Asset Package | Game Dev | GDPC container with file table and raw payloads | `TRIVIAL` | **SHIPPED** |
| `.studio` / `.studio3` | Silhouette Studio Vector | Crafting / CAD | ZIP archive containing XML vector path geometry | `SOLVED` | **SHIPPED** |
| `.rpa` | Ren'Py Visual Novel Archive | Game Modding | Zlib-compressed index + offset-sliced asset stream | `TRIVIAL` | **SHIPPED** |
| `.car` | Apple Compiled Asset Catalog | Mobile Dev | BOM (Bill of Materials) tree with compressed renditions | `HARD` | **BACKLOG** |
| `.silk` | Skype / WeChat Voice Note | Messaging | Tencent/Skype Silk v3 speech codec (`#!SILK_V3`) | `HARD` | **BACKLOG** |
| `.opus` (WhatsApp) | WhatsApp Voice Note | Messaging | Ogg Opus with non-standard header/sample rate | `SOLVED` | **SHIPPED** |
| `.msg` | Outlook Mail Message | Enterprise Office | OLE Compound File Binary (CFB) with text & attachments | `SOLVED` | **SHIPPED** |
| `.chm` | Microsoft Compiled HTML Help | Legacy Docs | ITSF container packing compressed HTML, CSS, images | `HARD` | **BACKLOG** |
| `.adx` / `.hca` | CRIWARE Game Audio | Game Audio | Proprietary ADPCM / audio framing for console games | `SOLVED` | **SHIPPED** |
| `.wrf` / `.arf` | Cisco WebEx Meeting Recording | Meetings | Proprietary video stream from retired WebEx players | `FRONTIER` | **BACKLOG** |
| `.scorm` / `.zip` | SCORM / Articulate E-Learning | Education | Nested zip package holding media and HTML5 state | `TRIVIAL` | **SHIPPED** |
| `.icns` | Apple macOS Icon Image | System Graphics | Embedded PNG, JPEG 2000, and raw ARGB icon chunks | `TRIVIAL` | **SHIPPED** |
| `.mhtml` / `.mht` | MHTML Web Archive | Web Archiving | RFC 2557 MIME multipart with inlined base64 images & CSS | `TRIVIAL` | **SHIPPED** |
| `.vcf` / `.vcard` | vCard Address Book | Productivity | RFC 2426/6350 contacts to UTF-8 BOM CSV table | `TRIVIAL` | **SHIPPED** |
| `.dds` | DirectDraw Surface Game Texture | Game Modding / 3D | DXT1/3/5 & BC5 block decompressor to PNG | `SOLVED` | **SHIPPED** |
| `.wad` | id Tech / Doom Engine Archive | Game Modding | IWAD/PWAD lump directory with DMX sound to WAV converter | `SOLVED` | **SHIPPED** |
| `.pak` | Quake / GoldSrc (Half-Life) Archive | Game Modding | PACK directory offset table with path extraction to ZIP | `SOLVED` | **SHIPPED** |
| `.ppm` / `.pgm` / `.pbm` | Netpbm Portable Anymap Suite | Graphics / Vision | ASCII & Binary P1-P7 raster array to 32-bit RGBA PNG | `SOLVED` | **SHIPPED** |
| `.cbz` | Comic Book ZIP Archive | Comics / Manga | PKZIP container with sequential natural-sorted scans to PDF | `SOLVED` | **SHIPPED** |
| `.srt` | SubRip Subtitle Format | Video / Captions | SubRip millisecond cues to W3C-compliant WebVTT | `SOLVED` | **SHIPPED** |
| `.ico` | Windows Icon & Favicon | UI / Web Icons | Multi-frame directory with PNG/DIB & 1-bit alpha mask to PNG | `SOLVED` | **SHIPPED** |
| `.epub` | Electronic Publication E-Book | Publishing / PKM | ZIP package with OPF metadata and spine to semantic Markdown | `SOLVED` | **SHIPPED** |
| `.8svx` / `.iff` | Commodore Amiga IFF Audio | Retro / Chiptune | EA IFF 85 FORM with 8-bit PCM & Fibonacci delta to RIFF WAV | `SOLVED` | **SHIPPED** |
| `.tim` | PlayStation 1 Texture & Sprite | Retro Gaming / 3D | 4/8-bit CLUT & 15/24-bit direct color with STP alpha to PNG | `SOLVED` | **SHIPPED** |
| `.rtf` | Rich Text Format Document | Office / Productivity | RTF control word lexer & Unicode decoder to semantic Markdown | `SOLVED` | **SHIPPED** |
| `.dsp` | Nintendo GameCube / Wii DSP Audio | Retro Gaming / Audio | 4-bit DSP ADPCM with 16 prediction coefficients to 16-bit WAV | `SOLVED` | **SHIPPED** |
| `.mac` / `.pntg` | Apple Macintosh MacPaint 1-Bit Graphics | Retro / Art | Atkinson PackBits RLE 576x576 1-bit bitmap to 32-bit RGBA PNG | `SOLVED` | **SHIPPED** |
| `.tex` / `.latex` | LaTeX Scientific Document | Academic / Docs | LaTeX document macro parser with math equation preservation to Markdown | `SOLVED` | **SHIPPED** |
| `.vox` | Dialogic OKI ADPCM Telephony Audio | Audio / Telephony | 4-bit Dialogic OKI ADPCM telephony speech stream to 16-bit linear PCM WAV | `SOLVED` | **SHIPPED** |
| `.scr` | Sinclair ZX Spectrum Screen | Retro / 8-Bit Art | Non-linear interlaced 6,912-byte VRAM & attribute decoder to 32-bit RGBA PNG | `SOLVED` | **SHIPPED** |
| `.ged` / `.gedcom` | GEDCOM Genealogy Data | Genealogy / Data | Hierarchical family tree parser with cross-referenced relations to RFC 4180 CSV | `SOLVED` | **SHIPPED** |
| `.ulaw` / `.alaw` | G.711 mu-law & A-law Telephony Audio | Audio / Telecom | 8-bit G.711 logarithmic companding lookup table to 16-bit linear PCM WAV | `SOLVED` | **SHIPPED** |
| `.koa` / `.kla` | Commodore 64 KoalaPainter Bitmap | Retro / 8-Bit Art | 10,003-byte multicolor VRAM & Color RAM dump to 32-bit RGBA PNG | `SOLVED` | **SHIPPED** |
| `.aco` | Adobe Photoshop Color Swatch | Design / Palettes | v1/v2 binary color swatch parser with CMYK/Lab/RGB decoding to CSS & Tailwind | `SOLVED` | **SHIPPED** |
| `.vag` / `.vagp` | Sony PlayStation SPU-ADPCM Audio | Retro Gaming / Audio | 4-bit SPU ADPCM 16-byte block decoding with 5-coefficient filter to 16-bit WAV | `SOLVED` | **SHIPPED** |
| `.bib` / `.bibtex` | BibTeX Academic Citations | Academic / PKM | Citation database parser with LaTeX accent macro translation to Markdown | `SOLVED` | **SHIPPED** |
| `.pi1` / `.pi2` / `.pi3` / `.pc1` | Atari ST DEGAS & DEGAS Elite Graphics | Retro / 16-Bit Art | Interleaved bitplane & 9-bit RGB palette decoder with PackBits RLE to PNG | `SOLVED` | **SHIPPED** |
| `.aud` | Westwood Studios RTS Audio | Retro Gaming / Audio | WS-ADPCM / IMA-ADPCM chunked game audio decoder to 16-bit linear PCM WAV | `SOLVED` | **SHIPPED** |
| `.avr` | Atari ST / Falcon030 Audio Visual Research | Retro / Audio | Motorola big-endian 2VRH 128-byte header & signed/unsigned 8/16-bit PCM to WAV | `SOLVED` | **SHIPPED** |
| `.nfo` / `.diz` | IBM CP437 ASCII / ANSI Demoscene Art | Retro / Docs | IBM Code Page 437 byte decoder with box drawing & block elements to styled HTML / UTF-8 | `SOLVED` | **SHIPPED** |
| `.chr` | NES / Famicom 2bpp Character Tile ROM | Retro Gaming / Graphics | Planar 16-byte 8x8 tile decoder with classic NES palettes to 32-bit RGBA PNG sprite sheet | `SOLVED` | **SHIPPED** |
| `.xm` | FastTracker II Extended Module Tracker | Tracker Music / Audio | Extended Module header, multi-channel pattern unpacker, and linear frequency synthesis to 16-bit stereo WAV | `SOLVED` | **SHIPPED** |
| `.org` | Emacs Org Mode Documentation & Agenda | Productivity / Docs | Org outline tree, TODO items, checkboxes, tables, code blocks, and frontmatter to GitHub Flavored Markdown | `SOLVED` | **SHIPPED** |
| `.dcm` / `.dicom` | DICOM Medical Diagnostic Imaging | Medical / Imaging | Part 10 explicit/implicit VR transfer syntax parser with Window/Level contrast normalization to 32-bit PNG | `SOLVED` | **SHIPPED** |
| `.cgm` | Computer Graphics Metafile 2D Vector | CAD / Engineering | ISO/IEC 8632 binary and clear-text 2D vector elements to clean W3C SVG | `SOLVED` | **SHIPPED** |
| `.s3m` | Scream Tracker 3 Module Tracker | Tracker Music / Audio | Future Crew 16/32-channel pattern unpacker & GUS/AdLib chiptune synthesis to 16-bit stereo WAV | `SOLVED` | **SHIPPED** |
| `.enex` | Evernote XML Export Archive | Note-Taking / PKM | ENML note markup, attachments, tags, and timestamps to GFM Markdown | `SOLVED` | **SHIPPED** |
| `.it` | Impulse Tracker Module Tracker | Tracker Music / Audio | Jeffrey Lim 64-channel tracker, sample compression & voice synthesis to 16-bit stereo WAV | `SOLVED` | **SHIPPED** |
| `.opml` | Outline Processor Markup Language | Productivity / Feeds | OPML 1.0/2.0 outline trees, RSS subscription feeds & podcast directories to GFM tables & lists | `SOLVED` | **SHIPPED** |
| `.ora` | OpenRaster Layered Graphics Archive | Creative Art / Design | Freedesktop.org ZIP container with stack.xml & layer blend compositor to 32-bit RGBA PNG | `SOLVED` | **SHIPPED** |
| `.fb2` | FictionBook 2.0 e-Book | Publishing / E-Books | XML semantic e-book structure, embedded base64 graphics & poems to Markdown | `SOLVED` | **SHIPPED** |
| `.qoi` | Quite OK Image Fast Lossless | Fast Graphics / Vision | Dominic Szablewski lossless 8-byte chunk decompressor to 32-bit RGBA PNG | `SOLVED` | **SHIPPED** |
| `.ptm` | PolyTracker Multi-Channel Module | Tracker Music / Audio | PolyTracker PTMF 32-channel panning, 8BDIFF delta sample decoding & voice synthesis to 16-bit stereo WAV | `SOLVED` | **SHIPPED** |
| `.hdr` / `.pic` | Radiance RGBE High Dynamic Range Image | 3D Graphics / VFX | Run-length encoded 32-bit RGBE high dynamic range raster with Reinhard tone mapping & gamma encoding to PNG | `SOLVED` | **SHIPPED** |
| `.pdb` / `.prc` | Palm OS PalmDoc E-Book Database | Retro / E-Books | Palm OS database record unpacker with 4KB sliding-window LZ77 decompressor to GitHub Flavored Markdown | `SOLVED` | **SHIPPED** |
| `.neo` | Atari ST NeoChrome Master Image | Retro / 16-Bit Art | 4-bitplane planar bitmap with 16-color ST/STE color palette mapping & aspect ratio correction to 32-bit RGBA PNG | `SOLVED` | **SHIPPED** |



---

## Comprehensive Format Dossiers

---

### 1. Procreate Artwork & Timelapse Archive (`.procreate`)

- **Ecosystem & Context:** Procreate on iPad is the undisputed industry standard for mobile digital painting. When artists share their `.procreate` backup files or move between devices, they frequently discover that Windows, Android, macOS (without specific apps), and Linux cannot open, preview, or extract anything from `.procreate` files.
- **Community Need & Reddit Signals:**
  - Subreddits: r/ProCreate, r/ipad, r/digitalart, r/techsupport, r/freelance.
  - Queries: *"My iPad screen shattered, how do I get my artwork timelapse video off my PC?"*, *"Client sent me a .procreate file, how do I get a PNG or PSD without an iPad?"*, *"Extract 4k timelapse from .procreate on Windows"*.
- **Forensic Byte Layout:**
  - Magic Bytes: `50 4B 03 04` (Standard ZIP Local File Header).
  - Internal Hierarchy:
    - `Document.archive`: Apple Binary Property List (bplist00) detailing canvas resolution, DPI, color profile, layer composite modes, stroke counters, and animation settings.
    - `QuickLook/Thumbnail.png` (or `thumbnail.png` in legacy versions): Full-resolution flattened composite rendering of the artwork.
    - `video.mp4`: Complete H.264/AAC hardware-encoded screen-recording timelapse of the entire drawing history from first stroke to final render.
- **In-Browser Execution Strategy:**
  - Pure JS via `fflate.unzip`. No WASM required.
  - Can extract either `video.mp4` directly as `video/procreate-to-mp4` or `QuickLook/Thumbnail.png` as `image/procreate-to-png` in under 50ms with zero transcoding.
- **Fidelity:** `LOSSLESS` (Bit-exact extraction of the raw embedded video or PNG).
- **Status:** **Wave 1 Implementation**.

---

### 2. RPG Maker MV & MZ Encrypted Assets (`.rpgmvp`, `.rpgmvo`, `.rpgmvm`)

- **Ecosystem & Context:** RPG Maker MV and MZ are widely used indie game development engines. Creators, modders, and translators frequently encounter encrypted project files: `.rpgmvp` (PNG images), `.rpgmvo` (OGG audio), and `.rpgmvm` (M4A audio).
- **Community Need & Reddit Signals:**
  - Subreddits: r/RPGMaker, r/gamedev, r/modding, r/ReverseEngineering.
  - Queries: *"How to decrypt .rpgmvp images"*, *"Translate RPG Maker game but images are .rpgmvp"*, *"Lost my original PNGs for my game, only have the published .rpgmvp build"*.
- **Forensic Byte Layout:**
  - Offset `0x00 - 0x0F` (16 bytes): Fake obfuscation header: `52 50 47 4D 56 00 00 00 00 03 01 00 00 00 00 00` (`RPGMV\0\0\0...`).
  - Offset `0x10 - 0x1F` (16 bytes): The original file's first 16 bytes XOR-encrypted with a 16-byte key.
  - Offset `0x20` onwards: Completely unencrypted standard binary data of the original PNG or OGG file!
- **Cryptographic Breakthrough (Zero-Knowledge Key Recovery):**
  - Standard PNG files always begin with the identical 16-byte sequence:
    `89 50 4E 47 0D 0A 1A 0A 00 00 00 0D 49 48 44 52` (`\x89PNG\r\n\x1a\n\0\0\0\rIHDR`).
  - Since $Cipher = Plain \oplus Key$, it follows that:
    $$Key_i = Cipher_i \oplus Plain_i$$
  - **Result:** The user does not even need to supply `System.json`! convrtr can automatically recover the encryption key from any single `.rpgmvp` image via known-plaintext XOR recovery and decrypt it instantaneously in 1 millisecond.
- **In-Browser Execution Strategy:** Pure JS `ArrayBuffer` slice and XOR loop.
- **Fidelity:** `LOSSLESS` (Restores exact original PNG bytes).
- **Status:** **Wave 1 Implementation**.

---

### 3. Telegram Animated Stickers (`.tgs`)

- **Ecosystem & Context:** Telegram introduced vector animated stickers using the `.tgs` extension. Designers, community managers, Discord server owners, and video editors want to reuse these high-quality vector animations as Lottie JSON, GIF, or WebP.
- **Community Need & Reddit Signals:**
  - Subreddits: r/Telegram, r/discordapp, r/graphic_design, r/AfterEffects.
  - Queries: *"How to convert .tgs sticker to GIF for Discord"*, *"How to open .tgs in After Effects"*, *"Turn Telegram sticker into Lottie JSON"*.
- **Forensic Byte Layout:**
  - Magic Bytes: `1F 8B 08` (Standard GZIP specification).
  - Internal Payload: Plain UTF-8 JSON text conforming to the Airbnb Lottie / Bodymovin animation specification (layers, shapes, keyframe curves, color fills).
- **In-Browser Execution Strategy:**
  - Pure JS via `fflate.gunzipSync`.
  - Decompresses in 2ms to valid Lottie JSON (`data/tgs-to-json`). Can also pipe into Canvas / WebCodecs / GIF encoder for animated visual output.
- **Fidelity:** `LOSSLESS` (Bit-exact decompression of the source Lottie JSON).
- **Status:** **Wave 1 Implementation**.

---

### 4. Dahua / Amcrest CCTV Security Footage (`.dav`, `.dhav`)

- **Ecosystem & Context:** Millions of Dahua, Amcrest, Lorex, and Q-See security NVRs export footage in the proprietary `.dav` container. When incidents occur (burglaries, car crashes, insurance disputes), users export footage to a USB drive only to find that Windows Media Player, QuickTime, mobile phones, and standard video players cannot play it.
- **Community Need & Reddit Signals:**
  - Subreddits: r/CCTV, r/techsupport, r/legaladvice, r/Dashcam.
  - Queries: *"Need to show car accident footage to insurance but it's .dav"*, *"Court/lawyer cannot open .dav security video"*, *"VLC won't play .dav or plays in 10x fast forward with no audio"*.
- **Forensic Byte Layout:**
  - Stream Framing: Packets preceded by the `DHAV` or `DAHUA` 4-byte marker.
  - Packet Header: Custom 16-to-24-byte header containing frame type (I-frame/P-frame), microsecond timestamp, channel number, and payload length.
  - Payload: Standard H.264 (AVC) or H.265 (HEVC) NAL units (`00 00 00 01` Annex B framing).
- **In-Browser Execution Strategy:**
  - Demuxing DHAV packets: Pure JS packet unwrapper strips DHAV framing, synthesizes an MP4 container box (`ftyp`, `moov`, `mdat`), and repacks the H.264 NAL units without re-encoding. Alternatively handled via FFmpeg WASM (`-c copy`).
- **Fidelity:** `LOSSLESS` (Pure remuxing, zero re-encoding).
- **Status:** **Wave 2 Priority**.

---

### 5. Raw H.264 Elementary Stream (`.264`, `.h264`)

- **Ecosystem & Context:** Direct dumps from IP cameras, dashcams, and DVR hard drives often yield raw H.264 elementary streams without any container wrapper (no MP4, MKV, or AVI metadata).
- **Community Need & Reddit Signals:**
  - Subreddits: r/ffmpeg, r/techsupport, r/raspberry_pi.
  - Queries: *"Dumped video from security camera hard drive, have a 2GB .264 file, VLC can't seek"*, *"How to wrap .264 into MP4 without re-encoding"*.
- **Forensic Byte Layout:**
  - Raw NAL units separated by start codes `00 00 01` or `00 00 00 01`. No header, no container index, no duration.
- **In-Browser Execution Strategy:**
  - FFmpeg WASM or pure JS MP4 muxer: parses SPS/PPS NAL units to extract resolution and profile, wraps samples into standard MP4 `stts`/`stss`/`ctts` time-to-sample tables at user-selected framerate (24/25/30/60 fps).
- **Fidelity:** `LOSSLESS`.
- **Status:** **Wave 2 Priority**.

---

### 6. Ren'Py Visual Novel Archives (`.rpa`)

- **Ecosystem & Context:** Ren'Py powers thousands of visual novels and indie adventure games. Game assets (character sprites, backgrounds, music, voice lines, scripts) are packed into `.rpa` archives.
- **Community Need & Reddit Signals:**
  - Subreddits: r/RenPy, r/visualnovels, r/modding, r/datahoarder.
  - Queries: *"How to extract music from .rpa file on Mac without installing Python"*, *"Unpack .rpa archive online"*, *"Get CG artwork out of Ren'Py game"*.
- **Forensic Byte Layout:**
  - Header Line: `RPA-3.0 <16-hex-offset> <8-hex-key>\n` (ASCII text).
  - Index Block: Located at the specified byte offset, compressed with ZLIB.
  - Obfuscation: Index contains file paths and `(offset ^ key, length ^ key)` tuples serialized as a Python pickle or binary structure.
- **In-Browser Execution Strategy:**
  - Pure JS: Read header line, seek to index offset, decompress with `fflate.inflateSync`, parse index entries, slice ArrayBuffer into named files, and wrap in a downloadable ZIP using convrtr's native `fflate` zip engine.
- **Fidelity:** `LOSSLESS`.
- **Status:** **Wave 2 Priority**.

---

### 7. Wallpaper Engine Package & Texture Files (`.pkg`, `.tex`)

- **Ecosystem & Context:** Wallpaper Engine on Steam is used by tens of millions of PC gamers. Downloaded wallpapers are stored as `.pkg` files in Steam Workshop directories, locking videos and textures inside proprietary bundles.
- **Community Need & Reddit Signals:**
  - Subreddits: r/wallpaperengine, r/pcmasterrace, r/steam, r/datahoarder.
  - Queries: *"Extract video wallpaper from Wallpaper Engine .pkg"*, *"Convert .tex texture from Wallpaper Engine to PNG"*.
- **Forensic Byte Layout:**
  - Header: Magic `PKGV0001` or `PKGV0002`.
  - Archive Table: File count, null-terminated filenames, byte offsets, and sizes. Video wallpapers are frequently raw MP4 files packed directly into the archive without recompression.
  - `.tex` Files: Header `TEXV0001` through `TEXV0003`, image dimensions, format enum (DXT1, DXT5, BC7, or RGBA8888), followed by texture mipmaps.
- **In-Browser Execution Strategy:**
  - Package Extractor: Pure JS reads the PKG table and slices files. For video wallpapers, immediately emits the embedded `.mp4` file.
  - Texture Decoder: BC1/BC3/BC7 block decompression in pure JS or WASM to standard Canvas ImageData.
- **Fidelity:** `LOSSLESS` for video extraction; bit-exact texture decoding.
- **Status:** **Wave 2 Priority**.

---

### 8. Silhouette Studio Cutting Machine Vector (`.studio`, `.studio3`)

- **Ecosystem & Context:** Silhouette Cameo cutting plotters save design projects in `.studio` and `.studio3` formats. Crafters who switch to Cricut, Glowforge laser cutters, or Brother ScanNCut machines are locked out of their design library because Silhouette Studio charges a $50 upgrade fee for "Business Edition" just to export SVG.
- **Community Need & Reddit Signals:**
  - Subreddits: r/cricut, r/silhouettecameo, r/crafts, r/lasercutting.
  - Queries: *"Convert .studio3 to SVG free"*, *"Locked into Silhouette, need SVG for Cricut"*, *"Export Silhouette files to laser cutter"*.
- **Forensic Byte Layout:**
  - Container: ZIP archive containing XML manifests, vector geometry chunks, and embedded raster thumbnails.
  - Vector Encoding: XML elements defining polylines, cubic Bézier control points, cut line types, and layer groups.
- **In-Browser Execution Strategy:**
  - Pure JS: Unzips archive, traverses XML document, converts geometry nodes into standard SVG `<path d="...">` elements with millimeter/inch unit scaling.
- **Fidelity:** `LOSSLESS-CAPABLE` (Vector to vector).
- **Status:** **Wave 3 Priority**.

---

### 9. Clip Studio Paint Canvas (`.clip`)

- **Ecosystem & Context:** Clip Studio Paint (formerly Manga Studio) is the dominant comic, manga, and illustration software worldwide.
- **Community Need & Reddit Signals:**
  - Subreddits: r/ClipStudio, r/art, r/comicbooks.
  - Queries: *"Open .clip file on computer without Clip Studio"*, *"Extract preview from .clip file"*, *"Convert .clip to PSD"*.
- **Forensic Byte Layout:**
  - Container: Standard **SQLite 3 Database** (`SQLite format 3\0` magic header).
  - Structure: Table `CanvasPreview` contains a raw PNG blob of the canvas. Table `Canvas` contains layer hierarchies, layer blend modes, and tiled bitmap blocks.
- **In-Browser Execution Strategy:**
  - Quick Preview Extractor: Scans SQLite pages for the PNG header `89 50 4E 47` to immediately extract the high-resolution artwork without needing a full SQL engine.
- **Fidelity:** `LOSSLESS` preview extraction.
- **Status:** **Wave 3 Priority**.

---

### 10. Skype / WeChat / QQ Silk v3 Voice Notes (`.silk`)

- **Ecosystem & Context:** WeChat and QQ export voice message archives using the proprietary Silk v3 speech compression codec. Users backing up family histories, legal communications, or voice recordings discover that no mainstream player supports `.silk`.
- **Community Need & Reddit Signals:**
  - Subreddits: r/WeChat, r/translator, r/legaladvice, r/datahoarder.
  - Queries: *"How to play .silk audio file"*, *"Convert WeChat voice message to MP3"*, *"Silk v3 audio decoder online"*.
- **Forensic Byte Layout:**
  - Magic Header: `0x02` followed by `#!SILK_V3` (ASCII).
  - Audio Stream: Packet-based speech codec operating with 20ms frames, supporting sample rates 8kHz, 12kHz, 16kHz, and 24kHz.
- **In-Browser Execution Strategy:**
  - WASM-compiled Silk v3 decoder decodes frames to 16-bit linear PCM, then writes standard RIFF WAV header or encodes via `lamejs` to MP3.
- **Fidelity:** `LOSSLESS` to WAV (decoded PCM), `LOSSY-ON-REQUEST` to MP3.
- **Status:** **Wave 15 Shipped (`audio/silk-to-wav`)**.

---

### 11. Microsoft Outlook Binary Message (`.msg`)

- **Ecosystem & Context:** Microsoft Outlook exports single emails as `.msg` files. Non-Outlook users (macOS, Linux, webmail users) cannot read these proprietary binary containers natively.
- **Community Need & Reddit Signals:**
  - Subreddits: r/sysadmin, r/legaladvice, r/techsupport, r/mac.
  - Queries: *"Open .msg file on Mac without Outlook"*, *"Client sent evidence as .msg, how do I view attachments"*, *"Convert .msg to PDF"*.
- **Forensic Byte Layout:**
  - Format: Microsoft Compound File Binary (CFB / OLE 2.0). Magic `D0 CF 11 E0 A1 B1 1A E1`.
  - Internal Streams: `__substg1.0_1000001F` (Body HTML/Text), `__substg1.0_0037001F` (Subject), `__attach_version1.0_#` (Binary attachment streams).
- **In-Browser Execution Strategy:**
  - Pure JS CFB directory walker: Parses OLE sector allocation table (SAT), extracts Subject, Date, From/To, HTML body, and emits a clean HTML document or bundles email and extracted attachments into a ZIP.
- **Fidelity:** `LOSSLESS` (Attachments extracted bit-exact).
- **Status:** **Wave 3 Priority**.

---

### 12. XMind Mindmap (`.xmind`)

- **Ecosystem & Context:** XMind is a widely used mind-mapping application. Users migrating to Obsidian, Logseq, Markdown, or Notion want their hierarchical tree structures exported to standard Markdown without paying for software licenses.
- **Community Need & Reddit Signals:**
  - Subreddits: r/mindmapping, r/ObsidianMD, r/PKMS, r/productivity.
  - Queries: *"Convert XMind to Markdown"*, *"Export XMind notes to Obsidian"*, *"Extract images from .xmind file"*.
- **Forensic Byte Layout:**
  - Container: Standard ZIP archive.
  - Structure: `content.json` defines the entire node tree with root topic, subtopics, notes, callouts, and relationships. `Thumbnails/thumbnail.png` contains visual overview.
- **In-Browser Execution Strategy:**
  - Pure JS: Unzips via `fflate`, recursively walks `content.json` tree, outputs clean indented Markdown headings (`# Topic`, `## Subtopic`, `- Bullet notes`) and extracts any attached image files.
- **Fidelity:** `LOSSLESS` (Structural semantic representation).
- **Status:** **Wave 3 Priority**.

---

### 13. SoundFont Instrument Bank (`.sf2`, `.sfz`)

- **Ecosystem & Context:** SoundFont 2 (`.sf2`) is the classic standard for sample-based MIDI synthesizers (Creative Labs EMU, Sound Blaster, General MIDI). Music producers and chiptune enthusiasts have rare soundfont libraries and want individual instrument samples as standard `.wav` files.
- **Community Need & Reddit Signals:**
  - Subreddits: r/producing, r/synthesizers, r/midi, r/FL_Studio.
  - Queries: *"Extract WAV samples from .sf2 soundfont"*, *"Convert soundfont to individual instrument WAV files"*.
- **Forensic Byte Layout:**
  - Container: RIFF format with `sfbk` form type.
  - Internal Chunks: `INFO-list` (metadata), `sdta-list` (contains `smpl` chunk with contiguous 16-bit linear PCM audio), and `pdta-list` (headers with sample names, start/end loop offsets, sample rates, and root keys).
- **In-Browser Execution Strategy:**
  - Pure JS RIFF chunk parser: reads `shdr` (sample headers), extracts named audio slices from the `smpl` PCM block, adds standard 44-byte WAV headers, and bundles them into a clean ZIP folder.
- **Fidelity:** `LOSSLESS` (Bit-exact 16-bit PCM slice).
- **Status:** **Wave 3 Priority**.

---

### 14. Godot Game Engine Asset Archive (`.pck`)

- **Ecosystem & Context:** Godot Engine exports games packaged into a `.pck` file. Modders, indie developers recovering lost assets, and game preservationists frequently need to inspect or extract resources.
- **Forensic Byte Layout:**
  - Magic Bytes: `0x43504447` (`GDPC`).
  - Header: Format version, Godot engine major/minor/patch, reserved flags, and file entry count.
  - File Table: For each entry: string length, file path, byte offset, byte size, and MD5 checksum.
- **In-Browser Execution Strategy:**
  - Pure JS: Reads file table, extracts each asset range, validates MD5, and creates a ZIP archive.
- **Fidelity:** `LOSSLESS`.
- **Status:** **Wave 4 Priority**.

---

### 15. GoodNotes Notebook Archive (`.goodnotes`)

- **Ecosystem & Context:** GoodNotes (versions 5 & 6) is the dominant digital handwriting and note-taking platform for iPad and macOS. Students, researchers, and professionals frequently export entire lecture courses or books as `.goodnotes` archives. When accessing notes from Windows, Android, Linux, or non-Apple laptops, users are completely unable to open, view, or convert their `.goodnotes` files without paying for subscriptions or third-party apps.
- **Community Need & Reddit Signals:**
  - Subreddits: r/goodnotes, r/ipad, r/students, r/medicalschool, r/techsupport.
  - Queries: *"How to open .goodnotes file on Windows without an iPad?"*, *"Accidentally exported as .goodnotes instead of PDF, how to convert back?"*, *"GoodNotes to PDF converter online free"*.
- **Forensic Byte Layout:**
  - Container: Standard ZIP archive (`PK\x03\x04`).
  - Internal Hierarchy:
    - `attachments/`: Embedded images, figures, and audio clips.
    - Page PDF fragments: Page vector streams either stored as individual ordered PDFs (`page-0.pdf`, `page-1.pdf`, etc.) or combined master document.
    - Page rendering fallbacks: High-resolution raster composites if vector streams are cached.
- **In-Browser Execution Strategy:**
  - Pure client-side: Unzips archive using `fflate`. Discovers page PDFs or raster pages. Uses `pdf-lib` to sequentially merge all pages into a unified, high-fidelity PDF notebook.
- **Fidelity:** `LOSSLESS` (Direct PDF page stream extraction and vector concatenation).
- **Status:** **Wave 4 Priority**.

---

### 16. Silhouette Studio Craft Vector (`.studio`, `.studio3`)

- **Ecosystem & Context:** Silhouette Studio is the proprietary software for Silhouette Cameo, Portrait, and Curio vinyl cutters and plotters. Silhouette deliberately gates SVG export behind a paid $99 "Business Edition" upgrade. Craft makers, small Etsy business owners, and laser cutter hobbyists who receive `.studio3` cut files or switch to Cricut/Glowforge/Inkscape cannot convert their designs without paying or using shady websites.
- **Community Need & Reddit Signals:**
  - Subreddits: r/cricut, r/silhouettecutters, r/crafts, r/lasercutting, r/EtsySellers.
  - Queries: *"Convert .studio3 to SVG without buying Business Edition"*, *"Open Silhouette files in Cricut Design Space"*, *"Free .studio to .svg converter"*.
- **Forensic Byte Layout:**
  - Container: ZIP archive (`PK\x03\x04`).
  - Content: XML documents describing vector canvas geometry.
  - Vector Elements: Path coordinates, Bézier curves, cut lines, stroke weights, and hex fill colors.
- **In-Browser Execution Strategy:**
  - Pure JS: Unzips XML contents, parses path data, lines, rectangles, polygons, and ellipses, and emits a clean, standard SVG document ready for Cricut Design Space or Inkscape.
- **Fidelity:** `VECTOR-EXACT`.
- **Status:** **Wave 4 Priority**.

---

### 17. Ren'Py Visual Novel Archive (`.rpa`)

- **Ecosystem & Context:** Ren'Py powers thousands of indie visual novels and narrative games (e.g., *Doki Doki Literature Club*, *Slay the Princess*, *Katawa Shoujo*). Modders, fan-translators, and game preservationists frequently need to extract scripts (.rpy/.rpyc), background artwork, character sprites, and sound effects. Traditional tools require installing Python environments or command-line scripts like `unrpa`.
- **Community Need & Reddit Signals:**
  - Subreddits: r/RenPy, r/visualnovels, r/modding, r/DDLC.
  - Queries: *"How to unpack .rpa files without installing Python"*, *"Extract sprites and music from Ren'Py game"*, *"Online .rpa extractor"*.
- **Forensic Byte Layout:**
  - Magic Line: `RPA-3.0 <offset_hex> <key_hex>\n` (also supports `RPA-3.2` and legacy `RPA-2.0`).
  - Index Location: Offset specified in ASCII hex at start of archive.
  - Compression: The index table is zlib-compressed (`0x78 0x9C` / `0x78 0xDA`).
  - Serialization: Python pickle bytecode protocol stream containing a dictionary: `{ filename: [ (offset, length, prefix), ... ] }`.
  - Obfuscation: In RPA-3.0 and RPA-3.2, offset and length integers are XOR-masked with `key_hex`.
- **In-Browser Execution Strategy:**
  - Pure TypeScript: Includes a custom Python pickle opcode VM (evaluating `EMPTY_DICT`, `SETITEM`, `SETITEMS`, `APPEND`, `TUPLE`, `BINUNICODE`, `BININT`, `BINPUT`, `BINGET`), de-obfuscates offset ranges with bitwise XOR, slices byte streams without re-encoding, and packages files into a structured ZIP via `fflate`.
- **Fidelity:** `LOSSLESS` (Bit-exact original asset extraction).
- **Status:** **Wave 5 Shipped (`document/rpa-to-zip`)**.

---

### 18. WhatsApp Voice Notes (`.opus`, `.ogg`)

- **Ecosystem & Context:** WhatsApp transmits voice notes using the Opus speech codec encapsulated in an Ogg container, exported with `.opus` or `.ogg` file extensions. Default desktop audio players (Windows Media Player, older QuickTime) and editing suites (Adobe Premiere Pro, DaVinci Resolve, Audacity) frequently fail to open WhatsApp voice recordings.
- **Community Need & Reddit Signals:**
  - Subreddits: r/whatsapp, r/audioengineering, r/editors, r/techsupport.
  - Queries: *"How to convert WhatsApp voice note to MP3 on PC"*, *"Premiere Pro won't import WhatsApp .opus audio"*, *"Play .opus voice note in car stereo"*.
- **Forensic Byte Layout:**
  - Container: Ogg bitstream framing (`OggS`).
  - Identification Header: `OpusHead` with channel count, pre-skip, input sample rate, and output gain.
  - Audio Packets: Variable bitrate Opus frames optimized for speech clarity (8kHz–48kHz).
- **In-Browser Execution Strategy:**
  - Self-hosted FFmpeg WebAssembly core: Transcodes Opus voice streams into universal 192kbps MP3 audio entirely inside the browser's sandboxed worker thread without uploading sensitive personal voice recordings to remote servers.
- **Fidelity:** `BALANCED` (Standard 192kbps MP3 transcode).
- **Status:** **Wave 5 Shipped (`audio/opus-to-mp3`)**.

---

### 19. Microsoft Outlook Message Archive (`.msg`)

- **Ecosystem & Context:** Microsoft Outlook saves individual emails, calendar items, and tasks in the proprietary Compound File Binary (.msg) format. Mac users (Apple Mail), iPhone/iPad users, Linux desktops, and Thunderbird cannot open `.msg` files natively. Users are routinely forced to use dangerous online converters that upload sensitive personal or corporate communications to unknown cloud servers.
- **Community Need & Reddit Signals:**
  - Subreddits: r/sysadmin, r/msp, r/mac, r/Outlook, r/thunderbird, r/legaladvice.
  - Queries: *"How to open .msg file on Mac without Outlook"*, *"Convert Outlook email to .eml for Thunderbird"*, *"Batch convert .msg to .eml free private"*.
- **Forensic Byte Layout:**
  - Container: OLE Compound File Binary (CFB) format starting with `D0 CF 11 E0 A1 B1 1A E1`.
  - Storage Hierarchy: Sector allocation tables (FAT/MiniFAT), Directory stream with 128-byte object entries.
  - Property Streams:
    - `__substg1.0_0037001F`: Email Subject (UTF-16LE).
    - `__substg1.0_0C1A001F`: Sender Name.
    - `__substg1.0_0E04001F`: Display To recipient.
    - `__substg1.0_1000001F`: Plain Text Message Body.
    - `__substg1.0_10130102`: Compressed RTF or HTML body.
    - `__attach_version1.0_#`: Embedded attachment sub-storages with filename (`3707001F`) and binary payload (`37010102`).
- **In-Browser Execution Strategy:**
  - Pure TypeScript OLE CFB parser: Traverses compound sector chains, MiniFAT sub-streams, parses standard MAPI property tags, extracts and decodes text bodies, extracts binary attachments, and synthesizes a compliant RFC 822 `.eml` multipart MIME message with base64 attachment parts.
- **Fidelity:** `LOSSLESS` (Full email metadata, text, HTML, and bit-exact attachments preserved).
- **Status:** **Wave 5 Shipped (`document/msg-to-eml`)**.

---

### 20. CRIWARE ADX Game Audio (`.adx`)

- **Ecosystem & Context:** CRIWARE ADX is the dominant game audio compression standard developed by CRI Middleware, powering thousands of Sega Dreamcast, PlayStation 2, Nintendo GameCube, Wii, and modern Japanese console titles (e.g., *Sonic Adventure*, *Phantasy Star Online*, *Persona*, *Shenmue*). Game modders, chiptune preservationists, and soundtrack collectors routinely face `.adx` files that cannot be played by VLC or desktop media players without installing ancient Winamp plugins.
- **Community Need & Reddit Signals:**
  - Subreddits: r/gamedev, r/SonicTheHedgehog, r/modding, r/emulation, r/chiptunes.
  - Queries: *"How to convert .adx to .wav on PC without old command line tools"*, *"Extract soundtrack from Dreamcast .adx audio"*, *"Play CRIWARE ADX audio"*.
- **Forensic Byte Layout:**
  - Magic Marker: `0x80 0x00` at byte offset 0.
  - Header: Offset 2 contains `copyright_offset` (audio frames begin at `copyright_offset + 4`). Encoding type 3 (standard ADX ADPCM), block size 18 bytes, 4 bits per sample. Offset 7 specifies channel count (1=mono, 2=stereo), sample rate (32-bit BE), total sample count (32-bit BE), and highpass filter cutoff frequency (16-bit BE).
  - Framing: Interleaved 18-byte channel blocks. Each block contains a 16-bit scale factor followed by 16 bytes representing 32 4-bit differential signed nibbles.
- **In-Browser Execution Strategy:**
  - Pure TypeScript: Mathematically derives 2-pole linear prediction filter coefficients from highpass frequency and sample rate ($d = \sqrt{2} - \cos(2\pi f / r)$, $c = (\sqrt{2} - 1)/d$, $a = \sqrt{2} - c$, $b = c\sqrt{2} - 1$). Performs 2-pole prediction and clamp, interleaves stereo channels, and wraps raw uncompressed 16-bit linear PCM into a standard 44-byte RIFF/WAVE header.
- **Fidelity:** `LOSSLESS` (Direct mathematical ADPCM decompression to 16-bit linear PCM).
- **Status:** **Wave 6 Shipped (`audio/adx-to-wav`)**.

---

### 21. SCORM E-Learning Course Package (`.scorm`, `.zip`)

- **Ecosystem & Context:** SCORM (1.2 and 2004), Articulate Storyline, Rise 360, and Adobe Captivate course packages are the universal format for enterprise training and university LMS platforms. Instructional designers, students, and corporate educators frequently need to extract the original video lectures (`.mp4`), audio narrations (`.mp3`), PDFs, and slide graphics without navigating dozens of obfuscated nested folders (`story_content/`, `scormcontent/assets/`, `dr/`) or setting up a Learning Management System.
- **Community Need & Reddit Signals:**
  - Subreddits: r/elearning, r/articulate, r/instructionaldesign, r/Moodle, r/DataHoarder.
  - Queries: *"How to extract MP4 video from SCORM zip package"*, *"Get original audio files out of Articulate Storyline"*, *"Convert SCORM course to video and PDF notes"*.
- **Forensic Byte Layout:**
  - Container: Standard ZIP archive.
  - Manifest: `imsmanifest.xml` detailing organization structure, resource items, and course title.
  - Asset Distribution: Media files embedded across proprietary engine subdirectories, often polluted by thousands of player icons and runtime JS wrappers (`scormdriver.js`, `lms.js`).
- **In-Browser Execution Strategy:**
  - Pure TypeScript: Unzips archive in-memory via `fflate`, parses XML manifest for course metadata, isolates genuine media files, filters out player chrome icons (< 1.5 KB), organizes assets into categorized subdirectories (`videos/`, `audio/`, `images/`, `documents/`), generates a clean `COURSE_SUMMARY.md` report, and produces a structured ZIP archive.
- **Fidelity:** `LOSSLESS` (Bit-exact extraction of original authoring assets).
- **Status:** **Wave 6 Shipped (`document/scorm-to-zip`)**.

---

### 22. Apple macOS Icon Image (`.icns`)

- **Ecosystem & Context:** macOS applications, bundles, plugins, and system resources package their multi-resolution icon sets into `.icns` files. Designers, web developers, and Windows/Linux engineers regularly need the high-resolution artwork (such as 1024x1024 `@2x` Retina app icons) embedded inside `.icns` packages, but Windows and Linux have no built-in preview or converter for `.icns`.
- **Community Need & Reddit Signals:**
  - Subreddits: r/MacOS, r/webdev, r/graphic_design, r/Windows10, r/linux4noobs.
  - Queries: *"How to extract high-res PNG from .icns on Windows"*, *"Extract 1024x1024 Retina icon from Mac application"*, *"Convert .icns to .png without Mac"*.
- **Forensic Byte Layout:**
  - Magic Header: `0x69 0x63 0x6E 0x73` (`icns`) at offset 0.
  - File Length: 32-bit big-endian integer at offset 4.
  - Chunk Format: Series of tagged elements: `[OSType: 4 bytes][Length: 4-byte BE uint32][Data: (Length - 8) bytes]`.
  - Modern Retina Chunks:
    - `ic10`: 1024x1024 32-bit PNG / JPEG 2000 icon (Retina 512x512@2x).
    - `ic09`: 512x512 PNG / JPEG 2000 icon.
    - `ic08`: 256x256 PNG / JPEG 2000 icon.
    - `ic07`: 128x128 PNG icon.
    - `ic14`: 512x512 PNG icon (Retina 256x256@2x).
    - `ic13`: 256x256 PNG icon (Retina 128x128@2x).
    - `ic12`: 64x64 PNG icon (Retina 32x32@2x).
    - `ic11`: 32x32 PNG icon (Retina 16x16@2x).
  - Legacy Chunks: `it32` + `t8mk` (128x128 24-bit RGB + 8-bit alpha mask), `il32` + `l8mk` (32x32), etc.
- **In-Browser Execution Strategy:**
  - Pure TypeScript: Reads the chunk catalog, identifies the highest-resolution icon candidate. For modern PNG-encoded chunks (which begin with `0x89 0x50 0x4E 0x47`), extracts the raw PNG bitstream directly with zero recompression or quality loss. For raw ARGB/PackBits legacy chunks, synthesizes a valid PNG.
- **Fidelity:** `LOSSLESS` (Direct extraction of the source PNG stream).
- **Status:** **Wave 7 Shipped (`image/icns-to-png`)**.

---

### 23. MHTML Web Archive (`.mhtml`, `.mht`)

- **Ecosystem & Context:** Chromium (Google Chrome, Microsoft Edge, Brave, Opera) and Internet Explorer allow saving entire web pages as single files using the MHTML format (`.mhtml`, `.mht`). However, Apple Safari, iOS WebKit, macOS Preview, and Android mobile browsers cannot open `.mhtml` files natively. Users who saved research articles, invoices, receipts, or legal documentation in Chrome find themselves unable to view them on mobile or Mac.
- **Community Need & Reddit Signals:**
  - Subreddits: r/chrome, r/safari, r/ipad, r/techsupport, r/DataHoarder, r/apple.
  - Queries: *"How to open .mhtml on Mac / iPhone Safari"*, *"Convert .mhtml to normal .html with all images"*, *"Edge saved page as mhtml won't open on iPad"*.
- **Forensic Byte Layout:**
  - Standard: RFC 2557 ("MIME Encapsulation of Aggregate Documents, such as HTML (MHTML)").
  - Structure: Top-level MIME multipart header declaring `Content-Type: multipart/related; boundary="..."`.
  - Body Parts: Slices separated by boundary markers (`--boundary`).
    - Primary HTML document (identified by `Content-Type: text/html` or root index).
    - Assets (images, fonts, stylesheets, scripts) identified by `Content-Location` (original URL) or `Content-ID` (`<name>`).
    - Content-Transfer-Encoding: Typically `quoted-printable` for text/HTML and `base64` for binary graphics.
- **In-Browser Execution Strategy:**
  - Pure TypeScript: RFC 2045/2557 multipart MIME parser. Decodes quoted-printable and base64 streams, builds an in-memory dictionary of all assets keyed by both their absolute/relative `Content-Location` and `Content-ID` (`cid:`), rewrites all image sources, CSS `url(...)` declarations, and `<link>` tags in the root HTML into standalone `data:<mime>;base64,<payload>` data URLs, and emits a single, completely universal HTML document that opens instantaneously on any device or browser without network access.
- **Fidelity:** `LOSSLESS` (Full asset retention, 100% offline standalone HTML).
- **Status:** **Wave 7 Shipped (`document/mhtml-to-html`)**.

---

### 24. vCard Multi-Contact Address Book (`.vcf`, `.vcard`)

- **Ecosystem & Context:** Users exporting contacts from iPhone, iCloud, Android, Google Contacts, BlackBerry, or Outlook frequently receive a single `.vcf` file containing hundreds or thousands of contacts. Excel and Google Sheets cannot open or parse multi-contact vCard files directly. Users want a clean `.csv` spreadsheet with categorized names, phones, emails, and notes. Currently, users are forced to use untrusted online converter sites where they upload their entire private contact book to unknown third-party servers.
- **Community Need & Reddit Signals:**
  - Subreddits: r/excel, r/ios, r/google, r/privacy, r/techsupport.
  - Queries: *"How to convert large .vcf file to Excel without third party uploading my contacts"*, *"iCloud contacts export to CSV spreadsheet"*, *"Parse multi-contact vCard 3.0 on PC"*.
- **Forensic Byte Layout:**
  - Standards: vCard 2.1, 3.0 (RFC 2426), 4.0 (RFC 6350).
  - Delimiters: Sequentially nested `BEGIN:VCARD` ... `END:VCARD` blocks.
  - RFC 2425 Folding: Continuations start with a leading space or horizontal tab.
  - Quoted-Printable Encoding: Used in vCard 2.1 for non-ASCII characters (`=D9=85...`).
  - Key Fields: `FN` (formatted name), `N` (structured name: Last;First;Middle;Prefix;Suffix), `ORG`, `TITLE`, `TEL` (typed: CELL, WORK, HOME), `EMAIL` (typed: INTERNET, WORK, HOME), `ADR` (structured: Street;City;State;PostalCode;Country), `BDAY`, `NOTE`, `URL`.
- **In-Browser Execution Strategy:**
  - Pure TypeScript: Unfolds folded lines, decodes quoted-printable byte sequences, extracts structured contact fields, generates an RFC 4180 CSV spreadsheet, and prepends a UTF-8 Byte Order Mark (`\uFEFF`) so Microsoft Excel on Windows and Mac opens international scripts and accents with zero mojibake.
- **Fidelity:** `LOSSLESS` (Complete contact attribute extraction with 100% client-side privacy).
- **Status:** **Wave 8 Shipped (`document/vcf-to-csv`)**.

---

### 25. DirectDraw Surface Game Texture (`.dds`)

- **Ecosystem & Context:** DirectDraw Surface (`.dds`) is the universal standard texture format for 3D video games, game engines (Unreal Engine, Unity, Source, Creation Engine), and simulation software (Skyrim, Fallout, GTA, Starfield, Flight Simulator). Modders, 3D artists, texture creators, and asset rippers constantly encounter `.dds` files but Windows, macOS, and Linux have zero built-in image preview support without installing heavy command-line utilities (`texconv.exe`) or legacy Photoshop plugins.
- **Community Need & Reddit Signals:**
  - Subreddits: r/skyrimmods, r/FalloutMods, r/gamedev, r/modpiracy, r/3Dmodeling.
  - Queries: *"How to convert .dds to .png quickly without installing Photoshop"*, *"View Skyrim/Fallout .dds textures on Mac/PC"*, *"Decompress BC1/BC3/BC5 textures to PNG"*.
- **Forensic Byte Layout:**
  - Magic Marker: `0x20534444` (`DDS `) at byte 0.
  - Header: 124 bytes detailing width, height, pitch, and pixel format flags (`DDPF_FOURCC`, `DDPF_RGB`, `DDPF_ALPHAPIXELS`).
  - Formats Supported:
    - `DXT1` (BC1): 8 bytes per 4x4 block. Two RGB565 endpoints + 2-bit lookup table with 1-bit alpha.
    - `DXT3` (BC2): 16 bytes per 4x4 block. 8 bytes explicit 4-bit alpha + DXT1 color.
    - `DXT5` (BC3): 16 bytes per 4x4 block. 8 bytes interpolated alpha + DXT1 color.
    - `BC5U` / `ATI2`: Tangent-space normal maps (Red/X and Green/Y channels decompressed with reconstructed Blue/Z channel).
    - Uncompressed: 32-bit and 24-bit RGBA and BGRA pixel arrays.
- **In-Browser Execution Strategy:**
  - Pure TypeScript: Block decompressor reads the compressed bitfields directly, writes an uncompressed RGBA pixel buffer, and encodes a valid PNG file via pure synchronous PNG chunk assembly and `fflate.deflateSync`. Completely self-contained, runs anywhere without canvas or DOM.
- **Fidelity:** `LOSSLESS` (Exact mathematical decompression of texture block payloads to PNG).
- **Status:** **Wave 8 Shipped (`image/dds-to-png`)**.

---

### 26. id Tech / Doom Engine Game Archive (`.wad`)

- **Ecosystem & Context:** The `.wad` ("Where's All the Data?") container created by John Carmack in 1993 for DOOM, DOOM II, Final Doom, Heretic, Hexen, and Strife is the most iconic modding format in gaming history. Even today, thousands of community mapsets, retro source ports, and total conversions are published in `.wad` packages. Gamers and creators want to inspect, extract, and listen to the original sound effects, music, and sprites without running ancient DOS utilities or heavyweight C++ editor suites like SLADE.
- **Community Need & Reddit Signals:**
  - Subreddits: r/Doom, r/DoomMods, r/retrogaming, r/gamedev, r/modding.
  - Queries: *"How to extract music and sounds from Doom wad without SLADE"*, *"WAD to zip online"*, *"Play Doom .lmp sound effects on Mac"*, *"Extract sprites from DOOM2.WAD"*.
- **Forensic Byte Layout:**
  - Header (12 bytes):
    - Bytes 0-3: Magic ASCII string: `"IWAD"` (official game data) or `"PWAD"` (patch/mod data).
    - Bytes 4-7: `numLumps` (32-bit uint LE).
    - Bytes 8-11: `infotableofs` (32-bit uint LE file offset to the lump directory).
  - Directory Entries (16 bytes per lump):
    - `filepos` (uint32 LE), `size` (uint32 LE), `name` (8-byte null-padded uppercase ASCII string).
  - Section Boundaries: Defined by empty marker lumps (`S_START`/`S_END` for sprites, `F_START`/`F_END` for flats, `P_START`/`P_END` for patches, `C_START`/`C_END` for colormaps, `TX_START`/`TX_END` for textures).
  - DMX Sound Effects (`DS*` / `DP*`): Classic 8-byte header (`format: 0x0003`, `sampleRate: uint16 LE`, `sampleCount: uint32 LE`) followed by raw 8-bit unsigned PCM audio.
- **In-Browser Execution Strategy:**
  - Pure TypeScript: Unpacks directory entries, categorizes assets by section markers into structured folders (`sprites/`, `flats/`, `patches/`, `maps/`, `music/`), and **automatically synthesizes standard 44-byte RIFF/WAVE headers** for Doom sound effects so they emerge as playable `.wav` files directly inside the generated ZIP.
- **Fidelity:** `LOSSLESS` (Direct lump extraction with automatic standard WAV audio encapsulation).
- **Status:** **Wave 9 Shipped (`document/wad-to-zip`)**.

---

### 27. Quake & GoldSrc (Half-Life) Game Package (`.pak`)

- **Ecosystem & Context:** id Software's Quake engine and Valve's GoldSrc engine (Half-Life 1, Counter-Strike 1.6, Team Fortress Classic, Day of Defeat) bundle their game files into `.pak` archives (`pak0.pak`, `pak1.pak`). Retro gamers, speedrunners, 3D artists, and counter-strike server admins frequently need to extract maps (`.bsp`), weapon models (`.mdl`), player sounds (`.wav`), and HUD graphics without installing 25-year-old extraction programs.
- **Community Need & Reddit Signals:**
  - Subreddits: r/quake, r/HalfLife, r/counterstrike, r/gamedev, r/modding.
  - Queries: *"How to unpack pak0.pak from Half-Life on modern PC"*, *"Quake pak to zip converter"*, *"Extract GoldSrc weapon sounds and player models"*.
- **Forensic Byte Layout:**
  - Header (12 bytes):
    - Bytes 0-3: Magic ASCII string: `"PACK"` (`0x50 0x41 0x43 0x4B`).
    - Bytes 4-7: `dirOffset` (32-bit uint LE).
    - Bytes 8-11: `dirLength` (32-bit uint LE, multiple of 64).
  - Directory Entries (64 bytes each):
    - Bytes 0-55: 56-byte null-terminated relative file path (e.g. `sound/weapons/cbar_hit1.wav`, `models/player.mdl`).
    - Bytes 56-59: `fileOffset` (32-bit uint LE).
    - Bytes 60-63: `fileLength` (32-bit uint LE).
- **In-Browser Execution Strategy:**
  - Pure TypeScript: Reads header and directory table, sanitizes internal paths (normalizing slashes and preventing directory traversal), extracts file slices, builds a `PAK_MANIFEST.md` summary, and zips the hierarchy using `fflate.zipSync`.
- **Fidelity:** `LOSSLESS` (Bit-exact file extraction with complete folder structure preservation).
- **Status:** **Wave 9 Shipped (`document/pak-to-zip`)**.

---

### 28. Adobe Photoshop Brush Library (`.abr`)

- **Ecosystem & Context:** Adobe Photoshop brush libraries (`.abr`) are the universal standard for digital painting brushes, texture stamps, ink splatters, and concept art assets. Millions of free and premium brush packs exist across Gumroad, DeviantArt, ArtStation, and artist forums. However, digital illustrators migrating to modern drawing platforms (Procreate, Krita, Clip Studio Paint, MediBang, Affinity Designer, or Figma) cannot natively import complex ABR brush tips without a Creative Cloud subscription or abandoned 15-year-old Windows-only utilities like ABRMate or abrViewer.
- **Community Need & Reddit Signals:**
  - Subreddits: r/Photoshop, r/ProCreate, r/krita, r/digitalart, r/Affinity, r/GIMP.
  - Queries: *"How to open .abr brushes in Procreate without Photoshop"*, *"Convert ABR to PNG stamps online"*, *"ABR brush viewer for Mac M1/M2"*, *"Extract brush tips from .abr"*.
- **Forensic Byte Layout:**
  - **Header (4 bytes):**
    - Bytes 0-1: `version` (16-bit uint BE). Legacy formats are 1 or 2; modern formats are 6 or 10.
    - Bytes 2-3: `subversion` / `count` (16-bit uint BE). In v1/v2, this represents the total brush count; in v6/v10, subversion 1 or 2.
  - **Legacy Format (v1 / v2):**
    - Each brush entry begins with 16-bit `brushLength`, followed by 16-bit `type` (type 2 = sampled image brush, type 1 = computed dynamics).
    - Contains brush spacing, antialiasing, bounding box coordinates (`top`, `left`, `bottom`, `right`), bit depth (8-bit), and compression flag (`0` = raw uncompressed, `1` = Apple PackBits RLE).
  - **Modern CS2+ Format (v6 / v10):**
    - Tagged Photoshop resource blocks starting with signature `"8BIM"`.
    - Key `"samp"` defines the sampled brushes collection.
    - Each brush item inside `"samp"` has a 36-character UUID prefix (skipped via subversion offset 47 or 301), 32-bit bounding box coordinates (`top`, `left`, `bottom`, `right`), 16-bit bit depth (8-bit), and a 1-byte compression flag.
    - Pixel data: If compressed, preceded by `height` 16-bit scanline lengths, followed by Apple PackBits RLE compressed grayscale bytes.
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary parser: Iterates through tagged `8BIM` blocks or legacy headers, decodes PackBits RLE runs, performs corner-based background polarity detection (identifying whether the canvas is white or dark), synthesizes transparent RGBA PNG stamps where brush opacity is accurately mapped to alpha, and bundles all stamps into a ZIP archive with a comprehensive `BRUSH_MANIFEST.md` guide.
- **Fidelity:** `LOSSLESS` (Bit-exact grayscale alpha tip extraction converted into transparent PNG stamps).
- **Status:** **Wave 10 Shipped (`image/abr-to-png`)**.

---

### 29. Windows Animated Cursor (`.ani`)

- **Ecosystem & Context:** Windows Animated Cursors (`.ani`) are classic retro multimedia cursor files used since Windows 95 for custom pointers, busy spinners, and retro desktop personalization. Designers, pixel artists, indie game creators, retro web revivalists, and macOS/Linux users frequently discover vintage `.ani` cursor sets on DeviantArt or archive hubs that cannot be previewed, opened, or used outside of Windows. Mac tools like Mousecape or Linux Xcursor compilers require individual PNG frames and timing data.
- **Community Need & Reddit Signals:**
  - Subreddits: r/pixelart, r/customization, r/webdev, r/Discord, r/unixporn.
  - Queries: *"How to convert .ani to PNG frames on Mac"*, *"Windows animated cursor to GIF or spritesheet"*, *"Extract .ani frames for Mousecape or website cursor"*, *"How to open .ani cursor without Windows"*.
- **Forensic Byte Layout:**
  - RIFF Container:
    - Bytes 0-3: `"RIFF"`.
    - Bytes 4-7: `fileSize` (32-bit uint LE).
    - Bytes 8-11: Form type `"ACON"` (`0x41 0x43 0x4F 0x4E`).
  - Chunks:
    - `"anih"` (36 bytes): Header containing `cFrames` (unique icons count), `cSteps` (animation steps count), `cx`, `cy`, `jifRate` (default display rate in 1/60s jiffies), and `flags`.
    - `"rate"`: Array of `cSteps` 32-bit uint LE values defining per-step duration in jiffies.
    - `"seq "`: Array of `cSteps` 32-bit uint LE values defining step-to-frame index mapping.
    - `"LIST"` `"INFO"`: Contains metadata strings like `"INAM"` (Title) and `"IART"` (Author).
    - `"LIST"` `"fram"`: Contains a sequence of `"icon"` sub-chunks. Each sub-chunk holds either an embedded PNG or a Windows ICO/CUR DIB (BITMAPINFOHEADER + color palette + XOR pixel bitmap + 1-bit monochrome AND transparency mask).
- **In-Browser Execution Strategy:**
  - Pure TypeScript RIFF parser: Traverses chunks, extracts author/title metadata, decodes DIB bitmaps across all bit depths (1bpp, 4bpp, 8bpp paletted, 24bpp RGB, 32bpp RGBA), resolves 1-bit AND mask transparency, synthesizes numbered PNG frames (`frame_000.png`), compiles an `ANIMATION_METADATA.json` with exact frame timings and hotspot offsets, writes a ready-to-use CSS cursor snippet in `ANI_MANIFEST.md`, and bundles everything into a ZIP archive via `fflate.zipSync`.
- **Fidelity:** `LOSSLESS` (Bit-exact frame raster extraction, mask transparency resolution, and frame timing preservation).
- **Status:** **Wave 10 Shipped (`image/ani-to-png`)**.

---

---

### 30. Garmin / Strava / Wahoo FIT Activity Recordings (`.fit`)

- **Ecosystem & Context:** The FIT (Flexible and Interoperable Data Transfer) protocol is the global binary standard created by Dynastream / ANT+ and adopted across all major sports telemetry devices: Garmin (Edge, Forerunner, Fenix), Wahoo Fitness (ELEMNT, BOLT), Hammerhead Karoo, Coros, Zwift, TrainerRoad, and Strava. Athletes, sports scientists, data analysts, coaches, and privacy-conscious runners frequently need to extract raw sensor metrics into spreadsheets (Excel, Google Sheets) or data science environments (Python pandas, R, MATLAB).
- **Community Need & Reddit Signals:**
  - Subreddits: r/Garmin, r/strava, r/velo, r/running, r/cycling, r/datascience.
  - Queries: *"How to convert .fit file to CSV without uploading to Garmin Connect"*, *"Strava won't accept corrupted FIT, need raw CSV to inspect timestamps"*, *"Extract heart rate and power data from .fit to Excel"*, *"Python read FIT file offline"*.
- **Forensic Byte Layout:**
  - **Header (12 or 14 bytes):**
    - Byte 0: `headerSize` (uint8: 12 or 14).
    - Byte 1: `protocolVersion` (uint8).
    - Bytes 2-3: `profileVersion` (16-bit uint LE).
    - Bytes 4-7: `dataSize` (32-bit uint LE, total payload bytes).
    - Bytes 8-11: Signature string `".FIT"`.
    - Bytes 12-13: Header CRC (optional in 14-byte headers).
  - **Record Framing:**
    - Byte Header: Bit 7 indicates Normal vs Compressed Timestamp data message.
    - Bit 6 indicates Definition Message vs Data Message.
  - **Definition Messages:**
    - Specify architecture (Endianness), Global Message Number (e.g. 20 = Record/Trackpoint, 18 = Session Summary), number of fields, and field definitions (Field Number, Size in bytes, Base Type).
  - **Field Types & Conversions:**
    - Garmin Time Epoch: December 31, 1989 00:00:00 UTC (631065600 seconds after Unix epoch).
    - Latitude & Longitude: Stored as 32-bit signed integer semicircles. Converted to degrees via:
      $$\text{degrees} = \text{semicircles} \times \left(\frac{180}{2^{31}}\right)$$
    - Altitude: Scaled uint16 ($(\text{raw} / 5) - 500$ meters).
    - Speed: Scaled uint16 ($(\text{raw} / 1000) \times 3.6$ km/h).
    - Distance: Scaled uint32 ($\text{raw} / 100$ meters).
    - Sentinel Invalid Filtering: Values equal to `0xFF` (uint8), `0xFFFF` (uint16), or `0xFFFFFFFF` (uint32) represent absent or disconnected sensors and are automatically converted to empty CSV cells to prevent distorting data charts.
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary decoder: Parses the 14-byte header, maintains an in-memory Definition Message registry, decodes normal and compressed-timestamp records, parses session summaries, filters invalid sensor sentinels, and outputs an RFC 4180 CSV spreadsheet with UTF-8 BOM encoding for seamless opening in Microsoft Excel and Google Sheets.
- **Fidelity:** `LOSSLESS` (Sensor telemetry extracted with mathematical precision).
- **Status:** **Wave 11 Shipped (`document/fit-to-csv`)**.

---

### 31. Windows Static Cursor (`.cur`)

- **Ecosystem & Context:** The Windows Static Cursor (`.cur`) format has been the standard representation for mouse pointers, crosshairs, text carets, hand grabbers, and precision pointers since Windows 3.1. Designers, Mac/Linux users, pixel artists, game developers (Godot, Unity, WebGL), and web developers frequently discover vintage and custom cursor sets on DeviantArt, OpenCursor, or retro design archives that cannot be opened, edited, or used outside of Windows.
- **Community Need & Reddit Signals:**
  - Subreddits: r/pixelart, r/webdev, r/customization, r/FigmaDesign, r/godot.
  - Queries: *"How to open .cur files on Mac"*, *"Convert .cur cursor to transparent PNG"*, *"Use custom .cur file in CSS website"*, *"How to extract hotspot from .cur"*.
- **Forensic Byte Layout:**
  - **ICONDIR Header (6 bytes):**
    - Bytes 0-1: `idReserved` (must be `0x0000`).
    - Bytes 2-3: `idType` (`0x0002` for `.cur`, `0x0001` for `.ico`).
    - Bytes 4-5: `idCount` (16-bit uint LE, number of cursor resolutions).
  - **ICONDIRENTRY (16 bytes per resolution):**
    - Byte 0: `bWidth` (0 = 256px).
    - Byte 1: `bHeight` (0 = 256px).
    - Byte 2: `bColorCount`.
    - Byte 3: `bReserved`.
    - Bytes 4-5: `wXHotspot` (16-bit uint LE, horizontal click anchor).
    - Bytes 6-7: `wYHotspot` (16-bit uint LE, vertical click anchor).
    - Bytes 8-11: `dwBytesInRes` (32-bit uint LE).
    - Bytes 12-15: `dwImageOffset` (32-bit uint LE).
  - **Payload Decoding:**
    - Case A: Embedded PNG format (Windows Vista+).
    - Case B: Windows DIB `BITMAPINFOHEADER` (40 bytes). Height is stored as $2 \times \text{visual height}$ because it contains both the bottom-up XOR color bitmap and the 1-bit monochrome AND transparency mask.
    - Decodes 1bpp monochrome, 4bpp/8bpp paletted, 24bpp RGB, and 32bpp RGBA bitmaps with exact 1-bit mask transparency and true alpha channels.
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary parser: Evaluates multi-resolution entries, selects the highest quality resolution, decodes DIB bitmaps and AND masks into 32-bit RGBA buffers, encodes directly into PNG via `fflate.deflateSync` and CRC32, and extracts exact pixel hotspot coordinates.
- **Fidelity:** `LOSSLESS` (Bit-exact transparency mask resolution and pixel rendering).
- **Status:** **Wave 11 Shipped (`image/cur-to-png`)**.

---

### 32. Adobe Swatch Exchange (`.ase`)

- **Ecosystem & Context:** Adobe Swatch Exchange (`.ase`) is the universal proprietary color palette container created by Adobe to share brand color guidelines, spot colors, and design palettes between Adobe Photoshop, Illustrator, InDesign, and Fresco. Web developers, UI engineers, Tailwind CSS users, and independent designers frequently receive `.ase` brand files from marketing agencies or clients but cannot open or inspect the color values without an expensive Adobe Creative Cloud subscription ($60+/month).
- **Community Need & Reddit Signals:**
  - Subreddits: r/webdev, r/frontend, r/css, r/graphic_design, r/TailwindCSS.
  - Queries: *"Client sent .ase color palette, how to get hex codes without Photoshop"*, *"Convert Adobe Swatch Exchange to CSS variables"*, *"Export .ase to Tailwind config"*, *"Free .ase palette viewer online"*.
- **Forensic Byte Layout:**
  - **Header (12 bytes):**
    - Bytes 0-3: Signature string `"ASEF"` (`0x41 0x53 0x45 0x46`).
    - Bytes 4-5: `majorVersion` (`0x0001`).
    - Bytes 6-7: `minorVersion` (`0x0000`).
    - Bytes 8-11: `numBlocks` (32-bit uint BE).
  - **Block Structure:**
    - Bytes 0-1: `blockType` (16-bit uint BE):
      - `0xC001`: Group Start (defines sub-palette/category name).
      - `0xC002`: Group End.
      - `0x0001`: Color Entry.
    - Bytes 2-5: `blockLength` (32-bit uint BE).
  - **Color Entry Payload:**
    - Bytes 0-1: `nameLen` (16-bit uint BE, character count including null).
    - Followed by `nameLen * 2` UTF-16 BE bytes for swatch name.
    - Followed by 4 ASCII characters for Color Model:
      - `"RGB "`: 3 x 32-bit IEEE 754 float BE values ($R, G, B \in [0.0, 1.0]$).
      - `"CMYK"`: 4 x 32-bit IEEE 754 float BE values ($C, M, Y, K \in [0.0, 1.0]$).
      - `"LAB "`: 3 x 32-bit IEEE 754 float BE values ($L \in [0.0, 100.0], a, b$).
      - `"Gray"`: 1 x 32-bit IEEE 754 float BE value ($Gray \in [0.0, 1.0]$).
    - Color Type: `0` = Global, `1` = Spot, `2` = Normal.
  - **Color Space Mathematics:**
    - Subtractive CMYK to sRGB:
      $$R = 255 \times (1 - C) \times (1 - K), \quad G = 255 \times (1 - M) \times (1 - K), \quad B = 255 \times (1 - Y) \times (1 - K)$$
    - CIE L*a*b* to sRGB: Converted via standard D65 illuminant ($X_n = 0.95047, Y_n = 1.00000, Z_n = 1.08883$) and sRGB gamma transfer curve.
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary decoder: Parses UTF-16 BE strings and IEEE floats, maps all color spaces to sRGB hex strings, generates semantic `:root` CSS custom properties (`--color-name: #hex;`), and formats an instant-copy Tailwind CSS `theme.extend.colors` JSON configuration object.
- **Fidelity:** `LOSSLESS` (Exact floating-point color preservation and standard sRGB mapping).
- **Status:** **Wave 11 Shipped (`document/ase-to-css`)**.

---

### 33. Apple Safari WebArchive (`.webarchive`)

- **Ecosystem & Context:** Safari on macOS and iOS saves complete offline web pages as single-file `.webarchive` archives. Unlike standard MHTML (used by Chromium and Edge), Apple uses proprietary Apple binary property list (`bplist00`) structures containing a `WebMainResource` and a list of `WebSubresources`. Non-Mac users (Windows, Linux, Android) cannot open `.webarchive` files natively without third-party converters or Safari, and modern Chromium browsers cannot render them.
- **Community Need & Reddit Signals:**
  - Subreddits: r/apple, r/mac, r/webdev, r/archival, r/windows.
  - Queries: *"How to open .webarchive file on Windows"*, *"Convert Safari webarchive to normal HTML"*, *"Extract images from .webarchive"*, *"Best way to view .webarchive on Android/Linux"*.
- **Forensic Byte Layout:**
  - **Magic Header (8 bytes):** ASCII `"bplist00"` (`0x62 0x70 0x6C 0x69 0x73 0x74 0x30 0x30`).
  - **Trailer (32 bytes at EOF - 32):**
    - `offsetIntSize` (1 byte, width of offset table entries: 1, 2, 4, or 8 bytes).
    - `objectRefSize` (1 byte, width of object index pointers: 1, 2, 4, or 8 bytes).
    - `numObjects` (64-bit uint BE, total number of objects in the bplist pool).
    - `topObject` (64-bit uint BE, index of the root dictionary).
    - `offsetTableOffset` (64-bit uint BE, file offset where the table of object offsets begins).
  - **Object Types & Tagging (High Nibble):**
    - `0x0`: Null / Boolean (`0x08` = false, `0x09` = true).
    - `0x1`: Integer (length is $2^{\text{low nibble}}$ bytes: 1, 2, 4, or 8 bytes BE).
    - `0x2`: Real / Float (4 or 8 bytes IEEE 754 BE).
    - `0x3`: Date (8-byte float BE, seconds since Apple epoch 2001-01-01).
    - `0x4`: Data (raw bytes; length in low nibble, or if `0xF`, followed by an Integer object).
    - `0x5`: ASCII String (length in low nibble or extended integer).
    - `0x6`: Unicode UTF-16 BE String.
    - `0xA`: Array (list of object references).
    - `0xD`: Dictionary (list of key object references followed by value object references).
  - **Archive Object Structure:**
    - Root dictionary contains `WebMainResource` dictionary and optional `WebSubresources` array.
    - `WebMainResource`:
      - `WebResourceData`: Raw HTML byte array (`Uint8Array`).
      - `WebResourceMIMEType`: String (e.g. `"text/html"`).
      - `WebResourceURL`: String (e.g. `"https://example.com/page"`).
      - `WebResourceTextEncodingName`: String (e.g. `"utf-8"`).
    - Each item in `WebSubresources`:
      - `WebResourceData`: Raw binary data (PNG, JPEG, WebP, CSS, JS, SVG, WOFF).
      - `WebResourceMIMEType`: Media MIME type (e.g. `"image/png"`, `"text/css"`).
      - `WebResourceURL`: Resource original URL used in `<img src="...">`, `<link href="...">`, or `url(...)`.
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary plist parser: Reads `bplist00` recursively with variable-width integer and object reference support. Decodes the main HTML document, indexes all subresources by both absolute URL and relative pathname, and rewrites image `src`, `srcset`, CSS `url()`, and `<link>` stylesheets into inlined self-contained Base64 Data URLs (`data:<mime>;base64,...`). Outputs a pristine standalone offline HTML file viewable in any browser on any platform.
- **Fidelity:** `LOSSLESS` (Full visual fidelity, inlined images, CSS, and fonts without network dependency).
- **Status:** **Wave 12 Shipped (`document/webarchive-to-html`)**.

---

### 34. Mobile Phone vNote (`.vnt`)

- **Ecosystem & Context:** In the pre-smartphone and early Android eras (Samsung S-Memo / Galaxy Note, Sony Ericsson, Nokia, Motorola, LG), voice memos, handwritten notes, and text drafts were archived using the standard vNote (`.vnt`) format (defined by the IrDA / vCalendar family). Millions of legacy backups, SD card archives, and phone migrations retain important family memories, recipes, legal notes, passwords, and diaries in `.vnt` format. Standard text editors display them as illegible Quoted-Printable hex garbage or empty files.
- **Community Need & Reddit Signals:**
  - Subreddits: r/samsung, r/Android, r/techsupport, r/DataHoarder, r/oldphones.
  - Queries: *"How to open .vnt file on computer"*, *"Convert Samsung vNote to txt"*, *"VNT file decoder online"*, *"Old phone notes in .vnt format are unreadable symbols"*.
- **Forensic Byte Layout:**
  - **Envelope Header:**
    - `BEGIN:VNOTE`
    - `VERSION:1.1`
  - **Body Property & Encodings:**
    - `BODY;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:` or `BODY;ENCODING=QUOTED-PRINTABLE;CHARSET=ISO-8859-1:`
    - Or `BODY;ENCODING=BASE64:`
    - Followed by multi-line payload terminated by `END:VNOTE`.
  - **Quoted-Printable Decoding Hazards:**
    - Multi-byte UTF-8 bytes (`=EC=95=88=EB=85=95`) must be accumulated continuously into a raw `Uint8Array` before decoding with `TextDecoder('utf-8')`. Splitting or decoding hex pairs individually results in broken Unicode replacement characters (``).
    - Soft line breaks: An `=` at the end of a line signifies a continuation line and must be stripped without injecting whitespace.
    - Literal `=` signs are represented as `=3D`.
    - Carriage return line breaks: `=0D=0A` or raw `\r\n` must be normalized to standard newlines.
  - **Date & Metadata Fields:**
    - `DCREATED:YYYYMMDDTHHMMSS` (or `DCREATED;X-IRMC-URL;...`).
    - `LAST-MODIFIED:YYYYMMDDTHHMMSS`.
    - Normalizes ISO timestamp in frontmatter header for chronological note tracking.
- **In-Browser Execution Strategy:**
  - Pure TypeScript line-parser and state machine: Accurately strips MIME folded lines, accumulates multi-byte Quoted-Printable byte octets across line wraps, handles ISO-8859-1, Windows-1252, and UTF-8 charsets, handles Base64 encoded bodies, extracts creation/modification timestamps, and outputs clean, readable UTF-8 text with formatted metadata headers.
- **Fidelity:** `LOSSLESS` (Bit-exact textual and Unicode character preservation).
- **Status:** **Wave 12 Shipped (`document/vnt-to-txt`)**.

---

### 35. Microsoft SAMI Subtitles (`.smi`)

- **Ecosystem & Context:** SAMI (Synchronized Accessible Media Interchange) was introduced by Microsoft in 1998 for Windows Media Player. For over two decades, it served as the dominant subtitle standard across East Asian media broadcasts, anime fansubs, and Korean drama communities (r/kdrama, r/Korean, r/anime). Modern smart TVs (LG webOS, Samsung Tizen), Apple TV, Plex, Jellyfin, and VLC fail to render `.smi` files properly or choke on unclosed HTML tags.
- **Community Need & Reddit Signals:**
  - Subreddits: r/kdrama, r/Korean, r/PleX, r/anime, r/kodi, r/DataHoarder, r/VLC.
  - Queries: *"How to convert .smi subtitles to .srt"*, *"Korean .smi subtitles showing up as gibberish/mojibake"*, *"Plex not displaying .smi subtitles"*, *"Convert dual language Korean/English .smi to SRT"*.
- **Forensic Byte Layout:**
  - **Structure & Markup:**
    - HTML-like markup with `<SAMI>`, `<HEAD>`, `<STYLE TYPE="text/css">`, and `<BODY>`.
    - Synchronization cues: `<SYNC Start=XXXX>` (attribute value in milliseconds integer).
    - Paragraph class tags: `<P Class=KRCC>` (Korean Closed Caption), `<P Class=ENCC>` (English Closed Caption), or default `<P Class=CC>`.
  - **Key Hazards & Edge Cases:**
    - **Encoding Mojibake:** Older Korean subtitles use EUC-KR / CP949 or Windows-949 multi-byte encoding. Standard UTF-8 decoders produce garbled symbols. Requires cascading character decoder detection: UTF-8 strict $\to$ EUC-KR / CP949 $\to$ Windows-1252.
    - **Cue Termination:** In SAMI, cues do not have explicit duration parameters; instead, a subtitle is cleared when a subsequent `<SYNC Start=YYYY>` arrives with empty text or `&nbsp;`. If unhandled, subtitles stay on screen permanently.
    - **Multi-Track Simultaneous Dialogue:** Many files have synchronized Korean and English dialogue under the same timestamp. Naive tools concatenate them on a single line; convrtr consolidates both tracks with clean multi-line formatting.
    - **HTML Tag Cleanup:** Strips `<font>`, `<span>`, and `<p>` tags while preserving `<i>` (italics) and `<b>` (bold) for SubRip standards.
- **In-Browser Execution Strategy:**
  - Pure TypeScript streaming token and regex parser: Accurately tracks per-class active cues, converts `<br>` tags to line breaks, resolves HTML entities (`&nbsp;`, `&quot;`, `&amp;`, `&lt;`, `&gt;`, numeric entities), formats millisecond timestamps into SubRip `HH:MM:SS,mmm --> HH:MM:SS,mmm`, and outputs standard UTF-8 `.srt`.
- **Fidelity:** `LOSSLESS` (Millisecond-exact timing and textual preservation).
- **Status:** **Wave 13 Shipped (`document/smi-to-srt`)**.

---

### 36. GIMP Brush (`.gbr`)

- **Ecosystem & Context:** GIMP Brush (`.gbr`) is the native raster brush stamp format used by GIMP (GNU Image Manipulation Program). Thousands of artists create custom brush stamps, textures, and ink marks in GIMP, but commercial art programs (Adobe Photoshop, Procreate, Clip Studio Paint, Krita) cannot import `.gbr` directly.
- **Community Need & Reddit Signals:**
  - Subreddits: r/GIMP, r/digitalart, r/conceptart, r/photoshop, r/krita, r/procreate.
  - Queries: *"How to convert GIMP .gbr brushes to PNG"*, *"Import GIMP brushes into Procreate/Photoshop"*, *"Convert .gbr brush to transparent stamp"*, *"Open .gbr without installing GIMP"*.
- **Forensic Byte Layout:**
  - **Header Structure (Big Endian):**
    - Bytes 0-3: `header_size` (32-bit uint BE, size in bytes: 20 for v1, $\ge 28$ for v2).
    - Bytes 4-7: `version` (32-bit uint BE: 1 = legacy, 2 = standard).
    - Bytes 8-11: `width` (32-bit uint BE, brush width in pixels).
    - Bytes 12-15: `height` (32-bit uint BE, brush height in pixels).
    - Bytes 16-19: `bytes` (32-bit uint BE: 1 = grayscale opacity mask, 4 = RGBA color brush).
    - Version 2 additions (at bytes 20-27):
      - Bytes 20-23: Magic marker `"GIMP"` (`0x47 0x49 0x4D 0x50`).
      - Bytes 24-27: `spacing` (uint32 BE, default brush spacing percentage).
      - Bytes 28 to `header_size - 1`: Null-terminated UTF-8 / ASCII brush description name.
  - **Pixel Data & Opacity Mathematics:**
    - Payload begins at offset `header_size`.
    - **Grayscale (`bytes = 1`):** In GIMP, pixel value $0$ represents full opacity (black ink mark) and $255$ represents transparent paper. To produce a standard digital art brush stamp PNG, pixel values are mapped to black ink with inverse alpha:
      $$R = 0, \quad G = 0, \quad B = 0, \quad A = 255 - V$$
    - **Color (`bytes = 4`):** Direct 32-bit RGBA pixel stream ($R, G, B, A$).
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary decoder: Parses big-endian headers, inverts grayscale masks into alpha channels, and encodes directly into lossless 32-bit RGBA PNG via `fflate.deflateSync` and CRC32 chunks.
- **Fidelity:** `LOSSLESS` (Bit-exact pixel and alpha extraction).
- **Status:** **Wave 13 Shipped (`image/gbr-to-png`)**.

---

### 37. CorelDRAW Preview Extractor (`.cdr`)

- **Ecosystem & Context:** CorelDRAW (`.cdr`) is a vector graphics container created by Corel Corporation. Commercial printing shops, sign makers, and freelance graphic designers frequently receive `.cdr` files from clients. Adobe Illustrator dropped native `.cdr` import support in CC/CS6, and macOS has no built-in viewer for CorelDRAW. Designers without a $549 CorelDRAW license frequently need to preview, inspect, and verify client artwork.
- **Community Need & Reddit Signals:**
  - Subreddits: r/graphic_design, r/printing, r/freelance, r/CommercialPrinting, r/AdobeIllustrator.
  - Queries: *"How to open .cdr file on Mac without CorelDRAW"*, *"Client sent .cdr file, how to convert to PNG"*, *"Free CorelDRAW file viewer online"*, *"Extract preview from .cdr"*.
- **Forensic Byte Layout:**
  - **Modern Containers (CorelDRAW X4 through 2024):**
    - Magic bytes: PKZIP (`0x50 0x4B 0x03 0x04`).
    - Contains embedded high-resolution composite preview PNGs:
      - `previews/thumbnail.png`
      - `metadata/thumbnails/thumbnail.png`
      - `previews/preview.png`
  - **Legacy Containers (CorelDRAW v1 through v13):**
    - Magic bytes: RIFF (`0x52 0x49 0x46 0x46`), form type `CDR*` (`CDR3` to `CDRD`).
    - Contains embedded DIB bitmaps in `'DISP'` chunks or embedded PNG streams.
- **In-Browser Execution Strategy:**
  - Pure TypeScript container inspector: Unzips modern PKZIP `.cdr` archives via `fflate.unzipSync`, locates the high-resolution composite thumbnail, or scans legacy RIFF containers for embedded PNG streams. Outputs full-resolution lossless PNG with zero server uploads.
- **Fidelity:** `LOSSLESS` (Preserves exact embedded raster composite).
- **Status:** **Wave 13 Shipped (`image/cdr-to-png`)**.

---

### 38. Truevision TGA Texture & Graphic Decoder (`.tga`)

- **Ecosystem & Context:** Truevision TGA (TARGA, `.tga`, `.icb`, `.vda`, `.vst`) is one of the foundational raster formats in 3D computer graphics, games, and digital animation, developed by Truevision in 1984. Widely used across game engines (id Tech, Valve Source, Unreal Engine, Unity, Godot) for 3D textures, normal maps, sprite sheets, and UI icons. macOS Preview and modern web browsers lack native support for opening or previewing TGA files, and many 3D artists, modders, and game developers need quick, private, client-side conversion without installing desktop viewers or uploading proprietary game assets to untrusted third-party servers.
- **Community Need & Reddit Signals:**
  - Subreddits: r/gamedev, r/3Dmodeling, r/Blender, r/SourceEngine, r/IndieDev.
  - Queries: *"How to open .tga files on Mac"*, *"Batch convert TGA to PNG online"*, *"Why is my TGA texture upside down"*, *"Extract transparent TGA alpha channel"*.
- **Forensic Byte Layout:**
  - **Header (18 bytes):**
    - Byte 0: `idLength` (0-255).
    - Byte 1: `colorMapType` (0 = no palette, 1 = color-mapped).
    - Byte 2: `imageType`: 1 (color-mapped), 2 (truecolor RGB/RGBA), 3 (grayscale), 9 (RLE color-mapped), 10 (RLE truecolor), 11 (RLE grayscale).
    - Bytes 3-7: Color map specification (`start`, `length`, `depth` 15/16/24/32).
    - Bytes 8-17: Image specification: `xOrigin`, `yOrigin`, `width`, `height`, `pixelDepth` (8, 15, 16, 24, 32), and `imageDescriptor`.
    - `imageDescriptor` bit 5: vertical scanline orientation (0 = bottom-to-top [TGA classic default], 1 = top-to-bottom). Bit 4: horizontal orientation (0 = left-to-right, 1 = right-to-left).
  - **Compression (RLE):**
    - Packet header byte: bit 7 = 1 (run-length packet with `(header & 0x7F) + 1` repetitions of 1 pixel), bit 7 = 0 (raw packet with `(header & 0x7F) + 1` unique pixels).
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary decoder: Parses the 18-byte header, optional image identification string, color-map palette table, and pixel data stream. Seamlessly decompresses both uncompressed and RLE compressed packets across 8/15/16/24/32 bpp, corrects the bottom-up scanline order to top-down, preserves alpha transparency channels, and encodes directly into standard lossless 32-bit RGBA PNG via `encodeRgbaToPng`.
- **Fidelity:** `LOSSLESS` (Bit-exact RGBA raster decompression and orientation normalization).
- **Status:** **Wave 14 Shipped (`image/tga-to-png`)**.

---

### 39. Valve Source & GoldSrc BSP Map Asset Extractor (`.bsp`)

- **Ecosystem & Context:** Compiled BSP (Binary Space Partitioning) files are level maps for games powered by Valve's Source engine (Half-Life 2, Counter-Strike: Source, CS:GO, Team Fortress 2, Portal 1 & 2, Garry's Mod, Left 4 Dead) and GoldSrc engine (Half-Life 1, Counter-Strike 1.6, Team Fortress Classic, Day of Defeat), as well as id Software's Quake series. Level designers, modders, Source Filmmaker (SFM) animators, and game preservationists frequently need to unpack custom materials (`.vmt`), textures (`.vtf` / `.png`), 3D models (`.mdl`), soundscripts, and entity trigger scripts embedded inside BSPs without installing GCFScape or command-line tools like BSPZip.
- **Community Need & Reddit Signals:**
  - Subreddits: r/hammer, r/SourceEngine, r/gmod, r/SFM, r/counterstrike, r/HalfLife.
  - Queries: *"How to extract models and textures from a .bsp file"*, *"Unpack Garry's Mod map assets"*, *"GCFScape alternative for Mac/Linux"*, *"Extract Half-Life 1 BSP textures to PNG"*.
- **Forensic Byte Layout:**
  - **Source Engine BSP:**
    - Bytes 0-3: Magic `"VBSP"`.
    - Bytes 4-7: `version` (int32 LE, versions 19 through 27).
    - Lumps directory: 64 lumps (16 bytes each).
    - Lump 0 (`LUMP_ENTITIES`): ASCII KeyValues entity definitions (spawns, lights, triggers, brush models).
    - Lump 40 (`LUMP_PAKFILE`): An entire embedded PKZIP archive containing all custom materials, textures, models, and scripts packed by map authors.
  - **GoldSrc Engine BSP (v30) & Quake 1 (v29):**
    - Bytes 0-3: Version int32 LE (30 for GoldSrc, 29 for Quake 1).
    - Lumps directory: 15 lumps (8 bytes each: offset, length).
    - Lump 0 (`LUMP_ENTITIES`): Plain text entity declarations.
    - Lump 2 (`LUMP_TEXTURES`): Miptex collection. Contains `numTextures`, offsets, 16-byte texture names, dimensions, 4 mip levels of 8-bit paletted data, and 256-color RGB palette table. Textures prefixed with `{` use color index 255 as a transparent mask.
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary lump extractor: Identifies the BSP engine generation, extracts Lump 40 embedded pakfile via `fflate.unzipSync`, extracts and decodes GoldSrc embedded Miptex textures into transparent 32-bit PNG images, dumps level entity logic to `maps/entities.txt`, generates an informative `MAP_MANIFEST.md` report, and bundles all extracted assets into an organized ZIP archive.
- **Fidelity:** `LOSSLESS` (Bit-exact asset extraction and lossless PNG texture synthesis).
- **Status:** **Wave 14 Shipped (`document/bsp-to-zip`)**.

---

### 40. MicroDVD Frame-Based Subtitle Converter (`.sub`)

- **Ecosystem & Context:** MicroDVD (`.sub`) was one of the most widely used subtitle formats during the DivX, XviD, and AVI golden era of digital media. Unlike modern subtitle standards (such as SubRip `.srt` or WebVTT `.vtt`) which specify display times in hours, minutes, and seconds, MicroDVD specifies start and end cues as discrete video frame numbers (e.g. `{100}{150}Subtitle text`). Because modern Smart TVs, Apple TV, iOS, and media streaming platforms (Plex, Jellyfin, Infuse) only support time-based formats and have no knowledge of a film's frame rate, legacy `.sub` files fail to display or show out-of-sync raw frame brackets.
- **Community Need & Reddit Signals:**
  - Subreddits: r/PleX, r/VLC, r/piracy, r/HomeServer, r/movies.
  - Queries: *"Convert .sub to .srt without losing sync"*, *"MicroDVD subtitle to SRT converter"*, *"Why does my TV not show .sub subtitles"*, *"Fix frame-based subtitle timing"*.
- **Forensic Byte Layout:**
  - Text-based line format: `{start_frame}{end_frame}Subtitle content`
  - Framerate cue: Typically the first line or cue in the file, formatted as `{1}{1}23.976`, `{1}{1}25.000`, or `{1}{1}29.970`.
  - Multi-line separator: The pipe character `|` separates lines within a subtitle cue.
  - Control tags: MicroDVD embeds font and style tags such as `{Y:i}` (italics), `{Y:b}` (bold), `{Y:u}` (underline), `{C:...}` (color), `{S:...}` (font size), and `{P:...}` (positioning).
- **In-Browser Execution Strategy:**
  - Pure TypeScript state machine parser: Reads text with UTF-8 and Windows-1252 auto-detection, extracts the authoring framerate from the initial cue or defaults to cinematic 23.976 FPS, converts frame counts to millisecond durations ($\text{ms} = (\text{frame} / \text{fps}) \times 1000$), replaces pipe characters with newlines, translates formatting tags into standard HTML `<i>`/`<b>` tags, strips unsupported bracket tags, sorts cues chronologically, and emits standard SubRip `.srt` with `HH:MM:SS,mmm` timestamps.
- **Fidelity:** `LOSSLESS` (Millisecond-precise frame conversion and style preservation).
- **Status:** **Wave 14 Shipped (`document/sub-to-srt`)**.

---

### 41. Advanced SubStation Alpha Subtitles (`.ass`, `.ssa`)

- **Ecosystem & Context:** Advanced SubStation Alpha (`.ass`) and SubStation Alpha (`.ssa`) are the dominant subtitle formats for fansubbed anime, karaoke timing, multi-layer typesetting, and on-screen graphical translations. Media players on Smart TVs, game consoles, web video players, and hardware transcoders frequently fail to parse complex ASS override tags, resulting in stuttering, dropped captions, or completely missing subtitles. Converting `.ass` to universal SubRip `.srt` while stripping override coordinates and converting basic styling (`{\i1}`, `{\b1}` to `<i>`, `<b>`) guarantees smooth playback on any device.
- **Community Need & Reddit Signals:**
  - Subreddits: r/animepiracy, r/PleX, r/VLC, r/anime, r/Jellyfin.
  - Queries: *"Convert ASS to SRT online without uploading"*, *"ASS subtitles stuttering on Samsung TV Plex"*, *"Strip complex typesetting tags from ASS file"*, *"SSA to SRT subtitle converter"*.
- **Forensic Byte Layout:**
  - Text-based INI section layout: `[Script Info]`, `[V4+ Styles]`, and `[Events]`.
  - Format descriptor: `Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`.
  - Dialogue cues: `Dialogue: 0,0:01:23.45,0:01:28.90,Default,,0,0,0,,Text line{\i1}with italics{\i0}\NSecond line`.
  - Timestamp precision: Centisecond format (`H:MM:SS.cs`).
- **In-Browser Execution Strategy:**
  - Pure TypeScript state parser: Parses format column order dynamically, converts centisecond timestamps to millisecond SRT format (`HH:MM:SS,mmm`), converts `\N` and `\n` to standard newlines, maps `{\i1}`/`{\b1}` tags to HTML `<i>`/`<b>`, strips curly brace override blocks (`{...}`), sorts events chronologically, and emits clean SubRip `.srt`.
- **Fidelity:** `LOSSLESS-CONTENT` (Preserves all dialogue, cues, and formatting while stripping complex display override tags).
- **Status:** **Wave 15 Shipped (`document/ass-to-srt`)**.

---

### 42. Microsoft Compiled HTML Help Archive (`.chm`)

- **Ecosystem & Context:** Microsoft Compiled HTML Help (`.chm`) has served as the default software manual and offline documentation archive format since Windows 98. It wraps an entire documentation website—HTML pages, CSS stylesheets, PNG/GIF/JPEG images, scripts, index keywords (`.hhk`), and tables of contents (`.hhc`)—into a single compressed binary container. Non-Windows users on macOS, Linux, iOS, and Android have no native tool to read or extract `.chm` files without installing third-party desktop viewers.
- **Community Need & Reddit Signals:**
  - Subreddits: r/macsysadmin, r/linux, r/techsupport, r/sysadmin, r/retrobattlestations.
  - Queries: *"How to open CHM file on Mac"*, *"Decompile CHM to HTML folder free"*, *"Extract images and docs from CHM"*, *"Read old CHM programming manual in browser"*.
- **Forensic Byte Layout:**
  - Container: Microsoft ITSF (InfoTech Storage Format) with magic `ITSF` (`0x49 0x54 0x53 0x46`).
  - Header: Contains version (usually 3), total file size, directory listing offset and length, and chunk size (usually 4096 bytes).
  - Directory: Encodes internal directory chunk entries (`ITSP`), system stream listings, and resource offsets.
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary reader: Validates `ITSF` magic, locates and parses directory chunks, extracts uncompressed document streams, indexes all HTML and asset files, synthesizes a navigational `INDEX.html` root page, and bundles the decompiled website into an organized ZIP archive via `fflate`.
- **Fidelity:** `LOSSLESS` (Full directory structure, HTML content, and embedded media extracted).
- **Status:** **Wave 15 Shipped (`document/chm-to-zip`)**.

---

### 43. ZSoft PCX Retro Bitmap Image (`.pcx`)

- **Ecosystem & Context:** PCX (Personal Computer eXchange) was the premier bitmap graphics standard across MS-DOS, early Windows (Paintbrush), and retro PC gaming (Doom, Duke Nukem 3D, Commander Keen, Apogee titles). Billions of vintage textures, scanned clip-art items, medical imaging outputs, and fax archives are encoded in `.pcx`. No modern web browser or mobile OS supports `.pcx` natively.
- **Community Need & Reddit Signals:**
  - Subreddits: r/dosgaming, r/retrobattlestations, r/pixelart, r/gamedev.
  - Queries: *"Convert .pcx to png online free"*, *"Open old DOS PCX files on modern Mac"*, *"Batch convert PCX textures"*, *"View PCX files without Photoshop"*.
- **Forensic Byte Layout:**
  - Header: 128 bytes starting with magic byte `0x0A` (ZSoft ID), Version (0, 2, 3, 4, 5), Encoding (`1` = PCX run-length encoding), BitsPerPixel (1, 2, 4, 8), Window bounds (`Xmin, Ymin, Xmax, Ymax`), ColorPlanes, and BytesPerLine.
  - 256-Color Palette: In version 5 (8-bit), the 768-byte RGB palette is located at the very end of the file, preceded by marker byte `0x0C`.
  - Compression: Byte-oriented run-length encoding (if top two bits are `11`, next 6 bits represent repeat count; otherwise literal byte).
- **In-Browser Execution Strategy:**
  - Pure TypeScript decoder: Reads 128-byte header, computes dimensions, decompresses RLE scanlines into planar or indexed pixel buffers, reads the trailing 256-color palette (or uses EGA 16-color palette for 4-bit), maps pixels to 32-bit RGBA, and encodes to standard transparent PNG via pure JS PNG encoder.
- **Fidelity:** `LOSSLESS` (Bit-exact reproduction of vintage raster graphics).
- **Status:** **Wave 16 Shipped (`image/pcx-to-png`)**.

---

### 44. Adobe Photoshop Color Table (`.act`)

- **Ecosystem & Context:** Adobe Photoshop Color Table (`.act`) files are compact binary palette files used since early Photoshop releases to define custom 256-color indexed palettes for GIF optimization, web graphics, sprite sheets, and retro game textures. Modern web developers, UI designers, and indie game developers frequently find `.act` palettes in vintage asset packs, design libraries, and game rips, but have no way to convert them into CSS custom properties (`--palette-1`), Tailwind CSS configuration tokens, or JSON palettes without opening Photoshop.
- **Community Need & Reddit Signals:**
  - Subreddits: r/PixelArt, r/webdev, r/Photoshop, r/gamedev.
  - Queries: *"Convert Photoshop .act palette to CSS"*, *"Open .act palette without Photoshop"*, *"Export .act to JSON"*, *"ACT color table to hex values"*.
- **Forensic Byte Layout:**
  - Size: Exactly 768 bytes (256 colors $\times$ 3 bytes for R, G, B), or 772 bytes (with 4-byte trailer: 2 bytes for color count $N$, 2 bytes for transparent color index).
- **In-Browser Execution Strategy:**
  - Pure TypeScript reader: Reads RGB byte triplets, validates size (768 or 772 bytes), detects transparent color index if present, formats colors into standard CSS variables (`:root { --color-0: rgb(...); }`), Tailwind CSS color object (`colors: { ... }`), and structured JSON. Emits clean CSS with bundled preview swatches.
- **Fidelity:** `LOSSLESS` (Exact RGB hex color preservation).
- **Status:** **Wave 16 Shipped (`document/act-to-css`)**.

---

### 45. Valve Source Engine Texture (`.vtf`)

- **Ecosystem & Context:** Valve Source Engine (Team Fortress 2, Counter-Strike: Source / CS:GO, Half-Life 2, Portal 1 & 2, Garry's Mod) stores all in-game materials and textures in proprietary Valve Texture Format (`.vtf`) files. Gamers, modders, and 3D artists ripping Source models or creating custom maps need to convert `.vtf` textures into transparent PNGs to use them in Blender, Unity, Unreal Engine, or Godot. Existing desktop tools like VTFEdit are abandoned 32-bit Windows-only programs that do not run on macOS or Linux.
- **Community Need & Reddit Signals:**
  - Subreddits: r/hammer, r/gmod, r/SourceEngine, r/tf2, r/blender.
  - Queries: *"Convert VTF to PNG online"*, *"Open VTF textures on Mac"*, *"VTFEdit alternative for Linux"*, *"Extract TF2 textures to PNG"*.
- **Forensic Byte Layout:**
  - Magic Header: `VTF\0` (`0x56 0x54 0x46 0x00`).
  - Header: Version (7.0 to 7.5), header size, width, height, flags, number of frames, start frame, reflectivity vector, bumpmap scale, high-res image format (e.g. DXT1/BC1, DXT5/BC3, BGR888, BGRA8888, RGBA8888), mipmap count, and low-res thumbnail image format.
  - Image Data: Follows header and low-res thumbnail; contains mipmaps stored from smallest ($1 \times 1$) to largest ($W \times H$).
- **In-Browser Execution Strategy:**
  - Pure TypeScript VTF parser & block decompressor: Validates `VTF\0` signature, reads format metadata, locates the highest-resolution full mipmap data, decompresses DXT1/BC1 or DXT5/BC3 blocks (or unswizzles BGR888/BGRA8888/RGBA8888 bytes), generates RGBA pixel array, and outputs lossless PNG.
- **Fidelity:** `LOSSLESS` for uncompressed formats; bit-exact block decompression for DXT1/DXT5.
- **Status:** **Wave 16 Shipped (`image/vtf-to-png`)**.

---

### 46. Aseprite Pixel Art Sprite (`.aseprite`, `.ase`)

- **Ecosystem & Context:** Aseprite (`.aseprite`, `.ase`) is the premier 2D pixel art and animation program for indie game developers, animators, and digital artists. Its native binary container format stores multi-layer animation frames, user-defined palettes, layer blend modes, and raw or zlib-compressed cel chunks. Game designers, web developers, and artists without the desktop Aseprite software installed need an instant, in-browser method to unpack, inspect, and export composite sprite artwork into standard transparent PNGs.
- **Community Need & Reddit Signals:**
  - Subreddits: r/PixelArt, r/aseprite, r/gamedev, r/indiegames.
  - Queries: *"Open .aseprite file online"*, *"Convert .ase to png without Aseprite"*, *"View Aseprite sprite sheet on mobile/Mac"*, *"Batch convert Aseprite files"*.
- **Forensic Byte Layout:**
  - Header: 128 bytes starting with file size, magic signature `0xA5E0`, frame count, canvas width and height, color depth (32-bit RGBA, 16-bit Grayscale, 8-bit Indexed), flags, and transparent color index.
  - Frame Header: 16 bytes starting with frame size, magic signature `0xF1FA`, chunk count, and duration (ms).
  - Chunks: Palette Chunk (`0x2019`), Cel Chunk (`0x2005` containing X/Y offset, opacity, cel type 0 = raw or 2 = zlib-compressed image, cel dimensions, and deflate-compressed pixel data), and Layer Chunks (`0x2004`).
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary parser: Validates `0xA5E0` header magic, reads color depth and canvas dimensions, inflates compressed cel chunks using `fflate` (`inflateSync`), resolves color palette entries or RGBA channels, composites cel layers onto a 32-bit RGBA canvas, and encodes to lossless PNG via pure JS PNG encoder.
- **Fidelity:** `LOSSLESS` (Full alpha channel, color depth preservation, pixel-exact composite reproduction).
- **Status:** **Wave 17 Shipped (`image/aseprite-to-png`)**.

---

### 47. Commodore Amiga & Deluxe Paint IFF-ILBM Image (`.iff`, `.ilbm`, `.lbm`)

- **Ecosystem & Context:** Electronic Arts Interchange File Format (IFF) InterLeaved BitMap (ILBM) was created in 1985 on the Commodore Amiga alongside Deluxe Paint. For over a decade, ILBM was the defining graphics standard for Amiga OCS/ECS/AGA games (Monkey Island, Lemmings, Shadow of the Beast, Worms) and demoscene productions. MS-DOS versions stored chunky pixels as PBM (Packed BitMap). Retro gaming enthusiasts, digital archivists, and demoscene collectors have thousands of `.iff`, `.ilbm`, and `.lbm` files that modern operating systems and browsers cannot open.
- **Community Need & Reddit Signals:**
  - Subreddits: r/amiga, r/retrogaming, r/demoscene, r/PixelArt.
  - Queries: *"Convert Amiga IFF ILBM to PNG"*, *"Open .lbm Deluxe Paint files on modern PC/Mac"*, *"Amiga HAM6 / EHB decoder online"*, *"View IFF images in browser"*.
- **Forensic Byte Layout:**
  - FourCC Chunks: Big-Endian container `FORM` of type `ILBM` or `PBM `.
  - Chunks:
    - `BMHD` (Bitmap Header): Width, height, bitplanes count ($1 \le N \le 8$ or 24 for TrueColor), masking type (none, mask plane, transparent color), compression (`1` = ByteRun1 RLE).
    - `CMAP` (Color Map): 3-byte RGB color triplets ($R, G, B$).
    - `CAMG` (Amiga ViewPort Mode): Viewport flags defining Extra Half-Brite (`EHB` bit `0x0080`) or Hold-And-Modify (`HAM6` bit `0x0800`).
    - `BODY`: Scanline interleaved bitplanes compressed with ByteRun1.
- **In-Browser Execution Strategy:**
  - Pure TypeScript decompressor: Decompresses ByteRun1 RLE byte streams, reassembles interleaved planar bitplane bits into chunky pixel indices, handles Amiga hardware display modes (EHB 64 colors with half-brite calculation; HAM6 4096-color incremental RGB modification; 24-bit TrueColor planar RGB), and encodes into standard 32-bit RGBA PNG.
- **Fidelity:** `LOSSLESS` (Bit-exact reproduction of Amiga planar and Chunky PBM retro graphics).
- **Status:** **Wave 17 Shipped (`image/iff-to-png`)**.

---

### 48. CD-DA Audio CUE Sheet (`.cue`)

- **Ecosystem & Context:** CUE sheets (`.cue`) are the universal disc layout metadata files for compact disc audio (CD-DA), mixed-mode CDs, and disc images (BIN, FLAC, WAV, APE). Used universally across audio preservation communities (EAC, dBpoweramp, Redump, MusicBrainz, foobar2000), a CUE sheet specifies the track boundaries, pregaps/postgaps, subcode indices, performers, and ISRCs. Music producers, archivers, and DJs often need to extract tracklists and convert CD frame timestamps ($1 \text{ second} = 75 \text{ sectors/frames}$) into clean, structured JSON and exact millisecond cue markers for modern web audio players or music databases.
- **Community Need & Reddit Signals:**
  - Subreddits: r/audiophile, r/riprequests, r/foobar2000, r/musichoarder.
  - Queries: *"Convert CUE sheet to JSON online"*, *"Parse CUE file tracks and timestamps"*, *"CUE sheet 75 frames to milliseconds converter"*, *"Extract chapters from CUE file"*.
- **Forensic Byte Layout:**
  - Text-based line format with commands: `CATALOG`, `CDTEXTFILE`, `TITLE`, `PERFORMER`, `SONGWRITER`, `REM` (comments/genre/year), `FILE` (filename and audio container type), `TRACK` (track number and data type `AUDIO`), `ISRC`, `FLAGS`, `PREGAP`, and `INDEX 00/01/02` timestamp markers in `MM:SS:FF` format.
  - Timing: $FF$ represents sectors from 0 to 74 ($1/75$th of a second).
- **In-Browser Execution Strategy:**
  - Pure TypeScript parser: Tokenizes CUE syntax with quote-aware lexer, calculates exact sector counts ($M \times 60 \times 75 + S \times 75 + F$), translates each index into seconds, milliseconds, and formatted timestamps (`MM:SS.mmm`), structures files, tracks, and disc-level metadata, and serializes to formatted JSON in memory.
- **Fidelity:** `LOSSLESS` (Full subcode timing precision down to individual CD-DA audio frames).
- **Status:** **Wave 17 Shipped (`document/cue-to-json`)**.

### 48. CD-DA Audio CUE Sheet (`.cue`)

- **Ecosystem & Context:** CUE sheets (`.cue`) are the universal disc layout metadata files for compact disc audio (CD-DA), mixed-mode CDs, and disc images (BIN, FLAC, WAV, APE). Used universally across audio preservation communities (EAC, dBpoweramp, Redump, MusicBrainz, foobar2000), a CUE sheet specifies the track boundaries, pregaps/postgaps, subcode indices, performers, and ISRCs. Music producers, archivers, and DJs often need to extract tracklists and convert CD frame timestamps ($1 \text{ second} = 75 \text{ sectors/frames}$) into clean, structured JSON and exact millisecond cue markers for modern web audio players or music databases.
- **Community Need & Reddit Signals:**
  - Subreddits: r/audiophile, r/riprequests, r/foobar2000, r/musichoarder.
  - Queries: *"Convert CUE sheet to JSON online"*, *"Parse CUE file tracks and timestamps"*, *"CUE sheet 75 frames to milliseconds converter"*, *"Extract chapters from CUE file"*.
- **Forensic Byte Layout:**
  - Text-based line format with commands: `CATALOG`, `CDTEXTFILE`, `TITLE`, `PERFORMER`, `SONGWRITER`, `REM` (comments/genre/year), `FILE` (filename and audio container type), `TRACK` (track number and data type `AUDIO`), `ISRC`, `FLAGS`, `PREGAP`, and `INDEX 00/01/02` timestamp markers in `MM:SS:FF` format.
  - Timing: $FF$ represents sectors from 0 to 74 ($1/75$th of a second).
- **In-Browser Execution Strategy:**
  - Pure TypeScript parser: Tokenizes CUE syntax with quote-aware lexer, calculates exact sector counts ($M \times 60 \times 75 + S \times 75 + F$), translates each index into seconds, milliseconds, and formatted timestamps (`MM:SS.mmm`), structures files, tracks, and disc-level metadata, and serializes to formatted JSON in memory.
- **Fidelity:** `LOSSLESS` (Full subcode timing precision down to individual CD-DA audio frames).
- **Status:** **Wave 17 Shipped (`document/cue-to-json`)**.

---

### 49. AutoCAD 2D Drawing Exchange Format (`.dxf`)

- **Ecosystem & Context:** DXF (Drawing Exchange Format) is Autodesk's open CAD vector exchange standard created in 1982. Millions of architectural floor plans, CNC machining profiles, plasma/waterjet cutter toolpaths, and laser-cutting designs (Glowforge, LightBurn) are distributed as 2D `.dxf` files. Makers, engineers, and hobbyists without costly CAD software (AutoCAD, SolidWorks, Rhino) need an instant, in-browser tool to convert 2D DXF drawings into clean, scalable SVG vector graphics for web display, laser cutting, and design prototyping.
- **Community Need & Reddit Signals:**
  - Subreddits: r/lasercutting, r/CNC, r/cad, r/3Dprinting, r/glowforge.
  - Queries: *"Convert DXF to SVG online free"*, *"Open DXF without AutoCAD"*, *"DXF to SVG for laser cutter"*, *"Batch convert 2D CAD files to vector"*.
- **Forensic Byte Layout:**
  - ASCII Tagged Line Pairs: Group code integer on line $2N$, value string/number on line $2N+1$.
  - Sections: `HEADER`, `CLASSES`, `TABLES`, `BLOCKS`, `ENTITIES`, and `EOF`.
  - Supported 2D Entities: `LINE` (10/20 start, 11/21 end), `CIRCLE` (10/20 center, 40 radius), `ARC` (10/20 center, 40 radius, 50/51 start/end angles in degrees), `LWPOLYLINE` / `POLYLINE` (vertices, closed flag 70), `POINT`, and `TEXT` / `MTEXT`.
- **In-Browser Execution Strategy:**
  - Pure TypeScript tagged-value parser: Reads `ENTITIES` section, extracts 2D vector coordinates, computes geometry bounding box (`minX, minY, maxX, maxY`), handles Y-axis inversion (AutoCAD Cartesian $+Y$ is up; SVG screen $+Y$ is down), normalizes viewports with margin padding, and generates clean, responsive XML SVG documents with `vector-effect="non-scaling-stroke"`.
- **Fidelity:** `LOSSLESS` (Direct mathematical geometry translation).
- **Status:** **Wave 18 Shipped (`document/dxf-to-svg`)**.

---

### 50. X11 X BitMap (`.xbm`)

- **Ecosystem & Context:** XBM (X BitMap) was designed for the X11 Window System to store monochrome icons, cursor shapes, and window bitmaps directly as valid C programming language source code. In modern development, XBM has found a huge second life in embedded electronics: Arduino, Raspberry Pi, and ESP32 microcontrollers driving monochrome OLED displays (SSD1306, SH1106, u8g2) and e-ink panels widely store UI bitmaps as XBM C arrays. Modern graphic editors (Photoshop, Figma, Illustrator) cannot view or open `.xbm` source files.
- **Community Need & Reddit Signals:**
  - Subreddits: r/arduino, r/esp8266, r/esp32, r/embedded, r/unixporn.
  - Queries: *"Convert XBM to PNG online"*, *"Open .xbm C header image"*, *"Preview SSD1306 OLED bitmap"*, *"XBM image viewer"*.
- **Forensic Byte Layout:**
  - C-Header Syntax: `#define <name>_width <int>`, `#define <name>_height <int>`, and `static [unsigned] char <name>_bits[] = { 0xNN, ... };`.
  - Bit Packing: Least Significant Bit (LSB) first within each byte. Unset bit (`0`) represents background; set bit (`1`) represents foreground. Scanlines padded to full bytes (`Math.ceil(width / 8)`).
- **In-Browser Execution Strategy:**
  - Pure TypeScript C-code lexer: Extracts width and height macros, parses hexadecimal byte tokens from the array body, unpacks LSB-first bit arrays into 32-bit RGBA pixel buffers (supporting transparent or white background), and encodes into standard PNG.
- **Fidelity:** `LOSSLESS` (Pixel-exact 1-bit bitmap reproduction).
- **Status:** **Wave 18 Shipped (`image/xbm-to-png`)**.

---

### 51. Creative Voice Sound Blaster Audio (`.voc`)

- **Ecosystem & Context:** Creative Voice (`.voc`) was the proprietary digital audio format of Creative Technology's Sound Blaster sound cards during the golden age of MS-DOS personal computing in the late 1980s and 1990s. Classic DOS games (Wolfenstein 3D, Commander Keen, Wing Commander, LucasArts SCUMM classics, Apogee titles) stored digitized sound effects, monster roars, and speech clips in `.voc`. Retro gaming archivists, modders, and chiptune sound designers frequently encounter `.voc` files that no modern operating system or browser can play natively.
- **Community Need & Reddit Signals:**
  - Subreddits: r/dosgaming, r/retrogaming, r/chiptunes, r/soundblaster, r/gamedev.
  - Queries: *"Convert VOC to WAV online"*, *"Play Sound Blaster .voc files on Mac/Windows"*, *"DOS game audio extractor"*, *"Creative Voice to MP3/WAV"*.
- **Forensic Byte Layout:**
  - Header: 26 bytes starting with ASCII `"Creative Voice File\x1A"`, header offset (26), version (e.g. `0x010A` = 1.10), and 2's complement check word (`~version + 0x1234`).
  - Block Stream: 1-byte block type + 3-byte Little-Endian block size. Block `0x01` (Voice data: time constant $SR = 1000000 / (256 - tc)$, packing mode, 8-bit unsigned PCM samples), Block `0x02` (Voice continuation), Block `0x03` (Silence), Block `0x08` (Extended block: 16-bit time constant $SR = 256000000 / (65536 - tc)$, stereo/mono), Block `0x09` (Version 1.20+ format: explicit sample rate, 16-bit signed PCM LE), Block `0x00` (Terminator).
- **In-Browser Execution Strategy:**
  - Pure TypeScript audio stream parser: Validates Sound Blaster magic header, calculates precise sample rates from analog time constants, decodes 8-bit unsigned and 16-bit signed PCM audio blocks, scales samples to 16-bit linear PCM, and wraps the continuous audio stream into a standard 44-byte RIFF WAVE container for universal playback.
- **Fidelity:** `LOSSLESS` (Exact sample preservation and authentic sample-rate reconstruction).
- **Status:** **Wave 18 Shipped (`audio/voc-to-wav`)**.

---

### 52. Windows Metafile (`.wmf`)

- **Ecosystem & Context:** Windows Metafile (`.wmf`) is Microsoft's 16-bit vector graphic format introduced with Windows 3.0 in 1990 and used ubiquitously across Microsoft Office (Word, PowerPoint, Publisher, Encarta) for decades. Hundreds of millions of archived documents, educational slides, corporate presentations, clip art libraries, and technical schematics contain embedded or standalone `.wmf` vector illustrations. Modern browsers, Linux, and macOS platforms have zero native support for 16-bit WMF GDI playback.
- **Community Need & Reddit Signals:**
  - Subreddits: r/graphic_design, r/sysadmin, r/windows, r/inkscape, r/Office365.
  - Queries: *"How to convert old .wmf clip art to SVG on Mac"*, *"Batch convert WMF to vector SVG free"*, *"Open Windows Metafile without MS Office"*, *"WMF vector to modern web SVG"*.
- **Forensic Byte Layout:**
  - **Aldus Placeable Header (APM, 22 bytes):**
    - Magic key `0x9AC6CDD7` (`d7 cd c6 9a` in Little-Endian).
    - Handle (`0x0000`), Left, Top, Right, Bottom (16-bit signed integers), Inch (units per inch, typically 576 or 1440), Reserved (4 bytes), Checksum (16-bit XOR of preceding 10 words).
  - **Standard WMF Header (18 bytes):**
    - FileType (1 = memory, 2 = disk), HeaderSize (9 words = 18 bytes), Version (`0x0300`), FileSize (in 16-bit words), NumOfObjects, MaxRecordSize, NumOfParams.
  - **GDI 16-Bit Records:**
    - Size (32-bit uint in 16-bit words), Function (16-bit uint GDI opcode), Parameters (`(Size - 3) * 2` bytes).
    - Key Record Codes: `META_SETWINDOWORG` (`0x020B`), `META_SETWINDOWEXT` (`0x020C`), `META_MOVETO` (`0x0214`), `META_LINETO` (`0x0213`), `META_POLYLINE` (`0x0325`), `META_POLYGON` (`0x0324`), `META_RECTANGLE` (`0x041B`), `META_ELLIPSE` (`0x0418`), `META_ROUNDRECT` (`0x061C`), `META_ARC` (`0x0817`), `META_TEXTOUT` (`0x0521`), `META_EOF` (`0x0000`).
- **In-Browser Execution Strategy:**
  - Pure TypeScript GDI vector parser: Handles both Aldus Placeable and standard metafiles, computes exact vector bounding boxes and viewports, iterates 16-bit GDI draw commands, translates lines, polylines, polygons, rectangles, ellipses, arcs, and text into clean XML vector elements (`<svg>`, `<path>`, `<polyline>`, `<polygon>`, `<rect>`, `<ellipse>`, `<text>`), applies non-scaling stroke styling, and emits compliant modern SVG.
- **Fidelity:** `LOSSLESS` (Full vector fidelity, resolution-independent scaling).
- **Status:** **Wave 19 Shipped (`image/wmf-to-svg`)**.

---

### 53. GPS Exchange Format (`.gpx`)

- **Ecosystem & Context:** GPS Exchange Format (`.gpx`) is the universal open XML schema for GPS data created by TopoGrafix. Used by Garmin, Strava, Komoot, Suunto, Wahoo, Apple Watch, and AllTrails, millions of runners, cyclists, hikers, and GIS researchers archive their outdoor adventures, races, and trails in `.gpx`. While standard in outdoor devices, modern web mapping platforms (Mapbox, Leaflet, OpenLayers, Kepler.gl, D3.js) and spatial databases require standard RFC 7946 GeoJSON.
- **Community Need & Reddit Signals:**
  - Subreddits: r/gis, r/Strava, r/Garmin, r/bikepacking, r/trailrunning, r/webdev.
  - Queries: *"Convert GPX to GeoJSON online free"*, *"Load GPX track into Mapbox / Leaflet"*, *"Convert Strava GPX to GeoJSON FeatureCollection"*, *"Extract coordinates and heart rate from GPX without server"*.
- **Forensic Structure:**
  - Standard GPX 1.0 & 1.1 XML containing `<metadata>`, `<wpt>` (Waypoints with `lat`, `lon`, `<ele>`, `<time>`, `<name>`, `<desc>`), `<rte>` (Planned routes with `<rtept>`), and `<trk>` (Recorded tracks with `<trkseg>` and `<trkpt>` trackpoints).
  - Telemetry Extensions: `<gpxtpx:TrackPointExtension>` with `<gpxtpx:hr>` (heart rate) and `<gpxtpx:cad>` (cadence).
- **In-Browser Execution Strategy:**
  - Pure TypeScript portable XML parser: Operates without DOM dependencies across browsers, workers, and Node environments. Converts `<wpt>` into GeoJSON `Point` features, `<rte>` into `LineString` features, and single/multi-segment `<trk>` into `LineString` or `MultiLineString` features. Calculates precise Haversine distance in meters, cumulative elevation gain/loss, duration, average speed, and average heart rate directly in the GeoJSON feature properties.
- **Fidelity:** `LOSSLESS` (Full RFC 7946 GeoJSON compliance with preserved metadata, elevation, and telemetry).
- **Status:** **Wave 19 Shipped (`document/gpx-to-geojson`)**.

---

### 54. Sun Microsystems & NeXT Audio (`.au`, `.snd`)

- **Ecosystem & Context:** The `.au` / `.snd` audio format was introduced by Sun Microsystems for SunOS/Solaris workstations and became the native sound format on NeXTSTEP / Steve Jobs' NeXT computers. In the early 1990s, `.au` was the standard audio format of the early World Wide Web (NCSA Mosaic, Netscape Navigator). Decades of historical telecom archives, speech corpora, Unix sound effects, and academic recordings remain stored in `.au` format. Modern mobile browsers and desktop operating systems have removed native playback for AU/SND files.
- **Community Need & Reddit Signals:**
  - Subreddits: r/vintagecomputing, r/unix, r/audioengineering, r/DataHoarder, r/sparc.
  - Queries: *"Convert .au file to WAV online"*, *"Sun Microsystems audio player"*, *"How to play NeXT .snd files"*, *"Convert mu-law .au to normal WAV"*.
- **Forensic Byte Layout:**
  - **Header (minimum 24 bytes, Big-Endian):**
    - Bytes 0-3: Magic string `".snd"` (`0x2E 0x73 0x6E 0x64`).
    - Bytes 4-7: `dataOffset` (32-bit uint BE, points to sample data start, $\ge 24$).
    - Bytes 8-11: `dataSize` (32-bit uint BE, `0xFFFFFFFF` if unknown).
    - Bytes 12-15: `encoding` (32-bit uint BE: 1 = 8-bit $\mu$-law, 2 = 8-bit signed PCM, 3 = 16-bit linear PCM BE, 4 = 24-bit linear PCM BE, 5 = 32-bit linear PCM BE, 6 = 32-bit IEEE float, 27 = 8-bit A-law).
    - Bytes 16-19: `sampleRate` (32-bit uint BE, e.g. 8000, 11025, 22050, 44100, 48000 Hz).
    - Bytes 20-23: `channels` (32-bit uint BE: 1 = mono, 2 = stereo).
    - Bytes 24 to `dataOffset`: Optional ASCII annotation / text description.
  - **Sample Decompression:**
    - G.711 $\mu$-law / A-law logarithmic decompression into linear 16-bit PCM via precomputed 256-entry lookup tables.
    - Big-Endian 16-bit / 24-bit / 32-bit / float conversion to normalized signed 16-bit linear PCM.
- **In-Browser Execution Strategy:**
  - Pure TypeScript audio decoder: Validates `.snd` magic header, decodes G.711 $\mu$-law, A-law, and Big-Endian PCM streams into 16-bit linear PCM samples, preserves channel interleaving and sample rates, and synthesizes standard 44-byte RIFF WAVE audio containers for universal instant playback and download.
- **Fidelity:** `LOSSLESS` (Mathematically exact G.711 table expansion and sample reconstruction).
- **Status:** **Wave 19 Shipped (`audio/au-to-wav`)**.

---

### 55. X11 X PixMap (`.xpm`)

- **Ecosystem & Context:** X11 X PixMap (`.xpm`) is the classic color icon and pixel graphic format of the X Window System, introduced in 1989. It stores full-color icons and GUI bitmaps directly as valid C-source code arrays (`static char * icon[] = { ... }`), enabling vintage Unix software (fvwm, Xaw, Motif, Window Maker, Tcl/Tk, GIMP plugins) to compile graphical assets directly into binaries without external loaders. Retro Linux preservationists, theme designers, and embedded developers frequently encounter `.xpm` files that modern image viewers and mobile platforms cannot display.
- **Community Need & Reddit Signals:**
  - Subreddits: r/unixporn, r/linux, r/retrobattlestations, r/pixelart, r/gamedev.
  - Queries: *"Convert .xpm to PNG online free"*, *"Open X11 pixmap without Linux"*, *"Batch convert XPM icons to transparent PNG"*, *"XPM3 to PNG in browser"*.
- **Forensic Structure:**
  - Standard XPM3 format encapsulated in C array: `static char * <name>[] = { ... };` (and XPM2 plain text lines starting with `! XPM2`).
  - Values line: `width height num_colors chars_per_pixel [hotspot_x hotspot_y]`.
  - Palette lines: `chars_per_pixel` character token followed by visual qualifiers: `c <color>` (color visual), `m <color>` (monochrome), `g <color>` (grayscale), where color is `None` (transparent), `#RGB`, `#RRGGBB`, `#RRRRGGGGBBBB`, or X11 color names (e.g. `red`, `blue`, `black`, `white`).
  - Pixel rows: `height` strings, each containing `width * chars_per_pixel` characters mapped via palette lookup table.
- **In-Browser Execution Strategy:**
  - Pure TypeScript XPM parser: Extracts string literals from C-source syntax or XPM2 lines, parses dimensions and character keys, maps transparent and hex/named colors into RGBA values, populates a 32-bit RGBA raster, and encodes directly into lossless PNG with proper alpha channel preservation.
- **Fidelity:** `LOSSLESS` (Exact color and transparency fidelity).
- **Status:** **Wave 20 Shipped (`image/xpm-to-png`)**.

---

### 56. Keyhole Markup Language (`.kml`)

- **Ecosystem & Context:** Keyhole Markup Language (`.kml`) is the open geospatial XML standard created by Keyhole Inc. (acquired by Google in 2004) and popularized across Google Earth and Google Maps. Millions of municipal boundary maps, environmental surveys, historical expedition paths, and outdoor trail networks are archived in `.kml`. However, modern web cartography libraries (Mapbox GL, Leaflet, OpenLayers, Kepler.gl, D3.js) and spatial databases expect GeoJSON (RFC 7946).
- **Community Need & Reddit Signals:**
  - Subreddits: r/gis, r/GoogleEarth, r/MapPorn, r/webdev, r/opendata.
  - Queries: *"Convert KML to GeoJSON online"*, *"Open Google Earth .kml in Mapbox / Leaflet"*, *"Convert KML boundaries and polygons to GeoJSON FeatureCollection"*, *"Extract coordinates and ExtendedData from KML without server upload"*.
- **Forensic Structure:**
  - XML structure conforming to OGC KML 2.0 / 2.1 / 2.2 schemas.
  - Placemarks containing `<Point>`, `<LineString>`, `<Polygon>` (`<outerBoundaryIs>` and `<innerBoundaryIs>`), and `<MultiGeometry>`.
  - Coordinate syntax: `longitude,latitude[,altitude]` separated by commas and whitespace.
  - Attributes: `<name>`, `<description>`, `<styleUrl>`, and custom `<ExtendedData>` (`<Data name="...">` and `<SimpleData>`).
- **In-Browser Execution Strategy:**
  - Pure TypeScript portable XML parser: Operates without DOM dependencies across browsers, workers, and Node environments. Converts Point, LineString, Polygon (with cutout inner rings), and MultiGeometry into standard RFC 7946 GeoJSON geometries. Preserves Placemark metadata and ExtendedData attributes directly in feature properties.
- **Fidelity:** `LOSSLESS` (Full RFC 7946 GeoJSON compliance with preserved metadata, boundaries, and attributes).
- **Status:** **Wave 20 Shipped (`document/kml-to-geojson`)**.

---

### 57. Apple Audio Interchange File Format (`.aif`, `.aiff`)

- **Ecosystem & Context:** AIFF (Audio Interchange File Format) is Apple's uncompressed audio container format, co-developed with Electronic Arts in 1988 for Macintosh computers and the Commodore Amiga. For over three decades, it was the primary uncompressed audio format for Mac OS, Pro Tools on Mac, Logic Pro, and professional audio sample libraries. Although AIFF stores high-resolution linear PCM just like WAV, its Big-Endian byte ordering, unique chunk IDs (`FORM`, `COMM`, `SSND`), and rare 80-bit IEEE 754 extended precision sample rate encoding prevent many modern Windows media players, car stereos, and web APIs from playing it.
- **Community Need & Reddit Signals:**
  - Subreddits: r/audioengineering, r/synthesizers, r/vintagecomputing, r/mac, r/audiophile.
  - Queries: *"Convert AIFF to WAV online without loss"*, *"Batch convert .aif sample library to WAV"*, *"Play Apple .aiff on Windows / Android"*, *"Lossless AIFF to RIFF WAV converter"*.
- **Forensic Byte Layout:**
  - **IFF Container (Big-Endian):**
    - Bytes 0-3: ASCII `"FORM"`, 4-byte Big-Endian file size, 4-byte form type (`"AIFF"` or `"AIFC"`).
  - **`COMM` Chunk:**
    - `numChannels` (16-bit uint BE, e.g. 1 mono, 2 stereo).
    - `numSampleFrames` (32-bit uint BE).
    - `sampleSize` (16-bit uint BE: 8, 16, 24, or 32 bits per sample).
    - `sampleRate`: 10-byte (80-bit) IEEE 754 extended precision float (1-bit sign, 15-bit exponent with bias 16383, 64-bit mantissa with explicit integer bit).
  - **`SSND` Chunk:**
    - `offset` (32-bit uint BE), `blockSize` (32-bit uint BE), followed by raw Big-Endian signed PCM samples.
- **In-Browser Execution Strategy:**
  - Pure TypeScript audio container decoder: Parses `FORM`/`COMM`/`SSND` chunks, decodes 80-bit IEEE 754 extended precision sample rates, unpacks 8-bit, 16-bit, 24-bit, and 32-bit Big-Endian PCM samples, normalizes them into 16-bit linear PCM, and synthesizes a standard 44-byte little-endian RIFF WAVE container for universal playback and DAW compatibility.
- **Fidelity:** `LOSSLESS` (Mathematically exact sample preservation without re-encoding compression).
- **Status:** **Wave 20 Shipped (`audio/aiff-to-wav`)**.

---

### 58. Sun Microsystems Sun Raster (`.ras`, `.sun`, `.rast`)

- **Ecosystem & Context:** Sun Raster (`.ras`, `.sun`, `.rast`) is the vintage Unix bitmap graphic format introduced by Sun Microsystems for SunOS and Solaris workstations in the late 1980s and 1990s. Extensively utilized in OpenWindows, academic astronomical observatories (FITS to Sun Raster conversion), satellite imagery, and Unix desktop software. It supports 1-bit monochrome, 8-bit indexed colormaps, 24-bit BGR/RGB truecolor, and 32-bit raster graphics with optional RLE byte compression (`RT_BYTE_ENCODED`). Modern browsers and standard image viewers cannot display Sun Raster files without legacy Unix CLI utilities.
- **Community Need & Reddit Signals:**
  - Subreddits: r/retrobattlestations, r/unixporn, r/solaris, r/vintagecomputing, r/astrophotography.
  - Queries: *"Open Sun Raster .ras file in browser"*, *"Convert .ras or .sun image to PNG"*, *"View old SunOS raster files without Netpbm"*, *"Batch convert Sun Raster to PNG locally"*.
- **Forensic Byte Layout:**
  - **32-Byte Big-Endian Header (8 x 32-bit unsigned integers):**
    - Magic number: `0x59A66A95` (`1504078485`).
    - `width`, `height`, `depth` (1, 8, 24, 32).
    - `length`: size of image data in bytes.
    - `type`: `0` (`RT_OLD`), `1` (`RT_STANDARD`), `2` (`RT_BYTE_ENCODED` RLE), `3` (`RT_FORMAT_RGB`).
    - `maptype`: `0` (`RMT_NONE`), `1` (`RMT_EQUAL_RGB`), `2` (`RMT_RAW`).
    - `maplength`: length of color map data in bytes.
  - **Color Map:** When `maptype == RMT_EQUAL_RGB`, stores 3 separate color planes: `N` red bytes, `N` green bytes, `N` blue bytes (`N = maplength / 3`).
  - **Scanline Padding:** Every raster scanline must be padded to a 16-bit (2-byte / even byte) word boundary.
  - **RLE Decompression:** Byte stream where `0x80` is an escape token: `0x80 0x00` emits literal `0x80`; `0x80 count val` repeats `val` for `count + 1` times.
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary parser and RLE decompressor. Parses 32-byte big-endian header, extracts planar RGB colormaps, unpacks 1-bit, 8-bit, 24-bit (BGR/RGB), and 32-bit raster buffers with 16-bit scanline stride compensation, and encodes to lossless 32-bit RGBA PNG.
- **Fidelity:** `LOSSLESS` (Pixel-perfect color reproduction and lossless PNG encoding).
- **Status:** **Wave 21 Shipped (`image/ras-to-png`)**.

---

### 59. Garmin Training Center XML (`.tcx`)

- **Ecosystem & Context:** TCX (Training Center XML) is Garmin's open XML-based workout and geospatial format. Generated by Garmin Edge cycling computers, Forerunner running watches, Fenix multisport watches, and exported by Strava, TrainingPeaks, and Wahoo. Unlike generic GPS formats (which only record raw waypoints and tracks), TCX is specifically designed for athletic workout analysis, structuring data into activities, workout laps, and rich biometric sensors (heart rate BPM, cycling cadence RPM, power in Watts, and course cue points). Modern cartography libraries and GIS applications (Mapbox, Leaflet, Kepler.gl, QGIS, Turf.js) require standard RFC 7946 GeoJSON.
- **Community Need & Reddit Signals:**
  - Subreddits: r/Garmin, r/Strava, r/bicycling, r/gis, r/webdev, r/running.
  - Queries: *"Convert TCX to GeoJSON free online"*, *"Open Garmin .tcx in Mapbox / Leaflet"*, *"Extract power and heart rate from TCX to GeoJSON"*, *"Convert Garmin course cue points to GeoJSON points"*.
- **Forensic Structure:**
  - XML document conforming to Garmin TrainingCenterDatabase v2 schema.
  - Root: `<TrainingCenterDatabase>`.
  - Activities: `<Activities>` -> `<Activity Sport="...">` -> `<Id>`, `<Lap StartTime="...">` -> `<TotalTimeSeconds>`, `<DistanceMeters>`, `<Calories>`, `<AverageHeartRateBpm>`, `<MaximumSpeed>`, `<Track>` -> `<Trackpoint>`.
  - Trackpoints: `<Time>`, `<Position>` (`<LatitudeDegrees>`, `<LongitudeDegrees>`), `<AltitudeMeters>`, `<DistanceMeters>`, `<HeartRateBpm>`, `<Cadence>`, `<Extensions>` (`<TPX>` -> `<Speed>`, `<Watts>`).
  - Courses: `<Courses>` -> `<Course>` -> `<CoursePoint>` (`<PointType>`, `<Notes>`).
- **In-Browser Execution Strategy:**
  - Portable DOM-free XML parser operating safely in Web Workers and Node. Extracts track segments, calculates workout statistics (duration, distance, elevation min/max/gain/loss, average/max heart rate and power), generates RFC 7946 `LineString` tracks with `coordinateProperties` time-series telemetry arrays, and emits `Point` markers for lap start splits and course waypoints.
- **Fidelity:** `LOSSLESS` (Preserves all coordinates, elevations, and sensor telemetry in standard GeoJSON).
- **Status:** **Wave 21 Shipped (`document/tcx-to-geojson`)**.

---

### 60. IRCAM / Sound Designer II / BICSF Audio (`.sf`, `.ircam`)

- **Ecosystem & Context:** IRCAM sound files were created by the Institut de Recherche et Coordination Acoustique/Musique in Paris during the 1980s for computer music research, electroacoustic composition, and digital sound synthesis. Widely used across vintage research software such as CSound, Cmusic, AudioSculpt, OpenMusic, MAX, and Berkeley BICSF sound workstations. Modern media players and audio workstations cannot play `.sf` / `.ircam` files natively without vintage CLI converters.
- **Community Need & Reddit Signals:**
  - Subreddits: r/audiophile, r/audioengineering, r/synthesizers, r/vintagecomputing, r/csound.
  - Queries: *"Convert IRCAM .sf to WAV online"*, *"Play IRCAM sound file on Windows / Mac"*, *"Batch convert CSound .sf files to WAV"*, *"Convert BICSF audio to universal WAV"*.
- **Forensic Byte Layout:**
  - **Fixed 1024-Byte Header (0x400):**
    - Magic number (bytes 0-3): Big-Endian `0x64 0xA3 0x01/0x02/0x03/0x04 0x00` (Sun/NeXT) or Little-Endian `0x00 0x01/0x02/0x03/0x04 0xA3 0x64` (VAX/DEC/Intel).
    - Sample Rate (bytes 4-7): Stored as 32-bit IEEE float (e.g. 44100.0, 48000.0).
    - Channels (bytes 8-11): 32-bit integer (1 = mono, 2 = stereo, 4 = quad).
    - Encoding (bytes 12-15): 32-bit integer: `1` = 16-bit linear signed PCM, `2` = 32-bit linear signed PCM, `3` = 8-bit $\mu$-law, `4` = 32-bit IEEE float.
  - **Audio Data:** Starts strictly at byte offset 1024.
- **In-Browser Execution Strategy:**
  - Pure TypeScript audio decoder. Detects big-endian and little-endian header signatures, extracts sample rate float and channel configurations, decodes 16-bit/32-bit linear PCM, 32-bit IEEE float, or $\mu$-law audio streams, normalizes samples into 16-bit PCM, and wraps them in a 44-byte little-endian RIFF WAVE container for universal DAW and media player compatibility.
- **Fidelity:** `LOSSLESS` (Exact sample preservation).
- **Status:** **Wave 21 Shipped (`audio/ircam-to-wav`)**.

---

---

### 61. Silicon Graphics Iris RGB Image (`.rgb`, `.rgba`, `.sgi`, `.bw`)

- **Ecosystem & Context:** Silicon Graphics (SGI) Iris RGB format was created by Silicon Graphics Inc. in the 1980s for IRIX Unix workstations. It became the dominant file format for early OpenGL development, 3D computer graphics software (Alias PowerAnimator, Maya, Softimage 3D), Nintendo 64 developer kits, and Hollywood film visual effects in the 1990s (Industrial Light & Magic, Pixar). Files typically use `.rgb` (3-channel truecolor), `.rgba` (4-channel with alpha), `.bw` (single channel grayscale), or `.sgi`. Modern operating systems cannot natively view or convert SGI images without specialized software.
- **Community Need & Reddit Signals:**
  - Subreddits: r/sgi, r/retrobattlestations, r/vintagecomputing, r/vfx, r/n64, r/3Dmodeling.
  - Queries: *"How to open SGI .rgb file on Mac / Windows"*, *"Convert SGI Iris .rgba texture to PNG"*, *"Why are my SGI images opening upside down"*, *"Batch convert SGI files to PNG in browser"*.
- **Forensic Byte Layout:**
  - **512-Byte Big-Endian Header:**
    - Magic Number (bytes 0-1): `0x01DA` (`474`).
    - Storage (byte 2): `0` = Uncompressed, `1` = RLE-compressed.
    - Bytes per Channel (byte 3): `1` = 8-bit channels (`0..255`), `2` = 16-bit channels (`0..65535`).
    - Dimension (bytes 4-5): `1` (single scanline), `2` (single channel 2D), `3` (multiple channels 2D).
    - Xsize / Width (bytes 6-7), Ysize / Height (bytes 8-9), Zsize / Channels (bytes 10-11): 1 = B/W, 2 = Grayscale+Alpha, 3 = RGB, 4 = RGBA.
    - Pixel min (bytes 12-15) and max (bytes 16-19): Minimum and maximum pixel values across channels.
    - Image Name (bytes 24-103): Null-terminated 80-byte ASCII string.
    - Colormap ID (bytes 104-107): `0` = Normal RGB, `1` = Colormapped (rare), `2` = Screen colormap, `3` = Colormap buffer.
  - **Vertical Orientation:** Scanlines are stored from bottom-to-top (`y = 0` is the bottom of the image).
  - **Planar Storage:** Channels are stored in separate planar bands (all Red scanlines, then all Green scanlines, etc.).
  - **RLE Compression:** Two offset tables follow header at offset 512: `startTab` (`ysize * zsize` 32-bit uints) and `lengthTab` (`ysize * zsize` 32-bit uints). Each RLE scanline consists of count-byte tokens: if `count & 0x7F`, repeat next value (or run of literals if high bit unset).
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary decoder. Reads 512-byte big-endian header, decodes planar bands (either uncompressed or via RLE offset tables), inverts vertical scanline ordering (`targetY = height - 1 - y`) to ensure standard top-to-bottom PNG rendering, normalizes 8-bit/16-bit channel depths, and encodes directly into standard lossless 32-bit RGBA PNG.
- **Fidelity:** `LOSSLESS` (Pixel-perfect channel fidelity and correct vertical geometry).
- **Status:** **Wave 22 Shipped (`image/sgi-to-png`)**.

---

### 62. Google Earth Compressed Keyhole Archive (`.kmz`)

- **Ecosystem & Context:** KMZ (Keyhole Markup language Zipped) is the standard compressed archive format developed by Keyhole Inc. and adopted by Google for Google Earth, Google Maps, and global geospatial analysis. KMZ archives package a primary `doc.kml` vector document alongside custom placemark icons, ground overlays, CAD/GIS models, and tour definitions inside a single standard PKZIP container. Modern web GIS frameworks (Mapbox GL JS, Leaflet, OpenLayers, Kepler.gl, GeoJSON.io, D3.js) and data pipelines require standard RFC 7946 GeoJSON.
- **Community Need & Reddit Signals:**
  - Subreddits: r/gis, r/GoogleEarth, r/MapPorn, r/webdev, r/geography, r/QGIS.
  - Queries: *"Convert KMZ to GeoJSON free in browser"*, *"Open .kmz file in Mapbox or Leaflet"*, *"Extract doc.kml from KMZ to GeoJSON"*, *"Batch convert Google Earth KMZ without uploading to third-party server"*.
- **Forensic Structure:**
  - Standard PKZIP archive structure (ZIP Local File Headers `0x04034b50`, Central Directory `0x02014b50`).
  - Primary document: `doc.kml` or first `.kml` file found in archive.
  - KML XML elements: `<Placemark>`, `<Point>`, `<LineString>`, `<Polygon>` (`<outerBoundaryIs>`, `<innerBoundaryIs>` for doughnut holes), `<MultiGeometry>`, `<ExtendedData>` (`<Data>`, `<SimpleData>`).
- **In-Browser Execution Strategy:**
  - In-memory ZIP decompression using lightweight pure-JS `fflate`. Extracts primary `.kml` XML document, parses spatial geometries using DOM-free XML streaming, maps coordinates into standard WGS84 `[longitude, latitude, elevation?]` tuples, extracts name, description, and ExtendedData key-value attributes into feature properties, and serializes clean RFC 7946 GeoJSON FeatureCollections entirely in browser memory.
- **Fidelity:** `LOSSLESS` (Preserves all placemark geometries, multi-polygons with holes, and metadata attributes).
- **Status:** **Wave 22 Shipped (`document/kmz-to-geojson`)**.

---

### 63. NIST SPHERE Speech Corpus Audio (`.sph`, `.nist`)

- **Ecosystem & Context:** NIST SPHERE (SPeech HEader REsources) is an audio file format created by the National Institute of Standards and Technology (NIST) for acoustic and speech recognition research. It is the definitive archival format for landmark speech corpora including DARPA TIMIT (Texas Instruments / MIT acoustic-phonetic corpus), CSR (Continuous Speech Recognition / Wall Street Journal), Switchboard, and NIST Speaker Recognition Evaluations. Modern media players and Python audio libraries (Torchaudio, Librosa) cannot natively play NIST SPHERE files without legacy utilities like `sph2pipe` or `sox`.
- **Community Need & Reddit Signals:**
  - Subreddits: r/MachineLearning, r/LanguageTechnology, r/audiophile, r/vintagecomputing, r/Python.
  - Queries: *"Convert NIST SPHERE .sph to WAV"*, *"Play TIMIT .sph audio on Mac / Windows"*, *"sph2pipe in browser without installing C tools"*, *"Python cannot read NIST .wav / .sph files"*.
- **Forensic Byte Layout:**
  - **1024-Byte (or n*1024) ASCII Text Header:**
    - Line 1: `NIST_1A\n` magic string.
    - Line 2: Header size declaration, e.g. `   1024\n`.
    - Key-value metadata lines formatted as `<field_name> -<type> <value>`:
      - `sample_count -i 46797`
      - `sample_n_bytes -i 2`
      - `sample_byte_format -s2 01` (Little-Endian) or `sample_byte_format -s2 10` (Big-Endian)
      - `sample_sig_bits -i 16`
      - `sample_coding -s3 pcm` (or `ulaw`, `alaw`)
      - `channel_count -i 1`
      - `sample_rate -i 16000`
    - Terminated by `end_head\n`, padded with ASCII spaces up to the declared header length.
  - **Audio Data:** Begins immediately following the ASCII header at byte offset `header_size`.
- **In-Browser Execution Strategy:**
  - High-performance text header parser extracting fields, types, and values. Correctly handles `01` (little-endian) vs `10` (big-endian) byte ordering, 16-bit signed PCM, 8-bit unsigned PCM, and $\mu$-law/A-law decoding tables, normalizing samples to 16-bit linear PCM and outputting a standard 44-byte RIFF WAVE file ready for instant playback or ML dataset consumption.
- **Fidelity:** `LOSSLESS` (Sample-exact speech reproduction).
- **Status:** **Wave 22 Shipped (`audio/nist-to-wav`)**.

---

## Roadmap Waves & Next Steps

1. **Wave 1 (Shipped):**
   - Reference: `video/mlw-to-mp4` (Shipped)
   - Tool 1: `video/procreate-to-mp4` (Extract drawing timelapse)
   - Tool 2: `image/procreate-to-png` (Extract full-res artwork)
   - Tool 3: `image/rpgmvp-to-png` (RPG Maker MV/MZ image decrypter)
   - Tool 4: `image/tgs-to-json` (Telegram animated sticker decompressor)
2. **Wave 2 (Shipped):**
   - Tool 5: `video/dav-to-mp4` (Dahua/Amcrest CCTV remuxer)
   - Tool 6: `video/h264-to-mp4` (Raw H.264 elementary stream muxer)
   - Tool 7: `audio/rpgmvo-to-ogg` (RPG Maker BGM decrypter)
   - Tool 8: `audio/rpgmvm-to-m4a` (RPG Maker SFX decrypter)
   - Tool 9: `document/xmind-to-markdown` (XMind to Markdown hierarchical notes)
3. **Wave 3 (Shipped):**
   - Tool 10: `image/clip-to-png` (Clip Studio Paint artwork extractor)
   - Tool 11: `video/pkg-to-mp4` (Wallpaper Engine video wallpaper extractor)
   - Tool 12: `audio/sf2-to-wav` (SoundFont .sf2 instrument sample extractor)
4. **Wave 4 (Shipped):**
   - Tool 13: `document/goodnotes-to-pdf` (GoodNotes notebook to PDF converter)
   - Tool 14: `image/studio3-to-svg` (Silhouette Studio craft vector to SVG)
   - Tool 15: `document/pck-to-zip` (Godot Engine asset package to ZIP)
5. **Wave 5 (Shipped):**
   - Tool 16: `document/rpa-to-zip` (Ren'Py visual novel archive unpacker)
   - Tool 17: `audio/opus-to-mp3` (WhatsApp voice note to universal MP3)
   - Tool 18: `document/msg-to-eml` (Outlook .msg to standard RFC 822 .eml)
6. **Wave 6 (Shipped):**
   - Tool 19: `audio/adx-to-wav` (CRIWARE ADX console game audio to WAV)
   - Tool 20: `document/scorm-to-zip` (SCORM Course asset extractor)
7. **Wave 7 (Shipped):**
   - Tool 21: `image/icns-to-png` (Apple macOS Icon Image highest-res PNG extractor)
   - Tool 22: `document/mhtml-to-html` (MHTML/MHT web archive to standalone offline HTML)
8. **Wave 8 (Shipped):**
   - Tool 23: `document/vcf-to-csv` (vCard / Contacts `.vcf` multi-contact exporter to CSV spreadsheet)
   - Tool 24: `image/dds-to-png` (DirectDraw Surface `.dds` game texture / normal map decoder to PNG)
9. **Wave 9 (Shipped):**
   - Tool 25: `document/wad-to-zip` (id Tech / Doom engine `.wad` game archive & sound extractor to ZIP)
   - Tool 26: `document/pak-to-zip` (Quake / GoldSrc Half-Life `.pak` game package extractor to ZIP)
10. **Wave 10 (Shipped):**
    - Tool 27: `image/abr-to-png` (Adobe Photoshop Brush `.abr` stamps to transparent PNGs + ZIP)
    - Tool 28: `image/ani-to-png` (Windows Animated Cursor `.ani` frames to PNGs + timing manifest)
11. **Wave 11 (Shipped):**
    - Tool 29: `document/fit-to-csv` (Garmin / Wahoo / Strava `.fit` activity decoder to RFC 4180 CSV + GPX)
    - Tool 30: `image/cur-to-png` (Windows Static Cursor `.cur` decoder to transparent PNG with hotspot coordinates)
    - Tool 31: `document/ase-to-css` (Adobe Swatch Exchange `.ase` palette decoder to CSS variables & Tailwind config)
12. **Wave 12 (Shipped):**
    - Tool 32: `document/webarchive-to-html` (Apple Safari WebArchive `.webarchive` to universal standalone offline HTML)
    - Tool 33: `document/vnt-to-txt` (Samsung / Sony Ericsson / Nokia mobile vNote `.vnt` memo to clean plain text)
13. **Wave 13 (Shipped):**
    - Tool 34: `document/smi-to-srt` (SAMI Synchronized Accessible Media Interchange `.smi` subtitle converter to SRT)
    - Tool 35: `image/gbr-to-png` (GIMP Brush `.gbr` to transparent PNG stamp)
    - Tool 36: `image/cdr-to-png` (CorelDRAW `.cdr` artwork composite preview extractor to PNG)
14. **Wave 14 (Shipped):**
    - Tool 37: `image/tga-to-png` (Truevision TGA texture & graphics decoder to PNG)
    - Tool 38: `document/bsp-to-zip` (Valve Source & GoldSrc BSP map asset extractor to ZIP)
    - Tool 39: `document/sub-to-srt` (MicroDVD frame-based subtitle converter to SRT)
15. **Wave 15 (Shipped):**
    - Tool 40: `document/ass-to-srt` (Advanced SubStation Alpha `.ass` / `.ssa` subtitle converter to SRT)
    - Tool 41: `document/chm-to-zip` (Microsoft Compiled HTML Help `.chm` ITSF decompiler to ZIP)
    - Tool 42: `audio/silk-to-wav` (WeChat / Skype Silk v3 voice note audio decoder to WAV)
16. **Wave 16 (Shipped):**
    - Tool 43: `image/pcx-to-png` (ZSoft PCX DOS/Windows retro bitmap decoder to PNG)
    - Tool 44: `document/act-to-css` (Adobe Photoshop Color Table `.act` 256-color palette to CSS variables & Tailwind config)
    - Tool 45: `image/vtf-to-png` (Valve Source Engine `.vtf` game texture decoder to PNG)
17. **Wave 17 (Shipped):**
    - Tool 46: `image/aseprite-to-png` (Aseprite `.aseprite` / `.ase` animated pixel art & sprite sheet extractor to PNG)
    - Tool 47: `image/iff-to-png` (Commodore Amiga Deluxe Paint / Electronic Arts IFF-ILBM & PBM interleaved bitmap decoder to PNG)
    - Tool 48: `document/cue-to-json` (CUE Sheet `.cue` CD-DA audio tracklist parser & chapter metadata extractor to JSON)
18. **Wave 18 (Shipped):**
    - Tool 49: `document/dxf-to-svg` (AutoCAD Drawing Exchange Format `.dxf` 2D vector CAD/CNC geometry to SVG)
    - Tool 50: `image/xbm-to-png` (X11 X BitMap `.xbm` monochrome C-code bitmap array to PNG)
    - Tool 51: `audio/voc-to-wav` (Creative Voice Sound Blaster `.voc` retro DOS game audio decoder to WAV)
19. **Wave 19 (Shipped):**
    - Tool 52: `image/wmf-to-svg` (Windows Metafile `.wmf` 16-bit vector clip art to clean SVG)
    - Tool 53: `document/gpx-to-geojson` (GPS Exchange Format `.gpx` tracks, waypoints, and routes to GeoJSON)
    - Tool 54: `audio/au-to-wav` (Sun Microsystems & NeXT `.au` / `.snd` audio to universal WAV)
20. **Wave 20 (Shipped):**
    - Tool 55: `image/xpm-to-png` (X11 X PixMap `.xpm` C-code color icon & pixmap array to transparent PNG)
    - Tool 56: `document/kml-to-geojson` (Keyhole Markup Language `.kml` Google Earth vector geometry and placemark to GeoJSON)
    - Tool 57: `audio/aiff-to-wav` (Apple Audio Interchange File Format `.aif` / `.aiff` uncompressed PCM to standard RIFF WAV)
21. **Wave 21 (Shipped):**
    - Tool 58: `image/ras-to-png` (Sun Raster `.ras` / `.sun` Unix graphic image format decoder to PNG)
    - Tool 59: `document/tcx-to-geojson` (Garmin Training Center XML `.tcx` track and lap activity telemetry to GeoJSON)
    - Tool 60: `audio/ircam-to-wav` (IRCAM / Sound Designer II / BICSF academic research audio format decoder to RIFF WAV)
---

### 64. X Window System Window Dump (`.xwd`, `.xdump`)

- **Ecosystem & Context:** XWD (X Window Dump) is the native raster screenshot and window capture format of the X Window System (X11). Created for X11R1 in 1987, it remains the standard output of the `xwd` command-line utility, virtual framebuffers like `Xvfb` (frequently used in headless browser automation, Docker containers, and CI/CD screenshot pipelines), and vintage Unix workstations (Solaris, IRIX, AIX, HP-UX, FreeBSD, Linux). Modern web browsers and operating systems (macOS, Windows, iOS, Android) cannot natively open or view XWD files.
- **Community Need & Reddit Signals:**
  - Subreddits: r/unix, r/linux, r/retrobattlestations, r/vintagecomputing, r/sysadmin, r/devops.
  - Queries: *"How to view .xwd file on Mac / Windows"*, *"Convert Xvfb xwd screenshot to PNG"*, *"Convert XWD window dump in browser without ImageMagick"*, *"Batch convert XWD to PNG online"*.
- **Forensic Byte Layout:**
  - **100+ Byte Big-Endian Header:**
    - `header_size`: 32-bit uint (minimum 100 bytes).
    - `file_version`: 32-bit uint (version 7).
    - `pixmap_format`: 32-bit uint (0 = `XYBitmap`, 1 = `XYPixmap`, 2 = `ZPixmap`).
    - `pixmap_depth`: 32-bit uint (1, 8, 16, 24, 32).
    - `pixmap_width` & `pixmap_height`: 32-bit uints.
    - `byte_order`: 32-bit uint (0 = `LSBFirst`, 1 = `MSBFirst`).
    - `bitmap_bit_order`: 32-bit uint (0 = `LSBFirst`, 1 = `MSBFirst`).
    - `bits_per_pixel`: 32-bit uint (1, 8, 16, 24, 32).
    - `bytes_per_line`: 32-bit uint scanline byte stride.
    - `visual_class`: 32-bit uint (0 = `StaticGray`, 1 = `GrayScale`, 2 = `StaticColor`, 3 = `PseudoColor`, 4 = `TrueColor`, 5 = `DirectColor`).
    - `red_mask`, `green_mask`, `blue_mask`: 32-bit uint bitmasks.
    - `ncolors`: 32-bit uint number of colormap entries.
    - Followed by null-terminated ASCII window title up to `header_size`.
  - **Color Map:** `ncolors` entries of 12-byte `XColor` structures (`pixel` uint32, `red` uint16, `green` uint16, `blue` uint16, `flags` uint8, `pad` uint8).
  - **Pixel Buffer:** Scanline stride alignment defined by `bytes_per_line`.
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary decoder. Reads 100-byte big-endian header, parses window title, unpacks 12-byte colormap entries, decodes 1-bit monochrome bitmaps (MSBFirst/LSBFirst bit ordering), 8-bit PseudoColor paletted graphics, 16-bit RGB, and 24/32-bit TrueColor/DirectColor bitplanes using bitmask shifts, and encodes directly into standard lossless 32-bit RGBA PNG.
- **Fidelity:** `LOSSLESS` (Pixel-perfect colormap lookups and channel bitmask preservation).
- **Status:** **Wave 23 Shipped (`image/xwd-to-png`)**.

---

### 65. OpenStreetMap XML Vector Map (`.osm`)

- **Ecosystem & Context:** OpenStreetMap (OSM) is the open, collaborative geographic database of the entire world. Raw vector extracts exported from openstreetmap.org or queried via the Overpass API are delivered in `.osm` XML format. Modern cartography libraries and GIS applications (Mapbox GL JS, Leaflet, OpenLayers, Kepler.gl, QGIS, Turf.js) require standard RFC 7946 GeoJSON.
- **Community Need & Reddit Signals:**
  - Subreddits: r/openstreetmap, r/gis, r/MapPorn, r/webdev, r/geography, r/QGIS.
  - Queries: *"Convert .osm to GeoJSON in browser"*, *"How to open OpenStreetMap XML export in Mapbox / Leaflet"*, *"Convert Overpass API OSM XML to GeoJSON without Python or osmtogeojson CLI"*, *"Convert OSM ways and multipolygons to GeoJSON online"*.
- **Forensic Structure:**
  - XML document with root `<osm version="0.6">`.
  - Topological primitives:
    - `<node id="..." lat="..." lon="...">`: Points with latitude, longitude, and tags.
    - `<way id="...">`: Sequence of `<nd ref="..."/>` node references.
    - `<relation id="...">`: Compound groupings with `<member type="..." ref="..." role="..."/>` (e.g. `type=multipolygon` for areas with inner cutout holes).
- **In-Browser Execution Strategy:**
  - Portable DOM-free XML streaming parser operating safely in Web Workers and Node. Maps nodes into coordinate lookups, synthesizes Points from tagged nodes, identifies closed polygon boundaries (buildings, landuse, parks) vs linear paths (highways, waterways, railways), groups multipolygon relations with outer rings and inner cutout holes, and serializes clean RFC 7946 GeoJSON FeatureCollections entirely in browser memory.
- **Fidelity:** `LOSSLESS` (Preserves all coordinates, geometry topology, and metadata tags).
- **Status:** **Wave 23 Shipped (`document/osm-to-geojson`)**.

---

### 66. Sony Direct Stream Digital Audio (`.dsf`)

- **Ecosystem & Context:** DSF (DSD Stream File) is Sony's audiophile audio container format for Direct Stream Digital (DSD) sound. Used on Super Audio CD (SACD) and high-resolution master audio releases, it stores sound using 1-bit pulse-density delta-sigma modulation at extreme sampling rates: DSD64 (2,822,400 Hz, 64x standard CD rate), DSD128 (5,644,800 Hz), and DSD256 (11,289,600 Hz). Standard DACs, consumer operating systems, media players, and web browsers cannot play raw 1-bit DSD files without specialized decimation to linear PCM.
- **Community Need & Reddit Signals:**
  - Subreddits: r/audiophile, r/headphones, r/audioengineering, r/foobar2000, r/lossless, r/vintagecomputing.
  - Queries: *"Convert DSF to WAV high quality online"*, *"Play Sony .dsf SACD audio on iPhone / Mac"*, *"Batch convert DSD .dsf to 24-bit PCM WAV"*, *"DSF converter free without cloud upload"*.
- **Forensic Byte Layout:**
  - **DSD Chunk (28 bytes):**
    - Magic: `'DSD '` (`0x44 0x53 0x44 0x20`).
    - Chunk size: 64-bit uint (28 bytes).
    - File size: 64-bit uint.
    - Metadata offset: 64-bit uint pointer to ID3v2 tag chunk.
  - **Format Chunk (52 bytes):**
    - Magic: `'fmt '` (`0x66 0x6d 0x74 0x20`).
    - Format version: 32-bit uint (1).
    - Channel count: 32-bit uint (1 = mono, 2 = stereo).
    - Sampling frequency: 32-bit uint (e.g. 2822400).
    - Bits per sample: 32-bit uint (1).
    - Block size per channel: 32-bit uint (typically 4096 bytes).
  - **Data Chunk:**
    - Magic: `'data'` (`0x64 0x61 0x74 0x61`).
    - Audio payload: Interleaved blocks of `blockSize` bytes per channel.
    - Bit ordering: LSB-first within each byte.
- **In-Browser Execution Strategy:**
  - High-performance 1-bit DSD audio parser and decimation engine. Demuxes multi-channel interleaved block streams, unpacks LSB-first 1-bit delta-sigma samples ($\pm 1$), applies a windowed Hann-weighted low-pass decimation filter to eliminate out-of-band high-frequency quantization noise, normalizes samples into 16-bit linear PCM at 44.1 kHz, and wraps them in a standard 44-byte RIFF WAVE container for universal playback.
- **Fidelity:** `STUDIO PCM DECIMATION` (High-fidelity Hann-filtered decimation with exact phase preservation).
- **Status:** **Wave 23 Shipped (`audio/dsf-to-wav`)**.

---

### 67. Flexible Image Transport System (`.fits`, `.fit`, `.fts`)

- **Ecosystem & Context:** FITS (Flexible Image Transport System) is the standard digital astronomical file format endorsed by the International Astronomical Union (IAU) and NASA. Used across astronomical observatories, space telescopes (Hubble Space Telescope, James Webb Space Telescope / JWST), planetary missions, and amateur astrophotography software (PixInsight, DeepSkyStacker, AstroPixelProcessor, Siril), it packages high-dynamic-range CCD/CMOS sensor captures, spectra, and multi-dimensional datacubes alongside 2880-byte metadata header blocks.
- **Community Need & Reddit Signals:**
  - Subreddits: r/astrophotography, r/telescopes, r/astronomy, r/space, r/webdev, r/nasa.
  - Queries: *"How to view FITS file on Mac without NASA software"*, *"Convert .fits to PNG online fast"*, *"Convert JWST / Hubble .fits image to high-res PNG in browser"*, *"Batch convert astrophotography FITS to PNG without PixInsight"*.
- **Forensic Byte Layout:**
  - **Header Structure (2880-byte blocks of 80-byte ASCII card images):**
    - Key cards: `SIMPLE  = T`, `BITPIX  = [8, 16, 32, 64, -32, -64]`, `NAXIS   = [1..N]`, `NAXIS1`, `NAXIS2`, `NAXIS3`, `BSCALE`, `BZERO`, `END`.
    - Astronomical metadata: `OBJECT`, `TELESCOP`, `INSTRUME`, `DATE-OBS`, `EXPTIME`, `FILTER`.
  - **Data Matrix:**
    - High-dynamic-range big-endian raw binary data (unsigned 8-bit, signed 16/32/64-bit integer, single/double precision IEEE 754 float).
    - Coordinate origin: (1,1) is bottom-left (inverted vertically compared to standard display raster rasterization).
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary decoder and auto-stretcher. Parses 2880-byte card images, extracts physical values using `BZERO + BSCALE * raw`, samples pixel distributions for percentile contrast auto-stretching (or asinh/log astronomical stretching) to reveal faint deep-sky nebulae and stellar details, corrects astronomical vertical scanline orientation, and synthesizes 32-bit RGBA PNG client-side.
- **Fidelity:** `ASTRONOMICAL AUTO-STRETCH` (Contrast-optimized percentile mapping with physical scaling).
- **Status:** **Wave 24 Shipped (`image/fits-to-png`)**.

---

### 68. Geography Markup Language (`.gml`)

- **Ecosystem & Context:** GML (Geography Markup Language) is the OGC and ISO (ISO 19136:2007) XML grammar for expressing spatial features. It is the mandated standard for European Union INSPIRE spatial data infrastructure, UK Ordnance Survey OS MasterMap, US Geological Survey (USGS) hydrography data, and international cadastral agencies. Modern web map libraries (Leaflet, Mapbox GL JS, OpenLayers) and front-end developers cannot render GML without complex server-side GIS pipelines like GDAL/OGR.
- **Community Need & Reddit Signals:**
  - Subreddits: r/gis, r/MapPorn, r/webdev, r/QGIS, r/geography, r/openstreetmap.
  - Queries: *"Convert GML to GeoJSON online"*, *"Open Ordnance Survey .gml file in Leaflet / Mapbox"*, *"Convert INSPIRE GML to GeoJSON without Python or ogr2ogr"*, *"Convert GML polygons with holes to GeoJSON"*.
- **Forensic Structure:**
  - XML document conforming to GML 2.x (`<gml:coordinates>`) or GML 3.x (`<gml:pos>`, `<gml:posList>`).
  - Spatial primitives: Point, LineString, Polygon (exterior boundaries and interior cutout holes), MultiPoint, MultiLineString, and MultiPolygon.
  - Feature containers: `<gml:featureMember>`, `<gml:featureMembers>`, `<wfs:member>`.
  - Coordinate reference system: `srsName="EPSG:4326"` or URNs.
- **In-Browser Execution Strategy:**
  - High-performance DOM-free XML streaming parser. Extracts geometry coordinates, groups polygon boundaries and hole rings, parses sibling XML property fields into clean JSON attributes (with namespace prefix stripping), auto-detects EPSG:4326 Lat/Lon axis ordering, and synthesizes standard RFC 7946 GeoJSON FeatureCollections in browser memory.
- **Fidelity:** `LOSSLESS` (Full topological coordinate preservation and attribute mapping).
- **Status:** **Wave 24 Shipped (`document/gml-to-geojson`)**.

---

### 69. Amiga ProTracker / SoundTracker Audio Module (`.mod`)

- **Ecosystem & Context:** The `.mod` format is the grandfather of all digital tracker music. Originated by Karsten Obarski in 1987 on the Commodore Amiga for Ultimate SoundTracker and standardized by ProTracker and NoiseTracker, it dominated the 1990s demoscene, Amiga games, and tracker communities (The Mod Archive). It embeds 8-bit PCM audio samples, pattern order tables, and 64-row note events targeting the Amiga's hardware Paula sound chip.
- **Community Need & Reddit Signals:**
  - Subreddits: r/amiga, r/chiptunes, r/demoscene, r/vintagecomputing, r/retrocomputing, r/audiophile.
  - Queries: *"Convert .mod to WAV in browser"*, *"Play old Amiga ProTracker music on iPhone / modern PC"*, *"Convert ProTracker M.K. to WAV without installing OpenMPT or XMPlay"*, *"Amiga Paula chip sound emulator in browser"*.
- **Forensic Byte Layout:**
  - **1084-byte Song Header:**
    - 0..19: Song title (ASCII).
    - 20..949: 31 instrument sample headers (22-byte name, length in words, finetune, volume 0..64, loop offset & length).
    - 950..951: Song length (1..128) and restart position.
    - 952..1079: Pattern order table.
    - 1080..1083: Format signature (`M.K.`, `M!K!`, `FLT4`, `4CHN`, etc.).
  - **Pattern Data (starts at 1084):**
    - 64 rows per pattern, 4 channels per row, 4 bytes per note (sample number, 12-bit Amiga period, effect code, effect parameter).
  - **Sample PCM:**
    - Sequence of 8-bit signed PCM audio buffers (-128..127).
- **In-Browser Execution Strategy:**
  - Accurate software emulation of the Amiga Paula sound chip running in pure TypeScript. Calculates period-to-frequency pitches using the Amiga PAL clock (3,546,895 Hz), executes hardware playback effects (Arpeggio, Portamento, Volume, BPM/Speed tempo ticks), loops sample waveforms, applies natural stereo channel spatialization, and synthesizes 16-bit 44.1 kHz stereo PCM into a universal RIFF WAV audio file.
- **Fidelity:** `AUTHENTIC AMIGA SYNTHESIS` (Accurate period pitch conversion, Paula clock frequency scaling, and sample loop recreation).
- **Status:** **Wave 24 Shipped (`audio/mod-to-wav`)**.

---

### 70. WebVTT Caption & Subtitle Track (`.vtt`)

- **Ecosystem & Context:** WebVTT (Web Video Text Tracks) is the W3C standard format for HTML5 video subtitles, captions, and chapter navigation (`<track kind="subtitles">`). Ubiquitous across streaming video services (YouTube, Vimeo, Netflix, HLS/DASH pipelines), web video players (Video.js, Plyr), and modern browsers. However, major professional NLE video editing suites (Adobe Premiere Pro, DaVinci Resolve, Final Cut Pro), offline media players (VLC, MPC-HC), and hardware TVs/players strictly mandate SubRip `.srt`.
- **Community Need & Reddit Signals:**
  - Subreddits: r/editors, r/premiere, r/davinciresolve, r/VideoEditing, r/webdev, r/vlc.
  - Queries: *"Convert WebVTT to SRT online fast without upload"*, *"How to import .vtt captions into Premiere Pro or DaVinci Resolve"*, *"Remove cue settings and style tags from VTT to clean SRT"*, *"Convert YouTube/Vimeo VTT to SRT in browser"*.
- **Forensic Structure:**
  - Starts with mandatory `WEBVTT` signature, followed by optional header commentary, `NOTE` blocks, or `STYLE` blocks.
  - Cue blocks consist of:
    - Optional identifier/name line.
    - Timing line with format `[HH:]MM:SS.mmm --> [HH:]MM:SS.mmm` and optional CSS positioning settings (e.g. `position:50% line:0 align:center`).
    - Multi-line subtitle payload containing HTML formatting tags (`<b>`, `<i>`, `<u>`, `<v Voice>`, `<c.color>`, ruby tags, timestamp tags).
  - WebVTT vs SRT Differences:
    - WebVTT uses periods for millisecond delimiters (`.` vs `,` in SRT).
    - WebVTT allows omitting the hours component (`MM:SS.mmm` vs mandatory `00:MM:SS,mmm` in SRT).
    - WebVTT includes cue positioning attributes and `<v Voice>` tags which break standard SRT parsers.
- **In-Browser Execution Strategy:**
  - Pure TypeScript streaming subtitle parser and normalizer. Validates `WEBVTT` signature, skips non-cue blocks (`NOTE`, `STYLE`), parses millisecond timestamps with automatic two-digit hour expansion, strips positioning attributes, converts voice tags into standard speaker prefixes (e.g., `<v Bob>Hi` -> `Bob: Hi`), strips unsupported HTML styling, preserves standard `<i>`/`<b>`/`<u>` tags, generates 1-based sequential cue numbers, and serializes clean RFC-compliant SubRip SRT with comma millisecond separators.
- **Fidelity:** `LOSSLESS TIMING & CLEAN SUBTITLES` (Exact millisecond precision, sequential cue indexing, and clean SRT formatting).
- **Status:** **Wave 25 Shipped (`document/vtt-to-srt`)**.

---

### 71. Gzip Compressed Scalable Vector Graphics (`.svgz`)

- **Ecosystem & Context:** SVGZ is the RFC 1952 gzip-compressed container for Scalable Vector Graphics (SVG). Standardized by the W3C to dramatically reduce network transfer sizes for complex vector illustrations, technical drawings, CAD floor plans, and GIS map charts (Inkscape, Illustrator, CorelDRAW). However, when opening local files or uploading assets into design tools (Figma, Canva, Sketch, Affinity Designer) and web components that do not perform automated decompression, `.svgz` files cannot be previewed, edited, or embedded.
- **Community Need & Reddit Signals:**
  - Subreddits: r/graphic_design, r/Inkscape, r/AdobeIllustrator, r/webdev, r/FigmaDesign.
  - Queries: *"How to open .svgz file in Figma or Illustrator"*, *"Convert SVGZ to SVG online free"*, *"Batch decompress .svgz to .svg without terminal"*, *"SVGZ to normal SVG converter no upload"*.
- **Forensic Byte Layout:**
  - **RFC 1952 Gzip Container:**
    - 0..1: Magic `0x1F 0x8B`.
    - 2: Compression method (8 = deflate).
    - 3: Header flags (FTEXT, FHCRC, FEXTRA, FNAME, FCOMMENT).
    - 4..7: MTIME timestamp (32-bit uint little-endian).
    - 8: Extra flags (2 = max compression, 4 = fastest).
    - 9: OS type (0 = FAT, 3 = Unix, 7 = Macintosh, 255 = unknown).
    - Variable-length optional header fields (extra subfields, zero-terminated original filename, commentary).
    - Deflate compressed data blocks.
    - 8-byte trailer: 32-bit CRC-32 checksum and 32-bit uncompressed size modulo $2^{32}$.
  - **Decompressed Payload:**
    - UTF-8 XML document with root `<svg ...>` namespace.
- **In-Browser Execution Strategy:**
  - Client-side decompression engine executing entirely in browser memory. Verifies Gzip magic numbers, handles optional gzip header fields (skipping original filenames and comments), decompresses the raw deflate bitstream using `fflate`, validates that the decompressed payload is valid SVG XML, and serializes clean, uncompressed UTF-8 `.svg` markup ready for instant editing or web publishing.
- **Fidelity:** `LOSSLESS` (Bit-for-bit decompressed XML document with zero vector precision loss).
- **Status:** **Wave 25 Shipped (`image/svgz-to-svg`)**.

---

### 72. Apple Core Audio Format (`.caf`)

- **Ecosystem & Context:** CAF (Core Audio Format) is Apple's high-capacity 64-bit audio container format introduced in Mac OS X 10.4 and iOS. Engineered by Apple to overcome the legacy 4GB file size limit of 32-bit RIFF WAV and AIFF files, it is the primary recording format for Apple Logic Pro, GarageBand, Final Cut Pro, iPhone Voice Memos, and iOS Core Audio frameworks. CAF allows continuous recording for years without file size limits. However, outside Apple's ecosystem (Windows, Android, Linux, ChromeOS, and standard web browsers), `.caf` audio files cannot be played or edited natively without conversion.
- **Community Need & Reddit Signals:**
  - Subreddits: r/apple, r/Logic_Studio, r/audioengineering, r/iOS, r/GarageBand, r/podcasting.
  - Queries: *"Convert Apple CAF audio to WAV online"*, *"How to play .caf voice memo on Windows / Android"*, *"Logic Pro CAF loops to WAV converter"*, *"Convert 64-bit CAF to standard 16/24-bit WAV without iTunes or QuickTime"*.
- **Forensic Byte Layout:**
  - **File Header (8 bytes):**
    - 0..3: Magic `'caff'` (`0x63 0x61 0x66 0x66`).
    - 4..5: File version (uint16, typically 1).
    - 6..7: File flags (uint16, 0).
  - **Chunk Header (12 bytes each, big-endian):**
    - 0..3: Chunk type (ASCII 4-character code).
    - 4..11: Chunk size (int64 big-endian). A size of `-1` indicates that the chunk extends to the end of the file.
  - **Mandatory 'desc' Chunk (Audio Description, 32 bytes payload):**
    - Sample rate: 64-bit float IEEE 754 (e.g. 44100.0, 48000.0).
    - Format ID: 4-byte char code (e.g. `'lpcm'`).
    - Format flags: uint32 (bit 0 = isFloat, bit 1 = isLittleEndian).
    - Bytes per packet, frames per packet, channels per frame, bits per channel.
  - **'data' Chunk (Audio Data):**
    - 0..3: Edit count (uint32).
    - 4..N: Interleaved linear PCM audio data packets.
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary audio parser and transcoder. Decodes 64-bit CAF chunk headers, handles `-1` indefinite length chunks, reads IEEE 754 floating-point sample rates, parses 16-bit, 24-bit, and 32-bit integer PCM as well as 32-bit IEEE float PCM (both big-endian and little-endian), normalizes audio into standard 16-bit or 24-bit linear PCM, and wraps it into a standard RIFF WAVE container for universal playback across all operating systems and devices.
- **Fidelity:** `LOSSLESS PCM` (Exact sample unpacking without transcoding compression).
- **Status:** **Wave 25 Shipped (`audio/caf-to-wav`)**.

---

### 73. Netpbm Portable Anymap Graphics Suite (`.ppm`, `.pgm`, `.pbm`, `.pnm`, `.pam`)

- **Ecosystem & Context:** Jef Poskanzer's Netpbm graphic formats (PBM monochrome, PGM grayscale, PPM 24-bit RGB, PNM anymap, and PAM arbitrary tuple maps) have served as the foundational raster graphic exchange format across Unix and POSIX operating systems since 1988. They are ubiquitous in computer vision pipelines, image processing courses, scientific simulations, ray tracing benchmarks, and embedded vision systems due to their minimalist header structure and lack of proprietary patents. However, modern web browsers, office suites, and design tools cannot render `.ppm`, `.pgm`, `.pbm`, or `.pnm` files natively.
- **Community Need & Reddit Signals:**
  - Subreddits: r/unixporn, r/computervision, r/graphics, r/embedded, r/cpp, r/linux.
  - Queries: *"How to open .ppm files on Windows / Mac without installing GIMP"*, *"Convert PGM grayscale depth maps to PNG in browser"*, *"PBM monochrome scan to PNG"*, *"Netpbm P1-P7 image viewer and converter"*.
- **Forensic Byte Layout:**
  - **Magic Number (ASCII 2 bytes):**
    - `P1`: Plain ASCII Portable Bitmap (1-bit monochrome, 0 = white, 1 = black).
    - `P2`: Plain ASCII Portable Graymap (grayscale integers 0..maxval).
    - `P3`: Plain ASCII Portable Pixmap (RGB triplets in ASCII decimal).
    - `P4`: Raw Binary Portable Bitmap (packed 1-bit raster, MSB first).
    - `P5`: Raw Binary Portable Graymap (8-bit or 16-bit binary gray bytes).
    - `P6`: Raw Binary Portable Pixmap (24-bit binary RGB triplets or 48-bit 16-bit/channel).
    - `P7`: PAM (Portable Arbitrary Map) multi-channel tuple layout (WIDTH, HEIGHT, DEPTH, MAXVAL, TUPLTYPE).
  - **Header Structure:**
    - Magic number followed by whitespace.
    - Optional comments initiated by `#` extending to end of line.
    - Width and Height dimensions in decimal ASCII.
    - Maximum sample value (`maxval`, 1..65535, omitted for P1/P4).
    - Exactly one whitespace delimiter separating header from binary payload (for P4, P5, P6).
- **In-Browser Execution Strategy:**
  - Client-side parser implemented in pure TypeScript. Tokenizes both ASCII text formats (P1, P2, P3) and high-speed binary formats (P4, P5, P6, P7), handles comment stripping (`# ...`), dynamic channel depth scaling (16-bit to 8-bit dynamic range downsampling), packed bit alignment (P4), and synthesizes standard lossless 32-bit RGBA PNG output directly in browser memory without server hops.
- **Fidelity:** `LOSSLESS` (Direct pixel mapping with 100% colorimetric accuracy).
- **Status:** **Wave 26 Shipped (`image/ppm-to-png`)**.

---

### 74. Comic Book ZIP Archive (`.cbz`)

- **Ecosystem & Context:** CBZ (Comic Book ZIP) is the global de facto standard container format for digitized comic books, manga chapters, and graphic novels. Originally popularized by CDisplay, it packages high-resolution comic page scans (JPEG, PNG, WebP) along with optional XML metadata (`ComicInfo.xml`) inside an unencrypted PKZIP archive. While desktop and mobile comic readers (Tachiyomi, CDisplay Ex, YACReader, Mihon) handle CBZ natively, e-readers (Kindle, Kobo, reMarkable), cloud storage viewers, and standard office/PDF readers require bound PDF documents to view chapters sequentially.
- **Community Need & Reddit Signals:**
  - Subreddits: r/comicbooks, r/manga, r/kindle, r/ereader, r/Tachiyomi, r/Calibre.
  - Queries: *"Convert CBZ manga to PDF for Kindle"*, *"How to convert .cbz to PDF without Calibre"*, *"Read comic book CBZ on iPad Apple Books"*, *"Batch convert comic archives to PDF online privately"*.
- **Forensic Byte Layout:**
  - Standard PKZIP archive structure (`PK\x03\x04` local file headers, `PK\x01\x02` central directory records).
  - Contains image files named numerically or alphabetically (e.g. `001.jpg`, `page_02.png`, `ch01_p10.webp`).
  - May contain thumbnail caches (`__MACOSX`, `.DS_Store`, `Thumbs.db`) and `ComicInfo.xml` metadata.
- **In-Browser Execution Strategy:**
  - In-browser archive decompressor using `fflate`. Filters out OS artifact files and non-image metadata, sorts page filenames using natural alphanumeric collation (`naturalSort`, ensuring `page_2` precedes `page_10`), embeds image streams into a sequentially bound vector PDF using `pdf-lib`, matching each PDF page's aspect ratio and dimensions precisely to the source scan, and outputs a publication-quality PDF ready for instant reading on any device.
- **Fidelity:** `LOSSLESS` (Images embedded directly with original resolution and pixel dimensions).
- **Status:** **Wave 26 Shipped (`document/cbz-to-pdf`)**.

---

### 75. SubRip Subtitle Format (`.srt`)

- **Ecosystem & Context:** SubRip (`.srt`) is the world's most ubiquitous subtitle and closed-caption format for movies, television shows, and offline video players (VLC, MPV, Plex, Kodi). However, modern web standards (HTML5 `<video><track>`, YouTube captions, Vimeo, Video.js, Coursera, Canvas) strictly require WebVTT (`.vtt`, Web Video Text Tracks) as defined by the W3C. Web browsers reject raw `.srt` files inside HTML5 `<track>` elements, forcing video creators, educators, and web developers to convert their subtitle libraries into WebVTT.
- **Community Need & Reddit Signals:**
  - Subreddits: r/webdev, r/videography, r/premiere, r/editors, r/accessibility.
  - Queries: *"Convert SRT to VTT for HTML5 video track"*, *"How to upload subtitles to YouTube SRT to WebVTT"*, *"Free online SRT to VTT converter without watermark or upload limit"*, *"Batch convert SRT to VTT with millisecond accuracy"*.
- **Forensic Byte Layout:**
  - Plain UTF-8 text with optional BOM (`\uFEFF`).
  - Sequential numeric index block (`1`, `2`, ...).
  - Timing line with comma millisecond separators: `00:01:23,456 --> 00:01:27,890`.
  - Multi-line subtitle cue payload.
  - Double newline (`\n\n`) cue boundary separation.
- **In-Browser Execution Strategy:**
  - Client-side subtitle parser and W3C WebVTT synthesizer. Strips UTF-8 BOM, parses SRT cue blocks even with malformed or omitted index numbers, converts comma millisecond timestamps (`00:01:23,456`) into standard dot timestamps (`00:01:23.456`), strips deprecated HTML styling tags (`<font color="...">`) while preserving standard semantic tags (`<b>`, `<i>`, `<u>`), prepends the mandatory `WEBVTT` header, and serializes clean, compliant `.vtt` captions ready for web publishing.
- **Fidelity:** `LOSSLESS` (Exact millisecond sync preservation).
- **Status:** **Wave 26 Shipped (`document/srt-to-vtt`)**.

---

### 76. Microsoft Windows Icon & Favicon (`.ico`)

- **Ecosystem & Context:** ICO is the native icon file format for Microsoft Windows and the legacy web favicon standard. An ICO file functions as a multi-resolution container housing one or more icon frames at varying dimensions (16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256) and color depths (1-bit monochrome, 4-bit/8-bit indexed palette, 24-bit RGB, 32-bit RGBA BMP/DIB, or embedded raw PNG compressed streams). Modern web design workflows, app stores, vector editors, and operating systems require standard, unencapsulated 32-bit RGBA PNG files.
- **Community Need & Reddit Signals:**
  - Subreddits: r/webdev, r/frontend, r/graphic_design, r/Windows10, r/web_design, r/icon_design.
  - Queries: *"Convert ICO to PNG high resolution"*, *"Extract favicon.ico to transparent PNG"*, *"Convert multi-size ICO to PNG online"*, *"Batch extract Windows .ico files without server upload"*.
- **Forensic Byte Layout:**
  - **6-byte ICONDIR Header (Little-Endian):**
    - `0..1`: Reserved (`0x00 0x00`).
    - `2..3`: Resource Type (`1` for ICO, `2` for CUR cursor).
    - `4..5`: Image Count ($N$ entries in directory).
  - **16-byte ICONDIRENTRY Directory per Image:**
    - `0`: Width (uint8, `0` represents 256px).
    - `1`: Height (uint8, `0` represents 256px).
    - `2`: Color count (uint8, `0` if $\ge 256$ colors).
    - `3`: Reserved (`0`).
    - `4..5`: Color planes (uint16).
    - `6..7`: Bits per pixel (uint16, e.g. 1, 4, 8, 24, 32).
    - `8..11`: Bytes in resource (uint32).
    - `12..15`: Image data offset in file (uint32).
  - **Image Payloads:**
    - **PNG Stream:** Starts with PNG signature `89 50 4E 47 0D 0A 1A 0A`.
    - **Windows DIB (Device Independent Bitmap):** Starts with `BITMAPINFOHEADER` (40 bytes), followed by optional color table, bottom-up XOR color bitmap raster, and 1-bit AND transparency mask bitmap raster.
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary decoder. Reads directory entries, scores and ranks frames based on resolution, color depth, and user preference (`preferredSize`), extracts raw embedded PNG streams directly without re-encoding loss, or unpacks bottom-up DIB rasters (handling 1, 4, 8-bit paletted, 24-bit BGR, and 32-bit BGRA) while applying the 1-bit AND mask to synthesize true 8-bit alpha channels, and encodes into lossless 32-bit RGBA PNG.
- **Fidelity:** `LOSSLESS` (Bit-exact frame extraction or pixel-perfect DIB mask reconstruction).
- **Status:** **Wave 27 Shipped (`image/ico-to-png`)**.

---

### 77. EPUB Electronic Publication E-Book (`.epub`)

- **Ecosystem & Context:** EPUB is the official open standard e-book format maintained by the W3C (formerly IDPF). Built upon XML, XHTML, CSS, and package manifests bundled inside an unencrypted ZIP container, EPUB powers millions of commercial and public domain titles across Apple Books, Kobo, and Google Play Books. In recent years, Personal Knowledge Management (PKM) tools (Obsidian, Notion, Logseq, Roam Research) and technical writers have created huge demand for converting EPUB chapters directly into clean, formatted Markdown (`.md`) with YAML frontmatter for note-taking and knowledge graph ingestion.
- **Community Need & Reddit Signals:**
  - Subreddits: r/ObsidianMD, r/ereader, r/markdown, r/Notion, r/Calibre, r/PKMS, r/writing.
  - Queries: *"Convert EPUB to Markdown with frontmatter"*, *"Batch convert e-books to Obsidian notes"*, *"Extract chapters from EPUB to markdown online free"*, *"Read EPUB notes in Logseq"*.
- **Forensic Structure:**
  - Standard PKZIP archive structure.
  - `mimetype`: Uncompressed file containing `application/epub+zip`.
  - `META-INF/container.xml`: XML descriptor pointing to OPF package root file via `full-path` attribute.
  - `.opf` Package Document: Contains `<metadata>` (Dublin Core `dc:title`, `dc:creator`, `dc:language`, `dc:description`, `dc:date`, `dc:publisher`), `<manifest>` (mapping item IDs to file paths and MIME types), and `<spine>` (defining exact reading order via `<itemref idref="...">`).
  - XHTML Content Documents: Sequential chapters, appendices, and front matter containing formatted markup.
- **In-Browser Execution Strategy:**
  - Zero-server archive decompression using pure-JS `fflate`. Locates and parses `container.xml`, extracts metadata and spine reading order from the OPF package, converts XHTML tags (`<h1>`-`<h6>`, `<p>`, `<strong>`, `<em>`, `<a>`, `<ul>`/`<ol>`, `<blockquote>`, `<pre><code>`) into semantic Markdown using word-boundary bounded regex transformations, decodes HTML entities, generates clean YAML frontmatter metadata, and sequentially stitches chapters with clean horizontal dividers into a single publication-ready Markdown file.
- **Fidelity:** `HIGH-FIDELITY SEMANTIC MARKDOWN` (Preserves complete structural hierarchy, headings, links, formatting, and book metadata).
- **Status:** **Wave 27 Shipped (`document/epub-to-markdown`)**.

---

### 78. Commodore Amiga IFF 8SVX Audio (`.8svx`, `.iff`)

- **Ecosystem & Context:** 8SVX (8-Bit Sampled Voice) is the pioneering digital audio interchange format created in 1985 by Electronic Arts and Commodore-Amiga under the EA IFF 85 standard. It served as the primary digital audio format for the Commodore Amiga personal computer, tracker music software (ProTracker, SoundTracker, OctaMED), and hundreds of iconic 1980s and 1990s retro games (Lemmings, Shadow of the Beast, Worms, Sensible Soccer, Speedball 2). Modern audio editing workstations (DAWs), mobile devices, and browsers cannot open or play 8SVX files, particularly those employing Amiga's proprietary Fibonacci-delta waveform compression.
- **Community Need & Reddit Signals:**
  - Subreddits: r/amiga, r/retrocomputing, r/chiptunes, r/synthesizers, r/audioengineering, r/demoscene.
  - Queries: *"Convert Amiga .8svx audio to WAV"*, *"Play IFF 8SVX samples in Ableton / FL Studio"*, *"Fibonacci delta decompression in browser"*, *"Extract retro Amiga sound effects to WAV"*.
- **Forensic Byte Layout:**
  - **EA IFF 85 FORM Container:**
    - `0..3`: Container ID `'FORM'` (`0x46 0x4F 0x52 0x4D`).
    - `4..7`: Total form length (uint32 big-endian).
    - `8..11`: Subtype `'8SVX'` (`0x38 0x53 0x56 0x58`).
  - **Chunk Headers (8 bytes each, big-endian):**
    - `0..3`: Chunk 4-character ID.
    - `4..7`: Chunk size (uint32 big-endian, padded to even 2-byte boundary).
  - **Mandatory 'VHDR' Chunk (Voice8Header, 20 bytes):**
    - `oneShotHiSamples` (uint32), `repeatHiSamples` (uint32), `samplesPerHiCycle` (uint32).
    - `samplesPerSec` (uint16 sample rate in Hz).
    - `ctOctave` (uint8 octave count).
    - `sCompression` (uint8: `0` = uncompressed linear 8-bit PCM, `1` = 4-bit Fibonacci-delta compression).
    - `volume` (uint32 fixed-point amplitude).
  - **Optional Metadata Chunks:**
    - `'NAME'`: Sample name (ASCII).
    - `'AUTH'`: Author / composer (ASCII).
    - `'ANNO'`: Annotation remarks (ASCII).
  - **Mandatory 'BODY' Chunk:**
    - Raw 8-bit signed sample stream (range -128..127) or packed 4-bit nibble Fibonacci delta stream.
- **In-Browser Execution Strategy:**
  - Pure client-side binary parser and decompressor in TypeScript. Traverses IFF chunks, decodes `'VHDR'` configuration, handles linear 8-bit signed PCM, and implements the authentic Amiga 16-step Fibonacci delta lookup table algorithm:
    $$\Delta = [-34, -21, -13, -8, -5, -3, -2, -1, 0, 1, 2, 3, 5, 8, 13, 21]$$
    Accumulates 8-bit sample amplitudes with saturation clamping (-128..127), scales samples to standard 16-bit linear PCM ($x \times 256$), and synthesizes a clean 44-byte RIFF WAVE file playable across all modern OSes and browsers.
- **Fidelity:** `LOSSLESS PCM` (Bit-exact sample reconstruction from Amiga linear PCM and Fibonacci delta bitstreams).
- **Status:** **Wave 27 Shipped (`audio/8svx-to-wav`)**.

---

### 79. Sony PlayStation 1 TIM Texture & Sprite Image (`.tim`)

- **Ecosystem & Context:** The TIM format is Sony's proprietary raster graphics container for the PlayStation 1 (PSX). Engineered specifically for the original PlayStation GPU framebuffer, it encodes 4-bit (16-color) or 8-bit (256-color) indexed palettes (CLUT) or 15-bit (RGB555) and 24-bit (RGB888) direct color textures. It powers texture maps, character portraits, font glyphs, and UI elements across hundreds of legendary PS1 games (Final Fantasy VII, Metal Gear Solid, Resident Evil, Gran Turismo, Silent Hill, Tekken, Crash Bandicoot). Modern image viewers and 3D modeling tools cannot open TIM files natively.
- **Community Need & Reddit Signals:**
  - Subreddits: r/psx, r/emulation, r/modding, r/gamedev, r/retrogaming, romhacking.net.
  - Queries: *"Convert PS1 TIM to PNG online"*, *"Extract textures from PlayStation .tim file"*, *"View PSX TIM sprites in browser"*, *"PlayStation TIM converter with transparency"*.
- **Forensic Byte Layout:**
  - **4-byte Magic ID:** `0x10 0x00 0x00 0x00` (Version 0 TIM).
  - **4-byte Flag (uint32 LE):**
    - Bits 0..2 (PMODE): `0` = 4-bit CLUT, `1` = 8-bit CLUT, `2` = 15-bit Direct RGB555, `3` = 24-bit Direct RGB888, `4` = Mixed.
    - Bit 3 (CF): `1` = CLUT present, `0` = No CLUT.
  - **CLUT Block (if present):**
    - Length (uint32 LE, total bytes in CLUT chunk including header).
    - VRAM Framebuffer X, Y, Width (colors per palette), Height (number of palettes).
    - $W \times H$ 16-bit RGB555 color words: Bit 15 STP (Semi-Transparency Processing), Bits 10..14 Blue, Bits 5..9 Green, Bits 0..4 Red.
  - **Image Data Block:**
    - Length (uint32 LE, total bytes in image chunk including header).
    - VRAM Framebuffer X, Y, Width (in 16-bit words), Height (in scanlines).
    - Raw pixel nibbles (4-bit), bytes (8-bit), or words (15-bit/24-bit).
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary parser. Interprets CLUT palettes, maps 5-bit RGB to 8-bit color, applies PlayStation GPU STP transparency logic (black with STP=0 is transparent), unpacks packed 4-bit nibbles and 8-bit indices, and compiles a lossless 32-bit RGBA PNG.
- **Fidelity:** `LOSSLESS` (Exact pixel-accurate reproduction of PlayStation GPU textures).
- **Status:** **Wave 28 Shipped (`image/tim-to-png`)**.

---

### 80. Microsoft Rich Text Format Document (`.rtf`)

- **Ecosystem & Context:** RTF is Microsoft's legacy cross-platform document interchange standard. With Microsoft officially deprecating and removing WordPad from Windows 11 (24H2), millions of users, researchers, legal professionals, and software developers find themselves with legacy `.rtf` notes and documents that need migration into modern plain-text formats like Markdown for personal knowledge management (Obsidian, Notion, Logseq).
- **Community Need & Reddit Signals:**
  - Subreddits: r/windows, r/mac, r/ObsidianMD, r/sysadmin, r/Notion, r/productivity.
  - Queries: *"Convert RTF to Markdown free online"*, *"Batch convert old WordPad .rtf notes to Markdown"*, *"Open RTF without WordPad on Windows 11"*, *"RTF to clean markdown with headings and lists"*.
- **Forensic Structure:**
  - 7-bit ASCII control word syntax with group nesting `{ ... }`.
  - Document headers: `\rtf1`, `\fonttbl`, `\colortbl`, `\info`.
  - Inline styling: `\b` (bold), `\i` (italic), `\strike` (strikethrough), `\fsN` (font size), `\par` (paragraph break), `\bullet` (list item).
  - Unicode character escapes: `\uN?` (where $N$ is 16-bit codepoint).
- **In-Browser Execution Strategy:**
  - Pure TypeScript lexer and state stack. Tracks active groups, skips non-content destination groups, decodes Unicode codepoints and special punctuation (`\emdash`, `\ldblquote`, `\bullet`), transforms inline styling into Markdown formatting, extracts document metadata into YAML frontmatter, and normalizes spacing.
- **Fidelity:** `HIGH-FIDELITY SEMANTIC MARKDOWN` (Preserves structural headings, emphasis, lists, and metadata).
- **Status:** **Wave 28 Shipped (`document/rtf-to-markdown`)**.

---

### 81. Nintendo GameCube & Wii DSP ADPCM Audio (`.dsp`)

- **Ecosystem & Context:** DSP is the primary compressed audio container format utilized across Nintendo GameCube and Wii titles (Super Smash Bros Melee, Mario Kart Double Dash, The Legend of Zelda: Twilight Princess, Metroid Prime, Super Mario Sunshine). It encodes 4-bit ADPCM audio with custom 16-bit linear prediction filter coefficients tailored to Nintendo's hardware DSP. Modern media players and DAWs cannot natively play DSP files.
- **Community Need & Reddit Signals:**
  - Subreddits: r/Gamecube, r/DolphinEmulator, r/smashbros, r/WiiHacks, r/audioengineering, r/sounddesign.
  - Queries: *"Convert GameCube .dsp to WAV"*, *"Play Super Smash Bros Melee .dsp audio in browser"*, *"Extract Wii sound effects to WAV"*, *"Nintendo DSP ADPCM decoder online"*.
- **Forensic Byte Layout:**
  - **96-byte Big-Endian Header:**
    - Total samples (uint32 BE), sample rate (uint32 BE, typically 32000 or 44100 Hz), loop flag (uint16 BE).
    - 16 signed 16-bit predictor coefficients (`coef[0..15]`, 8 prediction pairs).
    - Initial history samples (`hist1`, `hist2`).
  - **Audio Data Frames (starts at byte offset 96):**
    - 8-byte frames (16 nibbles per frame).
    - Byte 0: Predictor index (high nibble $P \in [0, 7]$) and scale factor (low nibble $S \in [0, 15]$).
    - Bytes 1-7: 14 signed 4-bit delta sample nibbles (range -8..7).
- **In-Browser Execution Strategy:**
  - Pure TypeScript audio parser and DSP decompressor. Parses big-endian coefficients, applies Nintendo's 2-pole linear prediction filter, decodes 4-bit ADPCM nibbles across 8-byte frames, accumulates and clamps 16-bit audio samples, and wraps the output in a clean 44-byte standard RIFF WAVE container for universal playback.
  - Fidelity: `LOSSLESS PCM` (Sample-exact reconstruction of Nintendo DSP ADPCM waveforms).
  - Status: **Wave 28 Shipped (`audio/dsp-to-wav`)**.

---

### 82. Apple Macintosh MacPaint 1-Bit Graphics (`.mac`, `.pntg`, `.macp`)

- **Ecosystem & Context:** MacPaint was written by Bill Atkinson in 1984 for the original 128K Apple Macintosh and defined early desktop computer graphics. Saved as a fixed 576×576 pixel monochrome canvas (72 DPI, exactly 8×8 inches at Mac display resolution), MacPaint used Atkinson's byte-oriented PackBits run-length encoding (RLE) algorithm to compress scanlines. Vintage digital art, early computer iconography, historical Mac archives, and hypercard assets are preserved in MacPaint format, but modern operating systems, browsers, and image editing suites cannot open `.mac` or `.pntg` files natively.
- **Community Need & Reddit Signals:**
  - Subreddits: r/VintageApple, r/retrocomputing, r/pixelart, r/digitalart, r/mac, r/apple.
  - Queries: *"How to open .pntg or .mac files on modern Mac/Windows"*, *"Convert 1984 MacPaint files to PNG"*, *"View Bill Atkinson MacPaint artwork in browser"*, *"Extract MacPaint PackBits to transparent PNG"*.
- **Forensic Byte Layout:**
  - **Optional 512-byte MacBinary / MacPaint Header:**
    - Version number (uint32 big-endian, typically `2` for MacPaint version 2).
    - 38 patterns (8 bytes each = 304 bytes of brush/texture patterns).
    - 204 bytes of reserved/padding zeros.
    - If header is absent (pure stream), data starts directly with PackBits RLE scanlines.
  - **Compressed Image Data:**
    - Exactly 720 scanlines of PackBits RLE compressed data.
    - Each uncompressed scanline is 72 bytes (576 pixels $\times$ 1 bit/pixel = 72 bytes = 576 bits).
    - Atkinson PackBits Algorithm:
      - Read flag byte $B \in [0, 255]$:
        - If $B \in [0, 127]$: Literal run: copy next $B + 1$ bytes verbatim.
        - If $B \in [128, 255]$ (or signed $-128..-1$): Repeat run: repeat next byte $257 - B$ (or $1 - \text{signed } B$) times.
        - If $B = -128$ (`0x80`): No-op / padding (skip).
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary decoder. Detects MacBinary 128-byte or MacPaint 512-byte headers vs headerless raw PackBits streams, decompresses PackBits byte-by-byte into a 576×720 or 576×576 1-bit pixel bitmap, unpacks bits MSB-first into 32-bit RGBA pixels, supports transparent background mapping and monochrome color inversion, and encodes into a standard lossless PNG.
- **Fidelity:** `LOSSLESS` (Pixel-exact reproduction of 1984 Macintosh monochrome art).
- **Status:** **Wave 29 Shipped (`image/macpaint-to-png`)**.

---

### 83. LaTeX Scientific Document (`.tex`, `.latex`, `.ltx`)

- **Ecosystem & Context:** LaTeX is the premier typesetting system for mathematics, physics, computer science, quantitative finance, and scientific academia. Researchers and technical authors store manuscripts, lecture notes, arXiv submissions, and thesis chapters in `.tex` format. With modern note-taking apps (Obsidian, Notion, Logseq), documentation sites (Docusaurus, VitePress, Hugo), and LLM knowledge workflows adopting GitHub Flavored Markdown with MathJax/KaTeX math blocks, there is immense demand for a fast, private, client-side LaTeX-to-Markdown converter that preserves mathematical equations ($...$ and $$...$$), structural headings, lists, tables, and frontmatter without requiring a 4GB TeX Live installation.
- **Community Need & Reddit Signals:**
  - Subreddits: r/LaTeX, r/ObsidianMD, r/Notion, r/academia, r/markdown, r/MachineLearning.
  - Queries: *"Convert LaTeX .tex to Markdown with preserved math formulas"*, *"Import arXiv LaTeX paper into Obsidian without Pandoc"*, *"LaTeX to clean Markdown converter online private"*, *"Migrate PhD thesis .tex notes into Notion"*.
- **Forensic Structure:**
  - Preamble: `\documentclass{...}`, `\title{...}`, `\author{...}`, `\date{...}`.
  - Math environments: `$...$`, `$$...$$`, `\(...\)`, `\[...\]`, `\begin{equation}`, `\begin{align}`, `\begin{gather}`.
  - Sectioning: `\section`, `\subsection`, `\subsubsection`, `\paragraph`.
  - Lists: `\begin{itemize}`, `\begin{enumerate}`.
  - Verbatim: `\begin{verbatim}`, `\begin{lstlisting}`.
  - Formatting & typography: `\textbf`, `\textit`, `\emph`, `\texttt`, `\href`, `\url`, `\cite`, `\ref`, typography substitutions (`` / '' to quotes, em/en-dashes, escaped symbols).
- **In-Browser Execution Strategy:**
  - Pure client-side parsing pipeline in TypeScript. Strips TeX comments while respecting escaped `\%`, extracts title/author/date metadata into YAML frontmatter, isolates document body between `\begin{document}` and `\end{document}`, protects all inline and display math equations and verbatim blocks using keyed collision-free placeholders, translates structural macros into Markdown equivalents, restores protected equations intact for seamless KaTeX/MathJax rendering, and outputs clean GitHub Flavored Markdown.
- **Fidelity:** `HIGH-FIDELITY SEMANTIC MARKDOWN` (Mathematical equations preserved intact; structural hierarchy, lists, links, and styling mapped cleanly).
- **Status:** **Wave 29 Shipped (`document/latex-to-markdown`)**.

---

### 84. Dialogic OKI ADPCM Telephony Audio (`.vox`)

- **Ecosystem & Context:** The VOX audio format is a raw, headerless 4-bit Adaptive Differential Pulse Code Modulation (ADPCM) standard developed by Dialogic (later Intel Dialogic) using the OKI MSM5205 ADPCM compression algorithm. For over three decades, VOX has been the foundational audio format for computer telephony integration (CTI), interactive voice response (IVR) phone systems, PBX voice mail systems, Asterisk telephony servers, telecommunication call recording archives, and classic PC games. Because VOX files lack standard RIFF or AIFF headers, modern audio players, mobile operating systems, and digital audio workstations (DAWs) cannot open or play VOX audio.
- **Community Need & Reddit Signals:**
  - Subreddits: r/asterisk, r/telecom, r/sysadmin, r/VoIP, r/audioengineering, r/retrogaming.
  - Queries: *"Convert .vox to WAV free online"*, *"Play Dialogic VOX audio recording on Windows 11"*, *"How to listen to old voicemail .vox files without software install"*, *"Batch convert 8000 Hz VOX to 16-bit WAV"*.
- **Forensic Byte Layout:**
  - Raw headerless bitstream with no magic bytes or file length fields.
  - Each byte contains two 4-bit ADPCM nibbles (high nibble first, low nibble second).
  - Uses the 49-entry OKI ADPCM step size table:
    $$S \in [16, 17, 19, 21, 23, 25, 28, 31, \dots, 1411, 1552]$$
  - Uses the 16-entry step index adjustment table:
    $$I \in [-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8]$$
  - Sample calculation:
    $$\Delta = \text{step} \gg 3 + \sum_{k=0}^{2} (\text{nibble}_k \times (\text{step} \gg (2 - k)))$$
    Accumulated 12-bit signed sample clamped to $[-2048, 2047]$, scaled to 16-bit signed PCM by $x \ll 4$.
- **In-Browser Execution Strategy:**
  - Pure TypeScript ADPCM decompressor. Parses high and low nibbles sequentially, updates 49-step index state, decodes 12-bit samples to 16-bit linear PCM, allows user selection of telephony sample rate (8000 Hz standard, 6000 Hz legacy, 11025 Hz wideband, 16000 Hz HD IVR), and writes a complete 44-byte standard RIFF WAVE file playable in any modern media player.
- **Fidelity:** `LOSSLESS PCM` (Exact algorithmic mathematical decompression of OKI / Dialogic ADPCM bitstream into 16-bit linear PCM).
- **Status:** **Wave 29 Shipped (`audio/vox-to-wav`)**.

---

### 85. Sinclair ZX Spectrum Screen (`.scr`)

- **Ecosystem & Context:** The Sinclair ZX Spectrum (1982) by Sir Clive Sinclair is the beloved 8-bit microcomputer that launched the British video game industry. Software loading screens, demoscene illustrations, and retro game artwork are preserved in the `.scr` screen dump format. Because ZX Spectrum video memory uses a bizarre non-linear interlaced address layout designed for 1980s Z80 CRT hardware, standard modern image viewers and web browsers cannot display `.scr` files.
- **Community Need & Reddit Signals:**
  - Subreddits: r/zxspectrum, r/retrogaming, r/pixelart, r/retrocomputing, r/chiptunes, World of Spectrum.
  - Queries: *"Convert ZX Spectrum .scr to PNG online"*, *"View Sinclair .scr loading screen in browser"*, *"Extract retro 8-bit ZX Spectrum pixel art"*, *"ZX Spectrum attribute clash decoder"*.
- **Forensic Byte Layout:**
  - **Exact 6,912 bytes total (or 7,040 bytes with 128-byte tape emulator header):**
  - **6,144 bytes of monochrome bitmap pixels ($256 \times 192$):**
    - Divided into 3 vertical thirds of 64 scanlines each.
    - Non-linear address formula:
      $$\text{offset} = (T \times 2048) + (P \times 256) + (R \times 32) + C$$
      where $T = y \gg 6$ (third 0..2), $R = (y \gg 3) \& 7$ (character row 0..7), $P = y \& 7$ (line in character 0..7), and $C = x \gg 3$ (character column 0..31).
  - **768 bytes of color attributes (starts at byte offset 6144):**
    - One attribute byte per $8 \times 8$ pixel character cell ($32 \times 24 = 768$ cells).
    - Bit 7: Flash flag (hardware color alternation).
    - Bit 6: Brightness flag ($0 = \text{normal}, 1 = \text{bright}$).
    - Bits 3..5: Paper background color ($0..7$).
    - Bits 0..2: Ink foreground color ($0..7$).
  - **16-color Sinclair Palette:**
    - 0: Black, 1: Blue, 2: Red, 3: Magenta, 4: Green, 5: Cyan, 6: Yellow, 7: White (in normal and bright variations).
- **In-Browser Execution Strategy:**
  - Pure TypeScript binary decoder. Unscrambles the non-linear interlaced screen memory, reads 8x8 character cell attribute bytes, maps foreground and background bits to the authentic 16-color Sinclair palette, supports 1x native and 2x/3x integer pixel scaling, and compiles a lossless 32-bit RGBA PNG.
- **Fidelity:** `LOSSLESS` (Pixel-perfect reproduction of original 1982 Sinclair ZX Spectrum VRAM graphics).
- **Status:** **Wave 30 Shipped (`image/zx-to-png`)**.

---

### 86. GEDCOM Genealogy Data (`.ged`, `.gedcom`)

- **Ecosystem & Context:** GEDCOM (GEnealogical Data COMmunication) is the universal open standard created by The Church of Jesus Christ of Latter-day Saints for exchanging family trees and ancestral records across software platforms (Ancestry.com, FamilySearch, MyHeritage, Gramps, RootsMagic, MacFamilyTree). Millions of people have exported `.ged` files but lack desktop genealogy software or do not wish to pay monthly subscription fees to view and analyze their family history.
- **Community Need & Reddit Signals:**
  - Subreddits: r/Genealogy, r/ancestry, r/FamilySearch, r/excel, r/dataisbeautiful, r/ObsidianMD.
  - Queries: *"Convert GEDCOM .ged to Excel spreadsheet"*, *"Open .ged file in Google Sheets"*, *"Extract family tree ancestors to CSV free online"*, *"Convert Ancestry export to CSV without software"*.
- **Forensic Structure:**
  - Hierarchical line-based ASCII / UTF-8 structure with level numbers ($0, 1, 2, \dots$), cross-reference pointers (`@I1@`, `@F1@`), and tags (`INDI`, `NAME`, `BIRT`, `DEAT`, `FAM`, `HUSB`, `WIFE`, `CHIL`, `MARR`).
- **In-Browser Execution Strategy:**
  - Pure client-side streaming parser in TypeScript. Parses hierarchical tags, constructs relational graphs of individuals and family units, cross-references parent and spouse IDs to resolve father, mother, and spouse names, formats dates and places, escapes commas and quotes, and prepends a UTF-8 Byte Order Mark (`\uFEFF`) for immediate double-click opening in Microsoft Excel, Google Sheets, and Numbers.
- **Fidelity:** `LOSSLESS CSV EXPORT` (Extracts complete individual vital dates, places, occupations, and family relationships).
- **Status:** **Wave 30 Shipped (`document/gedcom-to-csv`)**.

---

### 87. Raw G.711 mu-law & A-law Telephony Audio (`.ulaw`, `.alw`, `.ulw`, `.alaw`, `.raw`)

- **Ecosystem & Context:** ITU-T Recommendation G.711 is the foundational international standard for digital pulse code modulation of voice frequencies on telephone networks, ISDN circuits, Cisco CallManager, Asterisk, PBX voicemail, and call center recordings. Standard `.ulaw` (North America/Japan) and `.alaw` (Europe/International) files are raw, headerless 8-bit non-linear audio streams at 8,000 Hz. Because they lack standard RIFF or AIFF containers, media players, smartphones, and DAWs cannot identify or play them.
- **Community Need & Reddit Signals:**
  - Subreddits: r/asterisk, r/telecom, r/sysadmin, r/VoIP, r/audioengineering, r/Cisco.
  - Queries: *"Convert .ulaw to WAV online free"*, *"How to play Asterisk .alaw call recording"*, *"Convert 8000 Hz u-law to WAV without software install"*, *"Private in-browser raw audio converter for customer calls"*.
- **Forensic Byte Layout:**
  - Raw headerless bitstream: 1 byte per sample (8,000 samples per second = 64 kbps).
  - G.711 logarithmic companding formula:
    - $\mu$-law: $y = \frac{\ln(1 + \mu |x|)}{\ln(1 + \mu)} \cdot \text{sgn}(x)$ where $\mu = 255$.
    - A-law: $y = \frac{A |x|}{1 + \ln(A)} \cdot \text{sgn}(x)$ for $|x| \le 1/A$ and $\frac{1 + \ln(A |x|)}{1 + \ln(A)} \cdot \text{sgn}(x)$ for $1/A \le |x| \le 1$ where $A = 87.6$.
- **In-Browser Execution Strategy:**
  - Precomputes two 256-entry lookup tables (`MULAW_TO_PCM16` and `ALAW_TO_PCM16`) mapping 8-bit logarithmic bytes to 16-bit linear signed integers. Expands samples in memory at bus speed (>100 MB/s), synthesizes a standard 44-byte RIFF WAVE header, and outputs universal 16-bit linear PCM WAV with 100% confidentiality.
- **Fidelity:** `LOSSLESS PCM` (Exact mathematical ITU-T expansion from logarithmic G.711 to 16-bit linear PCM).
- **Status:** **Wave 30 Shipped (`audio/ulaw-to-wav`)**.

---

### 88. Commodore 64 KoalaPainter Multicolor Bitmap (`.koa`, `.kla`)

- **Ecosystem & Context:** KoalaPainter was released in 1983 by Koala Technologies for the Commodore 64. It became the de-facto gold standard graphics format for 8-bit C64 pixel art, demoscene competitions (csdb.dk), and game asset design. Standard `.koa` files are direct 10,003-byte memory dumps representing the VIC-II chip's multicolor bitmap mode.
- **Community Need & Reddit Signals:**
  - Subreddits: r/c64, r/pixelart, r/retrogaming, r/demoscene, r/vintagecomputing.
  - Queries: *"How to convert C64 .koa to PNG"*, *"Convert KoalaPainter Commodore 64 bitmap to modern image"*, *"C64 Koala multicolor viewer online"*, *"Open .koa file without emulator"*.
- **Forensic Structure:**
  - Exact 10,003-byte PRG container:
    - Bytes 0..1: C64 PRG 2-byte load address (`$6000` = `0x00, 0x60` little-endian).
    - Bytes 2..8001 (8,000 bytes): VIC-II multicolor bitmap memory ($160 \times 200$ pixels across 1,000 $4 \times 8$ character cells).
    - Bytes 8002..9001 (1,000 bytes): Screen RAM ($5C00 / $0400). High nibble = Color 01, Low nibble = Color 10 for each cell.
    - Bytes 9002..10001 (1,000 bytes): Color RAM ($D800). Low nibble = Color 11 for each cell.
    - Byte 10002 (1 byte): Background color register ($D021). Color 00 (applied globally).
  - Also handles raw 10,001-byte and 10,002-byte dumps.
- **In-Browser Execution Strategy:**
  - Pure TypeScript client-side decoder. Unpacks 40 columns $\times$ 25 rows of character cells, resolves multicolor bit-pairs (`00`, `01`, `10`, `11`) into authentic Commodore 64 16-color palette indices (Pepto or Colodore calibrations), doubles horizontal pixel width to achieve standard $320 \times 200$ square pixel aspect ratio (or $640 \times 400$ 2x integer scale), and outputs 32-bit RGBA PNG.
- **Fidelity:** `LOSSLESS RASTER` (Bit-exact reproduction of Commodore 64 VIC-II multicolor graphics).
- **Status:** **Wave 31 Shipped (`image/koa-to-png`)**.

---

### 89. Adobe Photoshop Color Palette (`.aco`)

- **Ecosystem & Context:** Adobe Photoshop Color Swatches (`.aco`) is the binary color palette format used by digital artists, concept illustrators, and UI designers. Distributed across Gumroad, ArtStation, DeviantArt, and design resource repositories, `.aco` files contain rich palettes that web developers and UI designers need in CSS and Tailwind without launching Photoshop.
- **Community Need & Reddit Signals:**
  - Subreddits: r/Photoshop, r/webdev, r/digitalart, r/TailwindCSS, r/Frontend, r/design.
  - Queries: *"Convert Photoshop .aco swatches to CSS variables"*, *"How to use .aco in Tailwind"*, *"Photoshop color palette to hex converter"*, *"Extract .aco to JSON tokens"*.
- **Forensic Structure:**
  - Version 1 block: 2-byte version (`0x0001`), 2-byte count ($N$), followed by $N \times 10$-byte color specifications (color space ID + 4 $\times$ 16-bit components).
  - Version 2 block (appended after v1 or standalone): 2-byte version (`0x0002`), 2-byte count ($M$), followed by $M$ records with color specifications, 2-byte reserved, 4-byte name length, and UTF-16BE null-terminated swatch names.
  - Color models supported: RGB (0), HSB (1), CMYK (2), Lab (7), Grayscale (8).
- **In-Browser Execution Strategy:**
  - Dual-version parser in pure TypeScript. Prioritizes Version 2 to preserve artist-defined swatch names (e.g. "Primary Coral", "Deep Ocean"), calculates mathematical color transforms (D65 CIE Lab to sRGB, subtractive CMYK to sRGB, HSB to sRGB), and formats into clean `:root` CSS custom properties, Tailwind CSS configuration objects, or design token JSON.
- **Fidelity:** `MATHEMATICALLY ACCURATE` (High-precision 16-bit to 8-bit sRGB and hex conversion with original swatch names).
- **Status:** **Wave 31 Shipped (`document/aco-to-css`)**.

---

### 90. Sony PlayStation 1 & 2 PSX Audio (`.vag`, `.vagp`)

- **Ecosystem & Context:** Sony PlayStation 1 and 2 (`.vag`, `.vagp`) is the universal compressed sound effect, voice acting, and dialogue stream format used across thousands of classic PS1/PS2 games (Final Fantasy VII, Metal Gear Solid, Crash Bandicoot, Castlevania: Symphony of the Night, Resident Evil, Silent Hill). Game modders, retro preservationists, and audio engineers frequently extract `.vag` files from PS1 CD-ROM ISOs and ROM dumps but cannot play them on modern systems.
- **Community Need & Reddit Signals:**
  - Subreddits: r/psx, r/retrogaming, r/vgm, r/sounddesign, r/emulation, r/romhacking.
  - Queries: *"How to convert PSX .vag to WAV"*, *"PlayStation VAG audio converter online free"*, *"Convert VAGp sound effects to WAV without software install"*, *"PS1 audio extractor"*.
- **Forensic Structure:**
  - 48-byte or 64-byte Header:
    - Bytes 0..3: Magic ASCII `'VAGp'` (or little-endian `'pGAV'`).
    - Bytes 4..7: Version (typically `0x00000003` or `0x00000020`).
    - Bytes 12..15: Data size in bytes (big-endian uint32).
    - Bytes 16..19: Sample rate in Hz (big-endian uint32, e.g. 11025, 22050, 44100).
    - Bytes 32..47: Sound name (16-byte null-terminated ASCII string).
  - Audio Payload:
    - 16-byte SPU-ADPCM blocks.
    - Each block contains 1 byte shift/predictor, 1 byte flags (loop markers), and 14 bytes packed with 28 4-bit signed nibbles.
    - Authentic 5-coefficient 2-pole linear prediction filter: $K_0=[0,0]$, $K_1=[60/64, 0]$, $K_2=[115/64, -52/64]$, $K_3=[98/64, -55/64]$, $K_4=[122/64, -60/64]$.
- **In-Browser Execution Strategy:**
  - Parses header, auto-detects 48-byte vs 64-byte header offset, decodes SPU-ADPCM blocks sample-by-sample using authentic integer arithmetic, applies optional audio peak normalization, and synthesizes a standard 44-byte RIFF WAVE header with 16-bit linear PCM audio.
- **Fidelity:** `LOSSLESS ADPCM EXPANSION` (Exact Sony hardware SPU prediction filter algorithm).
- **Status:** **Wave 31 Shipped (`audio/vag-to-wav`)**.

---

### 91. BibTeX Academic Citations (.bib, .bibtex)
- **Ecosystem & Context:** BibTeX is the standard bibliographic management system created for LaTeX documents, exported universally by Google Scholar, Zotero, Mendeley, and arXiv.
- **Forensic Format Architecture:**
  - Plain-text ASCII/UTF-8 database with entry headers (`@article{key,`, `@book{key,`, `@inproceedings{key,`, etc.).
  - Bracket/brace-delimited key-value attribute fields (`title = {...}`, `author = {...}`, `journal = {...}`, `year = {...}`).
  - LaTeX accent macros and special entities (`{\"a}`, `\'{e}`, `\c{c}`, `\aa`, `\&`, `---`).
- **In-Browser Execution Strategy:**
  - Tokenizes entry structures with pure TypeScript parser, translates LaTeX accents into clean UTF-8 Unicode glyphs, and formats output as GitHub Flavored Markdown tables, numbered reading lists with abstracts, or structured JSON.
- **Fidelity:** `LOSSLESS CITATION PARSING`.
- **Status:** **Wave 32 Shipped (`document/bibtex-to-markdown`)**.

---

### 92. Atari ST DEGAS & DEGAS Elite Graphics (.pi1, .pi2, .pi3, .pc1, .pc2, .pc3)
- **Ecosystem & Context:** DEGAS (Design & Entertainment Graphic Arts System), created by Tom Hudson and published by Batteries Included in 1985 (and updated to DEGAS Elite in 1986), was the premiere graphics software for the Atari ST computer family.
- **Forensic Format Architecture:**
  - 34-Byte Header: 2-byte resolution word (`0` = Low 320x200 16 colors, `1` = Med 640x200 4 colors, `2` = High 640x400 monochrome), followed by 16 x 2-byte words for the Atari ST 9-bit RGB palette (`0000 0RRR 0GGG 0BBB`).
  - Bitplane Screen RAM: Exactly 32,000 bytes representing interleaved bitplanes (4 planes for low res, 2 for med res, 1 for high res).
  - DEGAS Elite Compression: PackBits-style byte-run RLE compression over the bitplane payload.
- **In-Browser Execution Strategy:**
  - Decodes 9-bit RGB palette to 32-bit RGBA, unpacks bitplanes into planar pixel indexes, reconstructs 2:1 aspect ratio doubling for medium res, and renders a lossless PNG.
- **Fidelity:** `LOSSLESS BITPLANE RECONSTRUCTION`.
- **Status:** **Wave 32 Shipped (`image/degas-to-png`)**.

---

### 93. Westwood Studios RTS Game Audio (.aud)
- **Ecosystem & Context:** Proprietary audio format developed by Westwood Studios for Command & Conquer (Tiberian Dawn), Red Alert, Dune II, and Dune 2000.
- **Forensic Format Architecture:**
  - 12-Byte Header: Sample rate (uint16 LE), uncompressed size (uint32 LE), compressed size (uint32 LE), flags (uint8, e.g. 16-bit/mono), compression type (uint8: `1` = Westwood WS-ADPCM, `99` = IMA-ADPCM).
  - Audio Chunks: 4-byte chunk headers with compressed size and uncompressed size, followed by 4-bit ADPCM data nibbles.
- **In-Browser Execution Strategy:**
  - Unpacks chunk streams, maintains 16-bit ADPCM step indices and predictors, scales samples to 16-bit linear PCM, and wraps with a standard RIFF/WAVE header.
- **Fidelity:** `LOSSLESS ADPCM RECONSTRUCTION`.
- **Status:** **Wave 32 Shipped (`audio/aud-to-wav`)**.

---

### 94. Atari ST & Falcon030 Audio Visual Research Audio (.avr)
- **Ecosystem & Context:** Audio Visual Research (`.avr`) was a premier audio sample format created on the Atari ST and Falcon030 for professional digital sampling workstations and sound editing tools like Megamax, Replay 16, and Avalon.
- **Forensic Format Architecture:**
  - 128-Byte Motorola 68000 Header: Magic bytes `2VRH` (0x32 0x56 0x52 0x48), sample name (8 ASCII bytes), mono/stereo mode (`0` = mono, `0xFFFF` = stereo), bit resolution (uint16 BE: 8 or 16 bits), signedness (`0` = unsigned, `0xFFFF` = signed), sample frequency (uint32 BE in Hz), and sample length in frames (uint32 BE).
  - Audio Payload: Big-endian 16-bit signed/unsigned or 8-bit PCM data following the 128-byte header.
- **In-Browser Execution Strategy:**
  - Parses 128-byte big-endian header, converts Motorola big-endian samples into little-endian linear PCM, normalizes signedness to standard two's complement 16-bit, and packages a valid RIFF/WAVE container with zero external dependencies.
- **Fidelity:** `LOSSLESS BIT-EXACT PCM RECONSTRUCTION`.
- **Status:** **Wave 33 Shipped (`audio/avr-to-wav`)**.

---

### 95. IBM CP437 ASCII / ANSI Art (.nfo, .diz)
- **Ecosystem & Context:** Standard information files distributed with demoscene releases, BBS file descriptions (`file_id.diz`), and warez scene groups. Encoded in the classic IBM PC hardware Code Page 437 character set featuring box-drawing characters, shades, and mathematical glyphs.
- **Forensic Format Architecture:**
  - Raw 8-bit byte stream where codes 0x01–0x1F and 0x80–0xFF map to DOS hardware glyphs (box-drawing lines, solid blocks `█`, half blocks `▄`/`▀`, light/medium/dark shades `░`/`▒`/`▓`, card suits `♠`/`♣`/`♥`/`♦`, and Greek symbols).
  - Lines delimited by standard CRLF or LF, often with intricate multi-column ANSI/ASCII artwork.
- **In-Browser Execution Strategy:**
  - Decodes byte-by-byte via CP437 glyph map into clean UTF-8 Unicode, computes art density statistics (line count, box character percentage), and renders either clean raw text or a standalone, responsive HTML viewer with customizable retro themes (Dark, Matrix Green, Amber CRT, Clean Paper) and monospace font stacks (Cascadia Code, Consolas, Courier New).
- **Fidelity:** `LOSSLESS CP437 UNICODE MAPPING & RETRO STYLING`.
- **Status:** **Wave 33 Shipped (`document/nfo-to-html`)**.

---

### 96. NES / Famicom Planar Character Tile ROM Graphics (.chr)
- **Ecosystem & Context:** Nintendo Entertainment System (NES) and Famicom PPU (Picture Processing Unit) pattern table character memory dumps, commonly found in `.nes` iNES ROMs or standalone `.chr` files for homebrew development and ROM hacking.
- **Forensic Format Architecture:**
  - 8x8 pixel tiles stored in 16 bytes each.
  - Planar 2bpp Encoding: First 8 bytes define Bitplane 0 (lower bit of all 8 rows); subsequent 8 bytes define Bitplane 1 (higher bit of all 8 rows). The two bitplanes combine bit-by-bit to produce a 2-bit color index (0 to 3) per pixel.
  - Standard banks are 4KB (256 tiles) or 8KB (512 tiles).
- **In-Browser Execution Strategy:**
  - Unpacks 16-byte planar tiles, reconstructs 2bpp indexes, maps indices to authentic NES palette presets (Classic Grey, Super Mario Bros, The Legend of Zelda, Metroid, Game Boy Green), lays tiles out in a configurable 16-column sprite sheet grid, and encodes a 32-bit RGBA PNG.
- **Fidelity:** `LOSSLESS 2BPP PIXEL RECONSTRUCTION`.
- **Status:** **Wave 33 Shipped (`image/chr-to-png`)**.

---

### 97. Triton FastTracker II Extended Module Tracker Music (.xm)
- **Ecosystem & Context:** Extended Module (`.xm`) format created by Fredrik Huss and Magnus Högdahl (Mr. H and Vogue of Triton) for FastTracker II on PC DOS in 1994. The undisputed king of PC tracker formats throughout the 1990s demoscene and tracker music culture.
- **Forensic Format Architecture:**
  - Header: Signature `Extended Module: ` at offset 0, tracker name, version (`0x0104`), header size, song length, restart position, channel count (up to 32), pattern count (up to 256), instrument count (up to 128), and flags (linear frequency table vs. Amiga periods).
  - Patterns: Packed channel notes with note, instrument, volume column, effect type, and effect parameters.
  - Instruments & Samples: Multi-sample instruments with volume/pan envelopes, vibrato settings, and 8/16-bit delta-encoded PCM sample data.
- **In-Browser Execution Strategy:**
  - Unpacks pattern data, decodes delta-compressed 8/16-bit PCM samples, evaluates linear pitch periods and tempo/speed tick counters, synthesizes multi-channel mixing with volume ramping into an interleaved 16-bit stereo PCM stream, and outputs a standard WAV file.
- **Fidelity:** `CYCLE-ACCURATE MULTI-CHANNEL SYNTHESIS`.
- **Status:** **Wave 34 Shipped (`audio/xm-to-wav`)**.

---

### 98. Emacs Org Mode Outline & Agenda Documentation (.org)
- **Ecosystem & Context:** Carsten Dominik's Org Mode for GNU Emacs, one of the most sophisticated plain-text authoring, task planning, and literate programming systems in computing history.
- **Forensic Format Architecture:**
  - Plain-text hierarchy with asterisk headings (`* Heading 1`, `** Heading 2`).
  - Metadata frontmatter (`#+TITLE:`, `#+AUTHOR:`, `#+DATE:`, `#+TAGS:`).
  - Task state keywords (`TODO`, `DONE`, `WAITING`), priority tags (`[#A]`, `[#B]`), and checkboxes (`[ ]`, `[X]`, `[-]`).
  - Org table syntax with pipe delimiters (`| Header |` and `|---+---|` separators), source code blocks (`#+BEGIN_SRC lang ... #+END_SRC`), and quote blocks (`#+BEGIN_QUOTE ... #+END_QUOTE`).
- **In-Browser Execution Strategy:**
  - Tokenizes heading depth, translates Org metadata to YAML frontmatter, converts task states and checkboxes to GFM checklists (`- [ ]`, `- [x]`), converts Org tables to GFM pipe tables, maps Org block structures to Markdown fenced blocks, and handles inline formatting (`*bold*`, `/italic/`, `_underline_`, `~code~`, `=verbatim=`, `+strike+`).
- **Fidelity:** `SEMANTIC STRUCTURAL MARKDOWN PRESERVATION`.
- **Status:** **Wave 34 Shipped (`document/org-to-markdown`)**.

---

### 99. DICOM Medical Diagnostic Imaging (.dcm, .dicom)
- **Ecosystem & Context:** Digital Imaging and Communications in Medicine (DICOM / NEMA PS3 / ISO 12052), the universal international standard for medical radiology imaging (CT, MRI, X-ray, Ultrasound, PET).
- **Forensic Format Architecture:**
  - 128-byte preamble followed by 4-byte magic signature `DICM` at offset 128.
  - Tag-Length-Value Data Elements: Group and Element numbers (uint16 LE each, e.g. `(0028, 0010)` Rows, `(0028, 0011)` Columns, `(0028, 0100)` Bits Allocated, `(0028, 1050)` Window Center, `(0028, 1051)` Window Width, `(0028, 1052)` Rescale Intercept, `(0028, 1053)` Rescale Slope).
  - Transfer Syntaxes: Explicit VR Little Endian, Implicit VR Little Endian, and Deflated Little Endian.
  - Pixel Data Tag `(7FE0, 0010)`: Raw 8-bit, 12-bit, or 16-bit greyscale or RGB planar pixel arrays.
- **In-Browser Execution Strategy:**
  - Scans DICOM data elements across explicit/implicit transfer syntaxes, extracts window/level contrast settings and modality rescale slopes, maps raw Hounsfield units (HU) into high-contrast 8-bit dynamic range, supports preset medical windows (Bone, Soft Tissue, Lung, Brain), and encodes a crisp 32-bit RGBA PNG.
- **Fidelity:** `CLINICAL CONTRAST WINDOW NORMALIZATION`.
- **Status:** **Wave 34 Shipped (`image/dcm-to-png`)**.

---

### 100. Computer Graphics Metafile 2D Vector Exchange (.cgm)
- **Ecosystem & Context:** ISO/IEC 8632 standard 2D vector graphics format widely used across aerospace, defense (ATA Spec 2000, MIL-PRF-28002), automotive, and technical engineering documentation. Engineers, pilots, and CAD archivists frequently encounter legacy `.cgm` diagrams and schematics that modern web browsers and desktop operating systems cannot render without proprietary legacy CAD suites.
- **Forensic Format Architecture:**
  - Binary Encoding: Elements are encoded as 16-bit command words: 3-bit Element Class (Delimiter, Metafile Descriptor, Picture Descriptor, Control, Graphical Primitives, Attributes, Escape), 7-bit Element ID, and 5-bit Parameter Length (with `0x1F` escape triggering a 16-bit extended length word).
  - Clear-Text Encoding: Standardized human-readable tokens (`BEGMF`, `BEGPIC`, `VDCEXT`, `LINE`, `POLYGON`, `CIRCLE`, `RECT`, `TEXT`, `LINECOLR`, `LINEWIDTH`, `ENDPIC`, `ENDMF`).
  - Coordinate Systems: Virtual Device Coordinates (VDC) mapped via VDC Extent rectangles (integer or real-valued) into display space.
- **In-Browser Execution Strategy:**
  - Employs dual-mode decoding: automatically detects binary command streams vs. clear-text token lexing.
  - Normalizes VDC coordinates into standard SVG viewBox coordinates.
  - Generates clean, responsive W3C SVG with semantic `<path>`, `<polyline>`, `<polygon>`, `<circle>`, `<rect>`, `<line>`, and `<text>` elements, preserving stroke widths, colors, fills, and aspect ratios.
- **Fidelity:** `VECTOR-PERFECT GEOMETRIC TRANSLATION`.
- **Status:** **Wave 35 Shipped (`image/cgm-to-svg`) — 100-Tool Landmark Milestone**.

---

### 101. Future Crew Scream Tracker 3 Module Music (.s3m)
- **Ecosystem & Context:** Developed by Psi (Sami Tammilehto) and Future Crew for Scream Tracker 3 on PC DOS in 1994. S3M became the preeminent PC demoscene tracker format, powering legendary DOS demoscene productions and game soundtracks (e.g. *Star Control II*, *Epic Pinball*, *Silverball*) with up to 32 digital PCM channels, 16-bit panning, and AdLib FM synth integration.
- **Forensic Format Architecture:**
  - 0x60-byte Header: Song name, signature bytes `0x1A 0x10`, order count `ordNum`, instrument count `insNum`, pattern count `patNum`, flags, Cwt/v version, and magic signature `SCRM` at offset `0x2C`.
  - Parapointers: 16-bit order-list-relative pointers shifted by 4 (`offset = parapointer * 16`) pointing to instrument headers and pattern bodies.
  - Instruments: 0x50-byte instrument definitions containing sample type, DOS filename, memory parapointers, sample length, loop start/end points, volume (0–64), and C4Speed (sample playback frequency at note C-4).
  - Patterns: Packed row byte streams where channel mask bits indicate present data (Note + Octave, Instrument number, Volume column, Command effect, and Effect parameters).
- **In-Browser Execution Strategy:**
  - Unpacks packed pattern rows into active channel structures, decodes 8-bit unsigned PCM sample buffers, runs tick-based multi-channel synthesis with period-to-frequency stepping, processes volume columns and tempo/speed counters, and mixes channels into an interleaved 44.1 kHz 16-bit stereo PCM RIFF WAV audio stream.
- **Fidelity:** `CYCLE-ACCURATE MULTI-CHANNEL CHIPTUNE SYNTHESIS`.
- **Status:** **Wave 35 Shipped (`audio/s3m-to-wav`) — Milestone Tool 101**.

---

### 102. Evernote XML Export Archive (.enex)
- **Ecosystem & Context:** Evernote's universal export container (`.enex`), used by tens of millions of note-takers, researchers, and professionals to archive journals, clipped web pages, research summaries, and meeting logs. As users transition away from proprietary cloud note platforms to local-first knowledge bases (Obsidian, Logseq, Bear, Notion), converting ENEX files cleanly into standard GitHub Flavored Markdown with preserved YAML frontmatter, tags, checklists, and attachments is an indispensable migration need.
- **Forensic Format Architecture:**
  - XML Root: `<en-export>` container with `<note>` elements and export metadata (`export-date`, `application`, `version`).
  - Note Structure: `<title>`, `<created>`, `<updated>`, zero or more `<tag>` tags, and `<content>` wrapping an ENML2 (Evernote Note Markup Language) XML document within `<![CDATA[...]]>`.
  - ENML2 Grammar: Strict XML-compliant XHTML subset featuring custom elements: `<en-note>`, `<en-todo checked="true|false"/>` (checklists), and `<en-media hash="..." type="..."/>` (inline media attachments), alongside standard HTML formatting (`<div>`, `<p>`, `<b>`, `<i>`, `<s>`, `<a>`, `<table>`, `<code>`, `<pre>`).
- **In-Browser Execution Strategy:**
  - Robust XML extraction using browser DOMParser or regex-resilient token extraction.
  - Normalizes ISO 8601 timestamps (`YYYYMMDDTHHmmssZ` to standard ISO format).
  - Converts ENML tags to standard GitHub Flavored Markdown: translates `<en-todo>` into `- [x]` or `- [ ]`, maps tables to GFM pipe tables, handles preformatted code blocks and lists, and generates frontmatter containing title, creation/update dates, and tags.
- **Fidelity:** `SEMANTIC ENML-TO-GFM MARKDOWN FIDELITY`.
- **Status:** **Wave 35 Shipped (`document/enex-to-markdown`) — Milestone Tool 102**.

---

### 103. Jeffrey Lim Impulse Tracker Module (.it)
- **Ecosystem & Context:** Impulse Tracker (`.it`), created in 1996 by Australian programmer Jeffrey Lim, represents the pinnacle of the tracker golden age. Supporting up to 64 channels, resonant lowpass filters, New Note Actions (NNA), 16-bit compressed samples, and complex envelope modulations, IT powered legendary PC game soundtracks including *Jazz Jackrabbit 2*, *Deus Ex*, *Unreal*, and *Unreal Tournament*.
- **Forensic Format Architecture:**
  - 0xC0-byte Header: `IMPM` magic signature at offset 0, 26-byte song title, OrdNum, InsNum, SmpNum, PatNum, Cwt/v version, Flags (stereo, linear slides, old effects), Global Volume (0–128), Mix Volume (0–128), Initial Speed, Initial Tempo (BPM), and 64-channel Pan/Volume tables.
  - Parapointers: 32-bit absolute file offsets pointing to sample headers (`IMPS`) and pattern data blocks.
  - Sample Headers: `IMPS` signature, DOS filename, Gvsl, Flags (16-bit, stereo, compressed, looped), Cvt (signed/delta), default volume, sample name, C5Speed (frequency for note C-5 in Hz), loop start/end points, and raw sample offset.
  - Patterns: 64-channel bit-packed row records with channel variable bitmasks for note (0–119), instrument, volume/panning, and effect commands.
- **In-Browser Execution Strategy:**
  - Unpacks 64-channel pattern rows, parses `IMPS` sample headers with 8-bit/16-bit signed delta PCM decoding, models voice frequency playback relative to C5Speed, runs multi-voice mixing with volume envelopes and stereo panning, and generates a standard 16-bit linear PCM stereo WAV.
- **Fidelity:** `64-CHANNEL TRACKER VOICE SYNTHESIS`.
- **Status:** **Wave 36 Shipped (`audio/it-to-wav`) — Milestone Tool 103**.

---

### 104. Outline Processor Markup Language (.opml)
- **Ecosystem & Context:** Established by Dave Winer for UserLand Software, OPML 1.0 and 2.0 is the universal open standard for exchanging hierarchical outlines, RSS/Atom feed subscriptions (Feedly, Inoreader, NetNewsWire), podcast directories (Pocket Casts, Overcast), and outliner mindmaps (Workflowy, OmniOutliner).
- **Forensic Format Architecture:**
  - XML Root: `<opml version="1.0|2.0">` with `<head>` and `<body>` sections.
  - `<head>`: `<title>`, `<dateCreated>`, `<dateModified>`, `<ownerName>`, `<ownerEmail>`.
  - `<body>`: Arbitrarily nested `<outline>` tags featuring attributes: `text`, `title`, `type` (e.g. `rss`), `xmlUrl`, `htmlUrl`, `url`, `description`, `_note`, and `_status` / `completed`.
- **In-Browser Execution Strategy:**
  - Robust XML entity decoding and recursive tree parsing.
  - Generates YAML frontmatter from `<head>` metadata.
  - Renders RSS feed collections into structured Markdown reference tables (`| Feed Title | Site | Feed URL |`).
  - Converts general outline hierarchies into nested Markdown bullet lists and GFM task checklists (`- [ ]`, `- [x]`) with child notes rendered as indented blockquotes.
- **Fidelity:** `HIERARCHICAL OUTLINE & TABULAR FEED PRESERVATION`.
- **Status:** **Wave 36 Shipped (`document/opml-to-markdown`) — Milestone Tool 104**.

---

### 105. OpenRaster Layered Graphics Archive (.ora)
- **Ecosystem & Context:** OpenRaster (`.ora`) is an open, vendor-neutral specification for layered raster graphics created by Freedesktop.org, Krita, MyPaint, and GIMP as an open alternative to Adobe Photoshop's `.psd`. It enables non-destructive multi-layer painting workflows across open-source digital painting programs.
- **Forensic Format Architecture:**
  - Container: Standard PKZIP archive with `mimetype` file containing `image/openraster`.
  - Manifest: `stack.xml` defining `<image w="..." h="...">` and a `<stack>` of `<layer>` nodes specifying `src="data/layer.png"`, `name`, `x`, `y`, `opacity`, `visibility="visible|hidden"`, and `composite-op`.
  - Image Assets: `mergedimage.png` (mandatory composite rendering per OpenRaster spec) or individual PNG layer tiles in `data/`.
- **In-Browser Execution Strategy:**
  - Unzips container in browser memory via `fflate`.
  - Parses `stack.xml` layout geometry, layer opacities, and visibility flags.
  - Extracts the full-resolution composite artwork (`mergedimage.png`) or falls back to topmost visible layer tiles, verifying PNG signatures and outputting high-fidelity 32-bit RGBA PNG.
- **Fidelity:** `LOSSLESS FLATTENED RASTER EXTRACTION`.
- **Status:** **Wave 36 Shipped (`image/ora-to-png`) — Milestone Tool 105**.

---

### 106. FictionBook 2.0 e-Book (.fb2)
- **Ecosystem & Context:** FictionBook 2.0 (`.fb2`) is an open XML-based e-book standard widely used throughout Eastern Europe, supported by FBReader, Calibre, PocketBook, and retro e-readers. Unlike EPUB, which packages multiple HTML/CSS files in a ZIP container, FB2 is a single semantic XML file encompassing book metadata, cover art, nested chapters, epigraphs, poems, citations, and base64-encoded inline illustrations.
- **Forensic Format Architecture:**
  - XML Root: `<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">` containing `<description>`, `<body>`, and optional `<binary>` blocks.
  - `<description>`: Structured `<title-info>` (genre, author names, book-title, annotation, publication date, language, coverpage), `<document-info>`, and `<publish-info>`.
  - `<body>`: Hierarchical `<section>` nodes containing `<title>`, `<subtitle>`, `<epigraph>`, `<cite>`, `<poem>`, `<p>`, `<empty-line>`, and `<image>` tags.
  - `<binary>`: Base64-encoded image payloads keyed by an `id` attribute, referenced within the body via `xlink:href="#id"` or `l:href="#id"`.
- **In-Browser Execution Strategy:**
  - Pre-scans XML prolog to determine document character encoding (supporting UTF-8, Windows-1251, and KOI8-R via `TextDecoder`).
  - Serializes bibliographic metadata into standardized YAML frontmatter.
  - Indexes all `<binary>` illustrations into base64 data URLs for seamless markdown image rendering.
  - Formats epigraphs and citations into indented blockquotes, poetic stanzas into verse blocks, and nested sections into proportional GitHub Flavored Markdown heading levels (`#`, `##`, etc.).
- **Fidelity:** `SEMANTIC E-BOOK & EMBEDDED MEDIA PRESERVATION`.
- **Status:** **Wave 37 Shipped (`document/fb2-to-markdown`) — Milestone Tool 106**.

---

### 107. Quite OK Image (.qoi)
- **Ecosystem & Context:** Created by Dominic Szablewski, Quite OK Image (`.qoi`) is a fast, lossless image compression format designed to compress RGB/RGBA rasters to sizes comparable to PNG while decompressing 20x to 50x faster. It is increasingly adopted in real-time game engines, graphics pipelines, and embedded microcontrollers where PNG deflate overhead is prohibitive.
- **Forensic Format Architecture:**
  - Magic Signature: `qoif` (`0x71 0x6F 0x69 0x66`) at byte offset 0.
  - Header (14 bytes): 32-bit big-endian width, 32-bit big-endian height, channels byte (3 = RGB, 4 = RGBA), colorspace byte (0 = sRGB with linear alpha, 1 = all channels linear).
  - Running Color Array: 64-entry cache initialized to transparent black (`{r: 0, g: 0, b: 0, a: 0}`), indexed by `(r * 3 + g * 5 + b * 7 + a * 11) % 64`.
  - Byte-Stream Chunk Opcodes:
    - `QOI_OP_INDEX` (2-bit tag `00`, 6-bit index): fetches color directly from the cache.
    - `QOI_OP_DIFF` (2-bit tag `01`, 2-bit dr, 2-bit dg, 2-bit db with bias 2): small RGB diffs (-2..1).
    - `QOI_OP_LUMA` (2-bit tag `10`, 6-bit dg with bias 32, followed by byte containing dr-dg and db-dg with bias 8): green-correlated luminance diffs.
    - `QOI_OP_RUN` (2-bit tag `11`, 6-bit run length with bias -1): run of 1 to 62 consecutive identical pixels.
    - `QOI_OP_RGB` (8-bit tag `0xFE`, 3 payload bytes): new RGB color, preserving current alpha.
    - `QOI_OP_RGBA` (8-bit tag `0xFF`, 4 payload bytes): new complete RGBA color.
  - End Marker: 7 bytes of `0x00` followed by `0x01`.
- **In-Browser Execution Strategy:**
  - Inspects `qoif` header and dimensions with boundary checking against maximum canvas limits.
  - Decodes sequential opcodes into a linear 32-bit RGBA pixel array using a 64-entry running color table.
  - Packages raw pixels into a standard 32-bit RGBA lossless PNG with IHDR, IDAT (zlib deflate), and IEND chunks.
- **Fidelity:** `LOSSLESS FAST RASTER DECOMPRESSION`.
- **Status:** **Wave 37 Shipped (`image/qoi-to-png`) — Milestone Tool 107**.

---

### 108. PolyTracker Module (.ptm)
- **Ecosystem & Context:** PolyTracker was a popular DOS multi-channel music tracker released in the mid-1990s by Chris Cox, bridging ProTracker and FastTracker formats. It is known for its distinctive 32-channel panning, compact 8BDIFF delta-encoded 8-bit/16-bit sample representation, and proprietary PTMF structure.
- **Forensic Format Architecture:**
  - Magic Signature: `PTMF` (`0x50 0x54 0x4D 0x46`) at offset 0x2C (following 28-byte song title and `0x1A` end-of-file byte).
  - Version Byte: `0x02` (v2.03) or `0x01` (v1.xx).
  - Channel Setup: 1 to 32 channels, channel panning table (0 = left, 7 = center, 15 = right).
  - Sample Headers: loop flags, sample length, c4spd frequency tuning, default volume, panning, and sample type (bit 0 = 16-bit, bit 2 = 8BDIFF delta encoding).
  - Multi-Channel Patterns: 64 rows per pattern, packed note/sample/effect events.
- **In-Browser Execution Strategy:**
  - Validates `PTMF` signature and decodes channel count, orders, sample descriptors, and pattern tables.
  - Decompresses 8BDIFF delta samples via cumulative accumulator (`current = (current + delta[i]) & 0xff`) and scales to signed 16-bit linear PCM.
  - Synthesizes multi-channel tracker voices with linear interpolation, loop handling, tick/speed timing (BPM and SPD), and stereo panning into clean 16-bit stereo linear PCM RIFF WAV.
- **Fidelity:** `CHIPTUNE SYNTHESIS & RESTORATION`.
- **Status:** **Wave 37 Shipped (`audio/ptm-to-wav`) — Milestone Tool 108**.

---

### 109. Radiance RGBE High Dynamic Range Image (.hdr, .pic)
- **Ecosystem & Context:** Developed by Greg Ward at Lawrence Berkeley National Laboratory as part of the Radiance lighting simulation system, the Radiance RGBE format (`.hdr`, `.pic`) is one of the earliest and most enduring high-dynamic-range image standards. It remains extensively used in computer graphics, visual effects (VFX), architectural visualization, and physically based rendering (PBR) for 360° image-based lighting environment maps (HDRI).
- **Forensic Format Architecture:**
  - Magic Signature: `#?RADIANCE` or `#?RGBE` followed by variable-length ASCII header lines terminating with an empty line `\n\n`.
  - Format Identifier: `FORMAT=32-bit_rle_rgbe` or `FORMAT=32-bit_rle_xyze`.
  - Resolution Line: Standard orientation `-Y height +X width` (or variants like `+Y`, `-X`).
  - Encoding:
    - 32-bit per pixel shared exponent: Red, Green, Blue (8 bits each mantissa) and Exponent (8 bits, excess-128 bias).
    - Adaptive RLE: scanline indicator `0x02 0x02` followed by 16-bit big-endian scanline width, then 4 separate RLE streams for R, G, B, and E channels per scanline.
- **In-Browser Execution Strategy:**
  - Parses ASCII key-value header pairs and extracts canvas dimensions.
  - Decodes adaptive RLE per scanline channel-by-channel into 32-bit RGBE bytequads.
  - Applies Reinhard global tone mapping ($L_d = \frac{L}{1 + L}$) or linear exposure normalization and sRGB transfer curve ($\gamma \approx 2.2$) to project 32-bit HDR floating-point luminances into 8-bit display-referred RGBA pixels.
  - Encodes lossless 32-bit RGBA PNG output.
- **Fidelity:** `HDR TONE-MAPPED & sRGB GAMMA-CORRECTED RASTERIZATION`.
- **Status:** **Wave 38 Shipped (`image/hdr-to-png`) — Milestone Tool 109**.

---

### 110. Palm OS PalmDoc E-Book (.pdb, .prc)
- **Ecosystem & Context:** Introduced in the late 1990s for Palm OS PDAs by Rick Bram and popularized by AportisDoc, PalmDoc (`.pdb`, `.prc`) was the de facto standard digital reading format for the pioneering PalmPilot, Handspring Visor, and Sony CLIÉ handhelds. Millions of vintage texts, medical handbooks, and classic literature releases remain locked in PalmDoc `.pdb` database files.
- **Forensic Format Architecture:**
  - Header (78 bytes): 32-byte null-padded database name, attributes, version, creation/modification Palm timestamps (seconds since Jan 1, 1904), type/creator ID (`TEXtREAd` for PalmDoc), and record count.
  - Record Offset List: 8 bytes per record (`offset` 4 bytes, `attributes` 1 byte, `uniqueID` 3 bytes).
  - Record 0 (PalmDoc Header, 16 bytes): Compression version (1 = uncompressed, 2 = PalmDoc LZ77 compressed), text length in bytes, record count, record size (typically 4096 bytes).
  - Records 1..N: Compressed or uncompressed text chunks (maximum 4096 uncompressed bytes per record).
  - PalmDoc LZ77 Byte Opcodes:
    - `0x00`: Literal NULL byte.
    - `0x01`..`0x08`: Literal count of next 1 to 8 bytes.
    - `0x09`..`0x7F`: Single literal ASCII/Windows-1252 character.
    - `0x80`..`0xBF`: 2-byte sliding window reference: `distance = ((b0 & 0x3F) << 5) | (b1 >> 3)`, `length = (b1 & 0x07) + 3` (window up to 2047 bytes, length up to 10 bytes).
    - `0xC0`..`0xFF`: Two-character sequence of a space `' '` followed by byte XORed with `0x80`.
- **In-Browser Execution Strategy:**
  - Reads Palm OS database record list and extracts PalmDoc metadata from Record 0.
  - Decompresses each sequential text record in browser memory using the PalmDoc LZ77 sliding window decoder.
  - Detects chapter titles, headers, and paragraph breaks, converting the text into structured GitHub Flavored Markdown with clean YAML frontmatter containing the database name and Palm timestamp.
- **Fidelity:** `LOSSLESS TEXT & CHAPTER STRUCTURE RECOVERY`.
- **Status:** **Wave 38 Shipped (`document/pdb-to-markdown`) — Milestone Tool 110**.

---

### 111. Atari ST NeoChrome Master Image (.neo)
- **Ecosystem & Context:** Developed in 1985 by Dave Staugas at Atari Corporation, NeoChrome (`.neo`) was the premier color paint program for the Atari ST 16/32-bit personal computer. Its 16-color palette animations, cycling effects, and pixel-precise tools defined the golden age of Atari ST demoscene art and video game concept graphics.
- **Forensic Format Architecture:**
  - File Size: Exactly 32,128 bytes.
  - Header (128 bytes):
    - Offset 0x00: 16-bit word (0x0000 = NeoChrome format flag).
    - Offset 0x02: Resolution word (0 = Low 320x200 16 colors, 1 = Medium 640x200 4 colors, 2 = High 640x400 monochrome).
    - Offset 0x04–0x23: 16 palette entries (16-bit ST RGB words: `0x0RGB`, 3 bits per channel for 512 total colors, or STE extended 4 bits per channel).
    - Offset 0x24–0x2F: Color animation limits and directional speed flags.
    - Offset 0x44: X/Y slide offsets and data.
  - Display Data (32,000 bytes): Exactly 200 scanlines of 160 bytes each. Each scanline consists of 20 16-pixel groups arranged as 4 interleaved bitplanes (Planar 4bpp).
- **In-Browser Execution Strategy:**
  - Verifies the 32,128-byte file length and extracts the 16-color Atari ST palette (mapping 3-bit/4-bit ST RGB values with non-linear DAC scaling to 8-bit sRGB).
  - Unpacks 4 interleaved bitplanes per 16-pixel word group into discrete 4-bit palette indexes for all 320x200 pixels.
  - Corrects non-square Atari ST CRT pixel aspect ratios if requested, and formats the pixel buffer into a lossless 32-bit RGBA PNG.
- **Fidelity:** `CYCLE-ACCURATE BITPLANE & PALETTE EXTRACTION`.
- **Status:** **Wave 38 Shipped (`image/neo-to-png`) — Milestone Tool 111**.

---

## Roadmap Waves & Next Steps

1. **Wave 1 (Shipped):**
   - Reference: `video/mlw-to-mp4` (Shipped)
   - Tool 1: `video/procreate-to-mp4` (Extract drawing timelapse)
   - Tool 2: `image/procreate-to-png` (Extract full-res artwork)
   - Tool 3: `image/rpgmvp-to-png` (RPG Maker MV/MZ image decrypter)
   - Tool 4: `image/tgs-to-json` (Telegram animated sticker decompressor)
2. **Wave 2 (Shipped):**
   - Tool 5: `video/dav-to-mp4` (Dahua/Amcrest CCTV remuxer)
   - Tool 6: `video/h264-to-mp4` (Raw H.264 elementary stream muxer)
   - Tool 7: `audio/rpgmvo-to-ogg` (RPG Maker BGM decrypter)
   - Tool 8: `audio/rpgmvm-to-m4a` (RPG Maker SFX decrypter)
   - Tool 9: `document/xmind-to-markdown` (XMind to Markdown hierarchical notes)
3. **Wave 3 (Shipped):**
   - Tool 10: `image/clip-to-png` (Clip Studio Paint artwork extractor)
   - Tool 11: `video/pkg-to-mp4` (Wallpaper Engine video wallpaper extractor)
   - Tool 12: `audio/sf2-to-wav` (SoundFont .sf2 instrument sample extractor)
4. **Wave 4 (Shipped):**
   - Tool 13: `document/goodnotes-to-pdf` (GoodNotes notebook to PDF converter)
   - Tool 14: `image/studio3-to-svg` (Silhouette Studio craft vector to SVG)
   - Tool 15: `document/pck-to-zip` (Godot Engine asset package to ZIP)
5. **Wave 5 (Shipped):**
   - Tool 16: `document/rpa-to-zip` (Ren'Py visual novel archive unpacker)
   - Tool 17: `audio/opus-to-mp3` (WhatsApp voice note to universal MP3)
   - Tool 18: `document/msg-to-eml` (Outlook .msg to standard RFC 822 .eml)
6. **Wave 6 (Shipped):**
   - Tool 19: `audio/adx-to-wav` (CRIWARE ADX console game audio to WAV)
   - Tool 20: `document/scorm-to-zip` (SCORM Course asset extractor)
7. **Wave 7 (Shipped):**
   - Tool 21: `image/icns-to-png` (Apple macOS Icon Image highest-res PNG extractor)
   - Tool 22: `document/mhtml-to-html` (MHTML/MHT web archive to standalone offline HTML)
8. **Wave 8 (Shipped):**
   - Tool 23: `document/vcf-to-csv` (vCard / Contacts `.vcf` multi-contact exporter to CSV spreadsheet)
   - Tool 24: `image/dds-to-png` (DirectDraw Surface `.dds` game texture / normal map decoder to PNG)
9. **Wave 9 (Shipped):**
   - Tool 25: `document/wad-to-zip` (id Tech / Doom engine `.wad` game archive & sound extractor to ZIP)
   - Tool 26: `document/pak-to-zip` (Quake / GoldSrc Half-Life `.pak` game package extractor to ZIP)
10. **Wave 10 (Shipped):**
    - Tool 27: `image/abr-to-png` (Adobe Photoshop Brush `.abr` stamps to transparent PNGs + ZIP)
    - Tool 28: `image/ani-to-png` (Windows Animated Cursor `.ani` frames to PNGs + timing manifest)
11. **Wave 11 (Shipped):**
    - Tool 29: `document/fit-to-csv` (Garmin / Wahoo / Strava `.fit` activity decoder to RFC 4180 CSV + GPX)
    - Tool 30: `image/cur-to-png` (Windows Static Cursor `.cur` decoder to transparent PNG with hotspot coordinates)
    - Tool 31: `document/ase-to-css` (Adobe Swatch Exchange `.ase` palette decoder to CSS variables & Tailwind config)
12. **Wave 12 (Shipped):**
    - Tool 32: `document/webarchive-to-html` (Apple Safari WebArchive `.webarchive` to universal standalone offline HTML)
    - Tool 33: `document/vnt-to-txt` (Samsung / Sony Ericsson / Nokia mobile vNote `.vnt` memo to clean plain text)
13. **Wave 13 (Shipped):**
    - Tool 34: `document/smi-to-srt` (SAMI Synchronized Accessible Media Interchange `.smi` subtitle converter to SRT)
    - Tool 35: `image/gbr-to-png` (GIMP Brush `.gbr` to transparent PNG stamp)
    - Tool 36: `image/cdr-to-png` (CorelDRAW `.cdr` artwork composite preview extractor to PNG)
14. **Wave 14 (Shipped):**
    - Tool 37: `image/tga-to-png` (Truevision TGA texture & graphics decoder to PNG)
    - Tool 38: `document/bsp-to-zip` (Valve Source & GoldSrc BSP map asset extractor to ZIP)
    - Tool 39: `document/sub-to-srt` (MicroDVD frame-based subtitle converter to SRT)
15. **Wave 15 (Shipped):**
    - Tool 40: `document/ass-to-srt` (Advanced SubStation Alpha `.ass` / `.ssa` subtitle converter to SRT)
    - Tool 41: `document/chm-to-zip` (Microsoft Compiled HTML Help `.chm` ITSF decompiler to ZIP)
    - Tool 42: `audio/silk-to-wav` (WeChat / Skype Silk v3 voice note audio decoder to WAV)
16. **Wave 16 (Shipped):**
    - Tool 43: `image/pcx-to-png` (ZSoft PCX DOS/Windows retro bitmap decoder to PNG)
    - Tool 44: `document/act-to-css` (Adobe Photoshop Color Table `.act` 256-color palette to CSS variables & Tailwind config)
    - Tool 45: `image/vtf-to-png` (Valve Source Engine `.vtf` game texture decoder to PNG)
17. **Wave 17 (Shipped):**
    - Tool 46: `image/aseprite-to-png` (Aseprite `.aseprite` / `.ase` animated pixel art & sprite sheet extractor to PNG)
    - Tool 47: `image/iff-to-png` (Commodore Amiga Deluxe Paint / Electronic Arts IFF-ILBM & PBM interleaved bitmap decoder to PNG)
    - Tool 48: `document/cue-to-json` (CUE Sheet `.cue` CD-DA audio tracklist parser & chapter metadata extractor to JSON)
18. **Wave 18 (Shipped):**
    - Tool 49: `document/dxf-to-svg` (AutoCAD Drawing Exchange Format `.dxf` 2D vector CAD/CNC geometry to SVG)
    - Tool 50: `image/xbm-to-png` (X11 X BitMap `.xbm` monochrome C-code bitmap array to PNG)
    - Tool 51: `audio/voc-to-wav` (Creative Voice Sound Blaster `.voc` retro DOS game audio decoder to WAV)
19. **Wave 19 (Shipped):**
    - Tool 52: `image/wmf-to-svg` (Windows Metafile `.wmf` 16-bit vector clip art to clean SVG)
    - Tool 53: `document/gpx-to-geojson` (GPS Exchange Format `.gpx` tracks, waypoints, and routes to GeoJSON)
    - Tool 54: `audio/au-to-wav` (Sun Microsystems & NeXT `.au` / `.snd` audio to universal WAV)
20. **Wave 20 (Shipped):**
    - Tool 55: `image/xpm-to-png` (X11 X PixMap `.xpm` C-code color icon & pixmap array to transparent PNG)
    - Tool 56: `document/kml-to-geojson` (Keyhole Markup Language `.kml` Google Earth vector geometry and placemark to GeoJSON)
    - Tool 57: `audio/aiff-to-wav` (Apple Audio Interchange File Format `.aif` / `.aiff` uncompressed PCM to standard RIFF WAV)
21. **Wave 21 (Shipped):**
    - Tool 58: `image/ras-to-png` (Sun Raster `.ras` / `.sun` Unix graphic image format decoder to PNG)
    - Tool 59: `document/tcx-to-geojson` (Garmin Training Center XML `.tcx` track and lap activity telemetry to GeoJSON)
    - Tool 60: `audio/ircam-to-wav` (IRCAM / Sound Designer II / BICSF academic research audio format decoder to RIFF WAV)
22. **Wave 22 (Shipped):**
    - Tool 61: `image/sgi-to-png` (Silicon Graphics SGI `.rgb`, `.rgba`, `.sgi`, `.bw` Iris workstation image decoder to PNG)
    - Tool 62: `document/kmz-to-geojson` (Google Earth Compressed Keyhole Archive `.kmz` zip unpacker and KML to GeoJSON)
    - Tool 63: `audio/nist-to-wav` (NIST / SPHERE `.sph`, `.nist` acoustic speech database format decoder to RIFF WAV)
23. **Wave 23 (Shipped):**
    - Tool 64: `image/xwd-to-png` (X Window System Window Dump `.xwd` format decoder to PNG)
    - Tool 65: `document/osm-to-geojson` (OpenStreetMap XML `.osm` map extract to standard RFC 7946 GeoJSON)
    - Tool 66: `audio/dsf-to-wav` (Sony Direct Stream Digital `.dsf` 1-bit high-resolution SACD audio decoder to 16-bit PCM WAV)
24. **Wave 24 (Shipped):**
    - Tool 67: `image/fits-to-png` (Flexible Image Transport System `.fits`, `.fit`, `.fts` NASA/astronomy science image format to PNG)
    - Tool 68: `document/gml-to-geojson` (Geography Markup Language `.gml` OGC/INSPIRE XML to RFC 7946 GeoJSON)
    - Tool 69: `audio/mod-to-wav` (Commodore Amiga ProTracker / SoundTracker `.mod` 4-channel module music to 16-bit stereo WAV)
25. **Wave 25 (Shipped):**
    - Tool 70: `document/vtt-to-srt` (WebVTT subtitle format to SubRip SRT converter)
    - Tool 71: `image/svgz-to-svg` (Gzip-compressed SVG `.svgz` to uncompressed SVG)
    - Tool 72: `audio/caf-to-wav` (Apple Core Audio Format `.caf` 64-bit audio to standard RIFF WAV)
26. **Wave 26 (Shipped):**
    - Tool 73: `image/ppm-to-png` (Netpbm PPM, PGM, PBM, and PNM raster conversion engine to PNG)
    - Tool 74: `document/cbz-to-pdf` (Comic Book ZIP archive `.cbz` reader and sequential page binder to PDF)
    - Tool 75: `document/srt-to-vtt` (SubRip `.srt` subtitles to W3C-standard HTML5 WebVTT `.vtt`)
27. **Wave 27 (Shipped):**
    - Tool 76: `image/ico-to-png` (Microsoft Windows Icon and favicon `.ico` multi-resolution frame decoder to PNG)
    - Tool 77: `document/epub-to-markdown` (EPUB electronic publication book unpacker and semantic Markdown converter)
    - Tool 78: `audio/8svx-to-wav` (Commodore Amiga IFF 8SVX 8-bit & Fibonacci-delta audio decoder to RIFF WAV)
28. **Wave 28 (Shipped):**
    - Tool 79: `image/tim-to-png` (Sony PlayStation 1 PSX `.tim` texture & sprite format to lossless 32-bit RGBA PNG)
    - Tool 80: `document/rtf-to-markdown` (Microsoft Rich Text Format `.rtf` document to clean semantic Markdown)
    - Tool 81: `audio/dsp-to-wav` (Nintendo GameCube & Wii DSP ADPCM audio `.dsp` to 16-bit linear PCM WAV)
29. **Wave 29 (Shipped):**
    - Tool 82: `image/macpaint-to-png` (Apple Macintosh MacPaint 1-bit `.mac` / `.pntg` PackBits RLE graphics to 32-bit PNG)
    - Tool 83: `document/latex-to-markdown` (LaTeX `.tex` document equations, sections, and formatting to GitHub Flavored Markdown)
    - Tool 84: `audio/vox-to-wav` (Dialogic / OKI ADPCM 4-bit telephony voice audio `.vox` to 16-bit linear PCM WAV)
30. **Wave 30 (Shipped):**
    - Tool 85: `image/zx-to-png` (Sinclair ZX Spectrum `.scr` 6,912-byte display memory to 32-bit RGBA PNG)
    - Tool 86: `document/gedcom-to-csv` (GEDCOM genealogy `.ged` family tree records and relationships to RFC 4180 CSV)
    - Tool 87: `audio/ulaw-to-wav` (ITU-T G.711 mu-law & A-law `.ulaw`/`.alaw` telephony audio to 16-bit linear PCM WAV)
31. **Wave 31 (Shipped):**
    - Tool 88: `image/koa-to-png` (Commodore 64 KoalaPainter `.koa` 10,003-byte multicolor bitmap to 32-bit RGBA PNG)
    - Tool 89: `document/aco-to-css` (Adobe Photoshop Color Palette `.aco` v1/v2 binary swatches to CSS variables & Tailwind config)
    - Tool 90: `audio/vag-to-wav` (Sony PlayStation 1 & 2 PSX `.vag` / `.vagp` ADPCM audio to 16-bit linear PCM WAV)
32. **Wave 32 (Shipped):**
    - Tool 91: `document/bibtex-to-markdown` (BibTeX `.bib` academic bibliography citations to clean Markdown tables & reading lists)
    - Tool 92: `image/degas-to-png` (Atari ST DEGAS & DEGAS Elite `.pi1`–`.pi3`, `.pc1`–`.pc3` pictures to 32-bit RGBA PNG)
    - Tool 93: `audio/aud-to-wav` (Westwood Studios RTS Game Audio `.aud` Command & Conquer / Red Alert WS-ADPCM to linear PCM WAV)
33. **Wave 33 (Shipped):**
    - Tool 94: `audio/avr-to-wav` (Atari ST & Falcon030 Audio Visual Research `.avr` digital audio to 16-bit linear PCM WAV)
    - Tool 95: `document/nfo-to-html` (IBM CP437 ASCII/ANSI demoscene release art `.nfo` & `.diz` to styled HTML & UTF-8 text)
    - Tool 96: `image/chr-to-png` (NES / Famicom 2bpp planar character tile ROM `.chr` to 32-bit RGBA PNG sprite sheet)
34. **Wave 34 (Shipped):**
    - Tool 97: `audio/xm-to-wav` (FastTracker II `.xm` extended module tracker music to 16-bit stereo WAV)
    - Tool 98: `document/org-to-markdown` (Emacs Org Mode `.org` agenda and documentation to GitHub Flavored Markdown)
    - Tool 99: `image/dcm-to-png` (DICOM `.dcm` medical diagnostic imaging to 32-bit PNG)
35. **Wave 35 (Shipped):**
    - Tool 100: `image/cgm-to-svg` (Computer Graphics Metafile `.cgm` ISO vector graphics to clean W3C SVG) — **100-Tool Landmark Milestone**
    - Tool 101: `audio/s3m-to-wav` (Scream Tracker 3 `.s3m` 32-channel tracker music to 16-bit stereo WAV)
    - Tool 102: `document/enex-to-markdown` (Evernote XML Export `.enex` notes to GitHub Flavored Markdown with YAML frontmatter)
36. **Wave 36 (Shipped):**
    - Tool 103: `audio/it-to-wav` (Impulse Tracker `.it` 64-channel module music to 16-bit linear stereo WAV)
    - Tool 104: `document/opml-to-markdown` (Outline Processor Markup Language `.opml` RSS feeds and outlines to GFM tables and lists)
    - Tool 105: `image/ora-to-png` (OpenRaster `.ora` layered graphics archive to 32-bit RGBA PNG)
37. **Wave 37 (Shipped):**
    - Tool 106: `document/fb2-to-markdown` (FictionBook 2.0 `.fb2` e-book XML format to Markdown) — **Shipped**
    - Tool 107: `image/qoi-to-png` (Quite OK Image `.qoi` lossless fast decompressor to 32-bit RGBA PNG) — **Shipped**
    - Tool 108: `audio/ptm-to-wav` (PolyTracker `.ptm` multi-channel module music to 16-bit stereo WAV) — **Shipped**
38. **Wave 38 (Shipped):**
    - Tool 109: `image/hdr-to-png` (Radiance RGBE `.hdr`/`.pic` high dynamic range image decompressor to 32-bit RGBA PNG) — **Shipped**
    - Tool 110: `document/pdb-to-markdown` (Palm OS PalmDoc `.pdb`/`.prc` e-book database unpacker and LZ77 decompressor to GFM Markdown) — **Shipped**
    - Tool 111: `image/neo-to-png` (Atari ST NeoChrome `.neo` 4-bitplane planar graphics decoder to 32-bit RGBA PNG) — **Shipped**
39. **Wave 39 (Active Wave / Proposed Candidates):**
    - Candidate 1 / Tool 112: `audio/far-to-wav` (Farandole Composer `.far` 16-channel DOS module tracker to 16-bit stereo WAV)
    - Candidate 2 / Tool 113: `document/abw-to-markdown` (AbiWord `.abw` XML document and formatting unpacker to GitHub Flavored Markdown)
    - Candidate 3 / Tool 114: `image/art-to-png` (Commodore 64 Advanced Art Studio `.art` hires/multicolor graphics decoder to 32-bit RGBA PNG)



