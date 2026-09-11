import { eightSvxToWavEngine } from "./8svx";
import { abrToPngEngine } from "./abr";
import { acoToCssEngine } from "./aco";
import { actToCssEngine } from "./act";
import { adxToWavEngine } from "./adx";
import { aiffToWavEngine } from "./aiff";
import { aniToPngEngine } from "./ani";
import { aseToCssEngine } from "./ase";
import { asepriteToPngEngine } from "./aseprite";
import { assToSrtEngine } from "./ass";
import { auToWavEngine } from "./au";
import { audToWavEngine } from "./aud";
import { avrToWavEngine } from "./avr";
import { createCoverExtractEngine } from "./audio/cover";
import { createAudioExtractionEngine } from "./audio/extract";
import { createFlacDecodeEngine, createFlacEncodeEngine } from "./audio/flac";
import { createAudioLegacyEngine } from "./audio/legacy";
import { createMp3EncodeEngine } from "./audio/mp3";
import {
	createFlacNormaliseEngine,
	createWavNormaliseEngine,
} from "./audio/normalise";
import { createOpusEncodeEngine } from "./audio/opus";
import { createFlacTrimEngine, createWavTrimEngine } from "./audio/trim";
import { createWaveformEngine } from "./audio/waveform";
import { bibtexToMarkdownEngine } from "./bibtex";
import { bspToZipEngine } from "./bsp";
import { cafToWavEngine } from "./caf";
import { cbzToPdfEngine } from "./cbz";
import { cdrToPngEngine } from "./cdr";
import { chmToZipEngine } from "./chm";
import { chrToPngEngine } from "./chr";
import { clipToPngEngine } from "./clip";
import { cueToJsonEngine } from "./cue";
import { curToPngEngine } from "./cur";
import { dcmToPngEngine } from "./dcm";
import { ddsToPngEngine } from "./dds";
import { degasToPngEngine } from "./degas";
import { dsfToWavEngine } from "./dsf";
import { dspToWavEngine } from "./dsp";
import { dxfToSvgEngine } from "./dxf";
import { epubToMarkdownEngine } from "./epub";
import { fitToCsvEngine } from "./fit";
import { fitsToPngEngine } from "./fits";
import { gbrToPngEngine } from "./gbr";
import { gedcomToCsvEngine } from "./gedcom";
import { gmlToGeoJsonEngine } from "./gml";
import { pckToZipEngine } from "./godot";
import { goodnotesToPdfEngine } from "./goodnotes";
import { gpxToGeoJsonEngine } from "./gpx";
import { icnsToPngEngine } from "./icns";
import { icoToPngEngine } from "./ico";
import { iffToPngEngine } from "./iff";
import { createImagePipelineEngine } from "./image";
import { faviconPackEngine } from "./image/packs/favicon";
import { gifFramesEngine } from "./image/packs/gif-frames";
import { IMAGE_DECODERS, IMAGE_ENCODERS } from "./image/registry";
import { ircamToWavEngine } from "./ircam";
import { kmlToGeoJsonEngine } from "./kml";
import { kmzToGeoJsonEngine } from "./kmz";
import { koaToPngEngine } from "./koa";
import { latexToMarkdownEngine } from "./latex";
import { macpaintToPngEngine } from "./macpaint";
import { METADATA_ENGINES } from "./metadata";
import { mhtmlToHtmlEngine } from "./mhtml";
import { microDvdToSrtEngine } from "./microdvd";
import { mlwToMp4Engine } from "./mlw";
import { modToWavEngine } from "./mod";
import { msgToEmlEngine } from "./msg";
import { nistToWavEngine } from "./nist";
import { nfoToHtmlEngine } from "./nfo";
import { orgToMarkdownEngine } from "./org";
import { osmToGeoJsonEngine } from "./osm";
import { pakToZipEngine } from "./pak";
import { pcxToPngEngine } from "./pcx";
import { imageToPdfEngine } from "./pdf/image-to-pdf";
import { createPdfMergeEngine } from "./pdf/merge";
import { createPdfRotateEngine } from "./pdf/rotate";
import { createPdfSplitEngine } from "./pdf/split";
import { ppmToPngEngine } from "./ppm";
import { procreateToMp4Engine, procreateToPngEngine } from "./procreate";
import { rasToPngEngine } from "./ras";
import { rpaToZipEngine } from "./renpy";
import {
	rpgmvmToM4aEngine,
	rpgmvoToOggEngine,
	rpgmvpToPngEngine,
} from "./rpgmaker";
import { rtfToMarkdownEngine } from "./rtf";
import { smiToSrtEngine } from "./sami";
import { scormToZipEngine } from "./scorm";
import { sgiToPngEngine } from "./sgi";
import { silkToWavEngine } from "./silk";
import { sf2ToWavEngine } from "./soundfont";
import { srtToVttEngine } from "./srt";
import { studio3ToSvgEngine } from "./studio";
import { svgOptimiseEngine } from "./svg/optimise";
import { svgzToSvgEngine } from "./svgz";
import { tcxToGeoJsonEngine } from "./tcx";
import { tgaToPngEngine } from "./tga";
import { tgsToJsonEngine } from "./tgs";
import { timToPngEngine } from "./tim";
import type { Engine } from "./types";
import { ulawToWavEngine } from "./ulaw";
import { vagToWavEngine } from "./vag";
import { vcfToCsvEngine } from "./vcf";
import { createVideoConversionEngine } from "./video/convert";
import { createFrameExtractionEngine } from "./video/frame";
import { createGifEngine } from "./video/gif";
import { createLegacyConversionEngine } from "./video/legacy";
import { createVideoTrimEngine } from "./video/trim";
import { vntToTxtEngine } from "./vnt";
import { vocToWavEngine } from "./voc";
import { voxToWavEngine } from "./vox";
import { vtfToPngEngine } from "./vtf";
import { vttToSrtEngine } from "./vtt";
import { wadToZipEngine } from "./wad";
import { pkgToMp4Engine } from "./wallpaper";
import { webArchiveToHtmlEngine } from "./webarchive";
import { wmfToSvgEngine } from "./wmf";
import { xbmToPngEngine } from "./xbm";
import { xmindToMarkdownEngine } from "./xmind";
import { xpmToPngEngine } from "./xpm";
import { xwdToPngEngine } from "./xwd";
import { xmToWavEngine } from "./xm";
import { zxToPngEngine } from "./zx";

export * from "./image";
export * from "./types";

/**
 * Every decoder pairs with every encoder, so the full cross product is
 * registered rather than a hand-written list of the pairs we happen to expose
 * as tools today.
 *
 * This is where the decoder/encoder decomposition pays off: adding one decoder
 * enables conversion from that format to every output we support, and adding
 * one encoder enables it from every input — with no wiring here at all. The
 * alternative, one bespoke engine per pair, would grow multiplicatively and
 * would need editing on every codec addition.
 *
 * Same-format pairs (e.g. `image:png->png`) are included deliberately: they are
 * the re-encode/optimise path, which for PNG means lossless oxipng compression.
 */
function buildImageEngines(): Map<string, Engine> {
	const engines = new Map<string, Engine>();
	for (const decoder of IMAGE_DECODERS.values()) {
		for (const encoder of IMAGE_ENCODERS.values()) {
			const engine = createImagePipelineEngine(decoder.id, encoder.id);
			engines.set(engine.id, engine);
		}
	}

	// Same-format resize variants. Registered only where a format can be both
	// read and written, since a resize writes the image back in the format it
	// arrived in. The resize transform early-returns before touching WASM when
	// no dimensions are set, so these cost nothing when a caller does not ask
	// for a resize.
	for (const decoder of IMAGE_DECODERS.values()) {
		if (!IMAGE_ENCODERS.has(decoder.id)) continue;
		const engine = createImagePipelineEngine(decoder.id, decoder.id, {
			transforms: ["resize"],
		});
		engines.set(engine.id, engine);
	}

	// Byte-level metadata strippers. Not image pipelines: they never decode,
	// which is what lets them remove EXIF without recompressing the photo.
	for (const engine of METADATA_ENGINES) {
		engines.set(engine.id, engine);
	}

	// One-to-many: emits a ZIP so the pipeline, batch runner and save path
	// need no special case for a tool that produces several files.
	engines.set(faviconPackEngine.id, faviconPackEngine);

	// Uses the platform GIF decoder, so it is unavailable in Firefox — probe()
	// feature-detects and the engine simply is not selected there.
	engines.set(gifFramesEngine.id, gifFramesEngine);

	// Rotation is one number per page, so it changes nothing else — unlike
	// tools that rasterise a page in order to turn it.
	{
		const engine = createPdfRotateEngine();
		engines.set(engine.id, engine);
	}

	// Merges PDFs by copying pages, and names what a merge cannot carry —
	// bookmarks and form fields live outside the pages themselves.
	{
		const engine = createPdfMergeEngine();
		engines.set(engine.id, engine);
	}

	// Splits a PDF by copying pages, so text stays text and embedded images keep
	// their bytes — unlike splitters that re-render each page to an image.
	{
		const engine = createPdfSplitEngine();
		engines.set(engine.id, engine);
	}

	// Embeds the image stream directly; never rasterises, so the picture inside
	// the PDF is byte-identical to the input.
	engines.set(imageToPdfEngine.id, imageToPdfEngine);

	// Text in, text out — SVGO on the SVG source, no raster step at all.
	engines.set(svgOptimiseEngine.id, svgOptimiseEngine);

	// Format-specific extractors: byte-offset parsing plus Web Crypto, no
	// decode/encode pipeline at all.
	engines.set(mlwToMp4Engine.id, mlwToMp4Engine);
	engines.set(procreateToMp4Engine.id, procreateToMp4Engine);
	engines.set(procreateToPngEngine.id, procreateToPngEngine);
	engines.set(rpgmvpToPngEngine.id, rpgmvpToPngEngine);
	engines.set(rpgmvoToOggEngine.id, rpgmvoToOggEngine);
	engines.set(rpgmvmToM4aEngine.id, rpgmvmToM4aEngine);
	engines.set(tgsToJsonEngine.id, tgsToJsonEngine);
	engines.set(xmindToMarkdownEngine.id, xmindToMarkdownEngine);
	engines.set(clipToPngEngine.id, clipToPngEngine);
	engines.set(pkgToMp4Engine.id, pkgToMp4Engine);
	engines.set(sf2ToWavEngine.id, sf2ToWavEngine);
	engines.set(goodnotesToPdfEngine.id, goodnotesToPdfEngine);
	engines.set(studio3ToSvgEngine.id, studio3ToSvgEngine);
	engines.set(pckToZipEngine.id, pckToZipEngine);
	engines.set(rpaToZipEngine.id, rpaToZipEngine);
	engines.set(msgToEmlEngine.id, msgToEmlEngine);
	engines.set(adxToWavEngine.id, adxToWavEngine);
	engines.set(scormToZipEngine.id, scormToZipEngine);
	engines.set(icnsToPngEngine.id, icnsToPngEngine);
	engines.set(mhtmlToHtmlEngine.id, mhtmlToHtmlEngine);
	engines.set(vcfToCsvEngine.id, vcfToCsvEngine);
	engines.set(ddsToPngEngine.id, ddsToPngEngine);
	engines.set(wadToZipEngine.id, wadToZipEngine);
	engines.set(pakToZipEngine.id, pakToZipEngine);
	engines.set(abrToPngEngine.id, abrToPngEngine);
	engines.set(aniToPngEngine.id, aniToPngEngine);
	engines.set(curToPngEngine.id, curToPngEngine);
	engines.set(aseToCssEngine.id, aseToCssEngine);
	engines.set(fitToCsvEngine.id, fitToCsvEngine);
	engines.set(webArchiveToHtmlEngine.id, webArchiveToHtmlEngine);
	engines.set(vntToTxtEngine.id, vntToTxtEngine);
	engines.set(smiToSrtEngine.id, smiToSrtEngine);
	engines.set(gbrToPngEngine.id, gbrToPngEngine);
	engines.set(cdrToPngEngine.id, cdrToPngEngine);
	engines.set(tgaToPngEngine.id, tgaToPngEngine);
	engines.set(bspToZipEngine.id, bspToZipEngine);
	engines.set(microDvdToSrtEngine.id, microDvdToSrtEngine);
	engines.set(assToSrtEngine.id, assToSrtEngine);
	engines.set(chmToZipEngine.id, chmToZipEngine);
	engines.set(silkToWavEngine.id, silkToWavEngine);
	engines.set(actToCssEngine.id, actToCssEngine);
	engines.set(pcxToPngEngine.id, pcxToPngEngine);
	engines.set(vtfToPngEngine.id, vtfToPngEngine);
	engines.set(asepriteToPngEngine.id, asepriteToPngEngine);
	engines.set(iffToPngEngine.id, iffToPngEngine);
	engines.set(cueToJsonEngine.id, cueToJsonEngine);
	engines.set(dxfToSvgEngine.id, dxfToSvgEngine);
	engines.set(xbmToPngEngine.id, xbmToPngEngine);
	engines.set(vocToWavEngine.id, vocToWavEngine);
	engines.set(wmfToSvgEngine.id, wmfToSvgEngine);
	engines.set(gpxToGeoJsonEngine.id, gpxToGeoJsonEngine);
	engines.set(auToWavEngine.id, auToWavEngine);
	engines.set(xpmToPngEngine.id, xpmToPngEngine);
	engines.set(kmlToGeoJsonEngine.id, kmlToGeoJsonEngine);
	engines.set(aiffToWavEngine.id, aiffToWavEngine);
	engines.set(rasToPngEngine.id, rasToPngEngine);
	engines.set(tcxToGeoJsonEngine.id, tcxToGeoJsonEngine);
	engines.set(ircamToWavEngine.id, ircamToWavEngine);
	engines.set(sgiToPngEngine.id, sgiToPngEngine);
	engines.set(kmzToGeoJsonEngine.id, kmzToGeoJsonEngine);
	engines.set(nistToWavEngine.id, nistToWavEngine);
	engines.set(xwdToPngEngine.id, xwdToPngEngine);
	engines.set(osmToGeoJsonEngine.id, osmToGeoJsonEngine);
	engines.set(dsfToWavEngine.id, dsfToWavEngine);
	engines.set(fitsToPngEngine.id, fitsToPngEngine);
	engines.set(gmlToGeoJsonEngine.id, gmlToGeoJsonEngine);
	engines.set(modToWavEngine.id, modToWavEngine);
	engines.set(vttToSrtEngine.id, vttToSrtEngine);
	engines.set(svgzToSvgEngine.id, svgzToSvgEngine);
	engines.set(cafToWavEngine.id, cafToWavEngine);
	engines.set(ppmToPngEngine.id, ppmToPngEngine);
	engines.set(cbzToPdfEngine.id, cbzToPdfEngine);
	engines.set(srtToVttEngine.id, srtToVttEngine);
	engines.set(icoToPngEngine.id, icoToPngEngine);
	engines.set(epubToMarkdownEngine.id, epubToMarkdownEngine);
	engines.set(eightSvxToWavEngine.id, eightSvxToWavEngine);
	engines.set(timToPngEngine.id, timToPngEngine);
	engines.set(rtfToMarkdownEngine.id, rtfToMarkdownEngine);
	engines.set(dspToWavEngine.id, dspToWavEngine);
	engines.set(macpaintToPngEngine.id, macpaintToPngEngine);
	engines.set(latexToMarkdownEngine.id, latexToMarkdownEngine);
	engines.set(voxToWavEngine.id, voxToWavEngine);
	engines.set(gedcomToCsvEngine.id, gedcomToCsvEngine);
	engines.set(ulawToWavEngine.id, ulawToWavEngine);
	engines.set(zxToPngEngine.id, zxToPngEngine);
	engines.set(koaToPngEngine.id, koaToPngEngine);
	engines.set(acoToCssEngine.id, acoToCssEngine);
	engines.set(vagToWavEngine.id, vagToWavEngine);
	engines.set(bibtexToMarkdownEngine.id, bibtexToMarkdownEngine);
	engines.set(degasToPngEngine.id, degasToPngEngine);
	engines.set(audToWavEngine.id, audToWavEngine);
	engines.set(avrToWavEngine.id, avrToWavEngine);
	engines.set(nfoToHtmlEngine.id, nfoToHtmlEngine);
	engines.set(chrToPngEngine.id, chrToPngEngine);
	engines.set(orgToMarkdownEngine.id, orgToMarkdownEngine);
	engines.set(dcmToPngEngine.id, dcmToPngEngine);
	engines.set(xmToWavEngine.id, xmToWavEngine);
	{
		const engine = createAudioLegacyEngine("opus", "mp3");
		engines.set(engine.id, engine);
	}

	// Container conversions. mediabunny copies encoded samples wherever the
	// target can carry them and only re-encodes when it cannot, so mkv->mp4 and
	// mov->mp4 are typically pure remuxes finishing in seconds.
	for (const [from, to] of [
		["mkv", "mp4"],
		["mov", "mp4"],
		["webm", "mp4"],
		["mp4", "webm"],
	] as const) {
		const engine = createVideoConversionEngine(to, from);
		engines.set(engine.id, engine);
	}

	// Waveform drawings. The only audio tool with no fidelity claim to make —
	// it produces a picture of audio, not audio.
	for (const format of ["wav", "flac"] as const) {
		const engine = createWaveformEngine(format);
		engines.set(engine.id, engine);
	}

	// Loudness normalisation to EBU R128. The one audio tool that changes every
	// sample on purpose — and refuses to clip in order to hit a target.
	for (const engine of [
		createWavNormaliseEngine(),
		createFlacNormaliseEngine(),
	]) {
		engines.set(engine.id, engine);
	}

	// Audio trimming. Unlike the video trim this is sample-exact: audio samples
	// do not depend on the ones before them, so the cut lands precisely where it
	// was asked for.
	for (const engine of [createWavTrimEngine(), createFlacTrimEngine()]) {
		engines.set(engine.id, engine);
	}

	// Opus. Lossy like MP3 but roughly half the bitrate for the same quality,
	// and encoded by the browser itself — no codec library ships for it.
	{
		const engine = createOpusEncodeEngine();
		engines.set(engine.id, engine);
	}

	// MP3. The most-asked-for audio conversion, and the one that cannot be
	// lossless — the tool says so, and points at FLAC for anyone who wanted
	// "smaller" rather than "smaller and lossy".
	{
		const engine = createMp3EncodeEngine();
		engines.set(engine.id, engine);
	}

	// Embedded artwork, copied out exactly as it was stored rather than
	// re-encoded. The engine reports whether it found a JPEG or a PNG, since
	// the tool cannot know in advance.
	for (const format of ["mp3", "flac"] as const) {
		const engine = createCoverExtractEngine(format);
		engines.set(engine.id, engine);
	}

	// FLAC. The audio pack's lossless pair: WAV in, roughly half the bytes out,
	// and the identical samples back again — proven by round-trip rather than
	// asserted.
	for (const engine of [createFlacEncodeEngine(), createFlacDecodeEngine()]) {
		engines.set(engine.id, engine);
	}

	// Audio extraction. The audio track is copied out untouched wherever the
	// target container can carry the codec, which for MP4's AAC into .m4a is
	// the common case — the operation almost every other converter answers
	// with a re-encode to MP3.
	// The ffmpeg.wasm tier, for containers no browser API can read. Registered
	// like any other engine, but its 31MB core is fetched only after the user
	// agrees — see `heavyDownloadMb` on the tools that use it.
	for (const from of ["avi", "flv", "wmv", "dav", "h264"] as const) {
		const engine = createLegacyConversionEngine(from, "mp4");
		engines.set(engine.id, engine);
	}

	// Video to animated GIF. The only video tool that cannot claim losslessness
	// — GIF holds 256 colours where the source holds millions — so the options
	// are about how that loss is spent rather than whether it happens.
	for (const container of ["mp4", "mkv", "webm"] as const) {
		const engine = createGifEngine(container);
		engines.set(engine.id, engine);
	}

	// Single-frame extraction. This one genuinely decodes — a still cannot be
	// made from a copied inter-frame packet — but only from the preceding
	// keyframe forward, not through the whole file.
	for (const container of ["mp4", "mkv", "webm"] as const) {
		const engine = createFrameExtractionEngine(container);
		engines.set(engine.id, engine);
	}

	// Trimming. Not a `Conversion` with a trim option — that re-encodes, since
	// its copy path requires starting at the file's first timestamp. These copy
	// packets directly, so a cut costs nothing in quality.
	for (const container of ["mp4", "mkv", "webm"] as const) {
		const engine = createVideoTrimEngine(container);
		engines.set(engine.id, engine);
	}

	for (const [from, to] of [
		["mp4", "m4a"],
		["mkv", "m4a"],
		["mov", "m4a"],
		["webm", "ogg"],
	] as const) {
		const engine = createAudioExtractionEngine(from, to);
		engines.set(engine.id, engine);
	}

	return engines;
}

export const ENGINES: Map<string, Engine> = buildImageEngines();

export function getEngine(id: string): Engine | undefined {
	return ENGINES.get(id);
}

export async function selectEngine(
	ids: string[],
	registry: Map<string, Engine> = ENGINES,
): Promise<Engine | undefined> {
	for (const id of ids) {
		const engine = registry.get(id);
		if (engine && (await engine.probe())) return engine;
	}
	return undefined;
}

export { eightSvxToWavEngine } from "./8svx";
export { acoToCssEngine } from "./aco";
export { actToCssEngine } from "./act";
export { aiffToWavEngine } from "./aiff";
export { asepriteToPngEngine } from "./aseprite";
export { assToSrtEngine } from "./ass";
export { auToWavEngine } from "./au";
export { audToWavEngine } from "./aud";
export { avrToWavEngine } from "./avr";
export { bibtexToMarkdownEngine } from "./bibtex";
export { bspToZipEngine } from "./bsp";
export { cafToWavEngine } from "./caf";
export { cbzToPdfEngine } from "./cbz";
export { cdrToPngEngine } from "./cdr";
export { chmToZipEngine } from "./chm";
export { chrToPngEngine } from "./chr";
export { cueToJsonEngine } from "./cue";
export { dcmToPngEngine } from "./dcm";
export { degasToPngEngine } from "./degas";
export { dsfToWavEngine } from "./dsf";
export { dxfToSvgEngine } from "./dxf";
export { epubToMarkdownEngine } from "./epub";
export { fitsToPngEngine } from "./fits";
export { gbrToPngEngine } from "./gbr";
export { gedcomToCsvEngine } from "./gedcom";
export { gmlToGeoJsonEngine } from "./gml";
export { gpxToGeoJsonEngine } from "./gpx";
export { icoToPngEngine } from "./ico";
export { iffToPngEngine } from "./iff";
export { ircamToWavEngine } from "./ircam";
export { kmlToGeoJsonEngine } from "./kml";
export { kmzToGeoJsonEngine } from "./kmz";
export { koaToPngEngine } from "./koa";
export { microDvdToSrtEngine } from "./microdvd";
export { modToWavEngine } from "./mod";
export { nistToWavEngine } from "./nist";
export { nfoToHtmlEngine } from "./nfo";
export { orgToMarkdownEngine } from "./org";
export { osmToGeoJsonEngine } from "./osm";
export { pcxToPngEngine } from "./pcx";
export { ppmToPngEngine } from "./ppm";
export { rasToPngEngine } from "./ras";
export { smiToSrtEngine } from "./sami";
export { sgiToPngEngine } from "./sgi";
export { silkToWavEngine } from "./silk";
export { srtToVttEngine } from "./srt";
export { svgzToSvgEngine } from "./svgz";
export { tcxToGeoJsonEngine } from "./tcx";
export { tgaToPngEngine } from "./tga";
export { ulawToWavEngine } from "./ulaw";
export { vagToWavEngine } from "./vag";
export { vocToWavEngine } from "./voc";
export { vtfToPngEngine } from "./vtf";
export { vttToSrtEngine } from "./vtt";
export { wmfToSvgEngine } from "./wmf";
export { xbmToPngEngine } from "./xbm";
export { xpmToPngEngine } from "./xpm";
export { xwdToPngEngine } from "./xwd";
export { xmToWavEngine } from "./xm";
export { zxToPngEngine } from "./zx";
