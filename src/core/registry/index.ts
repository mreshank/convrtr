import { adxToWav } from "./tools/audio/adx-to-wav";
import { aiffToWav } from "./tools/audio/aiff-to-wav";
import { auToWav } from "./tools/audio/au-to-wav";
import { dsfToWav } from "./tools/audio/dsf-to-wav";
import { coverArtFLAC } from "./tools/audio/flac-cover-art";
import { flacToWav } from "./tools/audio/flac-to-wav";
import { waveformFLAC } from "./tools/audio/flac-waveform";
import { ircamToWav } from "./tools/audio/ircam-to-wav";
import { modToWav } from "./tools/audio/mod-to-wav";
import { coverArtMP3 } from "./tools/audio/mp3-cover-art";
import { mp4ToM4a } from "./tools/audio/mp4-to-m4a";
import { nistToWav } from "./tools/audio/nist-to-wav";
import { normaliseFLAC } from "./tools/audio/normalise-flac";
import { normaliseWAV } from "./tools/audio/normalise-wav";
import { opusToMp3 } from "./tools/audio/opus-to-mp3";
import { removeTagsFlac } from "./tools/audio/remove-tags-flac";
import { removeTagsMp3 } from "./tools/audio/remove-tags-mp3";
import { rpgmvmToM4a } from "./tools/audio/rpgmvm-to-m4a";
import { rpgmvoToOgg } from "./tools/audio/rpgmvo-to-ogg";
import { sf2ToWav } from "./tools/audio/sf2-to-wav";
import { silkToWav } from "./tools/audio/silk-to-wav";
import { trimFlac } from "./tools/audio/trim-flac";
import { trimWav } from "./tools/audio/trim-wav";
import { vocToWav } from "./tools/audio/voc-to-wav";
import { wavToFlac } from "./tools/audio/wav-to-flac";
import { wavToMp3 } from "./tools/audio/wav-to-mp3";
import { wavToOpus } from "./tools/audio/wav-to-opus";
import { waveformWAV } from "./tools/audio/wav-waveform";
import { avifToJpg } from "./tools/avif-to-jpg";
import { avifToPng } from "./tools/avif-to-png";
import { compressJpg } from "./tools/compress-jpg";
import { actToCss } from "./tools/document/act-to-css";
import { aseToCss } from "./tools/document/ase-to-css";
import { assToSrt } from "./tools/document/ass-to-srt";
import { bspToZip } from "./tools/document/bsp-to-zip";
import { chmToZip } from "./tools/document/chm-to-zip";
import { cueToJson } from "./tools/document/cue-to-json";
import { dxfToSvg } from "./tools/document/dxf-to-svg";
import { fitToCsv } from "./tools/document/fit-to-csv";
import { gmlToGeoJson } from "./tools/document/gml-to-geojson";
import { goodnotesToPdf } from "./tools/document/goodnotes-to-pdf";
import { gpxToGeoJson } from "./tools/document/gpx-to-geojson";
import { kmlToGeoJson } from "./tools/document/kml-to-geojson";
import { kmzToGeoJson } from "./tools/document/kmz-to-geojson";
import { mhtmlToHtml } from "./tools/document/mhtml-to-html";
import { msgToEml } from "./tools/document/msg-to-eml";
import { osmToGeoJson } from "./tools/document/osm-to-geojson";
import { pakToZip } from "./tools/document/pak-to-zip";
import { pckToZip } from "./tools/document/pck-to-zip";
import { rpaToZip } from "./tools/document/rpa-to-zip";
import { scormToZip } from "./tools/document/scorm-to-zip";
import { smiToSrt } from "./tools/document/smi-to-srt";
import { subToSrt } from "./tools/document/sub-to-srt";
import { tcxToGeoJson } from "./tools/document/tcx-to-geojson";
import { vcfToCsv } from "./tools/document/vcf-to-csv";
import { vntToTxt } from "./tools/document/vnt-to-txt";
import { wadToZip } from "./tools/document/wad-to-zip";
import { webarchiveToHtml } from "./tools/document/webarchive-to-html";
import { xmindToMarkdown } from "./tools/document/xmind-to-markdown";
import { faviconPack } from "./tools/favicon-pack";
import { gifFrames } from "./tools/gif-frames";
import { heicToJpg } from "./tools/heic-to-jpg";
import { heicToPng } from "./tools/heic-to-png";
import { heicToWebp } from "./tools/heic-to-webp";
import { abrToPng } from "./tools/image/abr-to-png";
import { aniToPng } from "./tools/image/ani-to-png";
import { asepriteToPng } from "./tools/image/aseprite-to-png";
import { cdrToPng } from "./tools/image/cdr-to-png";
import { clipToPng } from "./tools/image/clip-to-png";
import { curToPng } from "./tools/image/cur-to-png";
import { ddsToPng } from "./tools/image/dds-to-png";
import { fitsToPng } from "./tools/image/fits-to-png";
import { gbrToPng } from "./tools/image/gbr-to-png";
import { icnsToPng } from "./tools/image/icns-to-png";
import { iffToPng } from "./tools/image/iff-to-png";
import { pcxToPng } from "./tools/image/pcx-to-png";
import { procreateToPng } from "./tools/image/procreate-to-png";
import { rasToPng } from "./tools/image/ras-to-png";
import { rpgmvpToPng } from "./tools/image/rpgmvp-to-png";
import { sgiToPng } from "./tools/image/sgi-to-png";
import { studio3ToSvg } from "./tools/image/studio3-to-svg";
import { tgaToPng } from "./tools/image/tga-to-png";
import { tgsToJson } from "./tools/image/tgs-to-json";
import { vtfToPng } from "./tools/image/vtf-to-png";
import { wmfToSvg } from "./tools/image/wmf-to-svg";
import { xbmToPng } from "./tools/image/xbm-to-png";
import { xpmToPng } from "./tools/image/xpm-to-png";
import { xwdToPng } from "./tools/image/xwd-to-png";
import { jpgToAvif } from "./tools/jpg-to-avif";
import { jpgToJxl } from "./tools/jpg-to-jxl";
import { jpgToPdf } from "./tools/jpg-to-pdf";
import { jpgToPng } from "./tools/jpg-to-png";
import { jpgToWebp } from "./tools/jpg-to-webp";
import { mergePdf } from "./tools/merge-pdf";
import { optimiseSvg } from "./tools/optimise-svg";
import { pngToAvif } from "./tools/png-to-avif";
import { pngToJpg } from "./tools/png-to-jpg";
import { pngToJxl } from "./tools/png-to-jxl";
import { pngToPdf } from "./tools/png-to-pdf";
import { pngToWebp } from "./tools/png-to-webp";
import { removeExifJpg } from "./tools/remove-exif-jpg";
import { removeMetadataPng } from "./tools/remove-metadata-png";
import { resizeJpg } from "./tools/resize-jpg";
import { resizePng } from "./tools/resize-png";
import { resizeWebp } from "./tools/resize-webp";
import { rotatePdf } from "./tools/rotate-pdf";
import { splitPdf } from "./tools/split-pdf";
import { aviToMp4 } from "./tools/video/avi-to-mp4";
import { davToMp4 } from "./tools/video/dav-to-mp4";
import { frameMp4 } from "./tools/video/frame-mp4";
import { h264ToMp4 } from "./tools/video/h264-to-mp4";
import { mkvToMp4 } from "./tools/video/mkv-to-mp4";
import { mlwToMp4 } from "./tools/video/mlw-to-mp4";
import { movToMp4 } from "./tools/video/mov-to-mp4";
import { mp4ToGif } from "./tools/video/mp4-to-gif";
import { mp4ToWebm } from "./tools/video/mp4-to-webm";
import { pkgToMp4 } from "./tools/video/pkg-to-mp4";
import { procreateToMp4 } from "./tools/video/procreate-to-mp4";
import { trimMp4 } from "./tools/video/trim-mp4";
import { webmToMp4 } from "./tools/video/webm-to-mp4";
import { webpToJpg } from "./tools/webp-to-jpg";
import { webpToPng } from "./tools/webp-to-png";
import type { Category, Tool } from "./types";

export * from "./types";

/**
 * The catalogue. Every route, page title, structured-data block, options panel
 * and file-type validation in the product is derived from these declarations,
 * so adding a conversion means adding one file here and nothing in `src/app`.
 *
 * Ordered by input format, then output — this is the order the `/tools` index
 * and the category hubs present them in.
 */
export const TOOLS: Tool[] = [
	heicToJpg,
	heicToPng,
	heicToWebp,
	jpgToPng,
	jpgToWebp,
	jpgToAvif,
	jpgToJxl,
	pngToJpg,
	pngToWebp,
	pngToAvif,
	pngToJxl,
	webpToJpg,
	webpToPng,
	avifToJpg,
	avifToPng,
	resizePng,
	resizeJpg,
	resizeWebp,
	removeExifJpg,
	removeMetadataPng,
	compressJpg,
	faviconPack,
	jpgToPdf,
	pngToPdf,
	optimiseSvg,
	gifFrames,
	procreateToPng,
	rpgmvpToPng,
	tgsToJson,
	clipToPng,
	studio3ToSvg,
	icnsToPng,
	ddsToPng,
	abrToPng,
	aniToPng,
	curToPng,
	gbrToPng,
	cdrToPng,
	tgaToPng,
	pcxToPng,
	vtfToPng,
	asepriteToPng,
	iffToPng,
	xbmToPng,
	wmfToSvg,
	xpmToPng,
	rasToPng,
	sgiToPng,
	xwdToPng,
	fitsToPng,
	mlwToMp4,
	procreateToMp4,
	pkgToMp4,
	davToMp4,
	h264ToMp4,
	mkvToMp4,
	movToMp4,
	webmToMp4,
	mp4ToWebm,
	mp4ToM4a,
	trimMp4,
	frameMp4,
	mp4ToGif,
	aviToMp4,
	wavToFlac,
	flacToWav,
	wavToMp3,
	wavToOpus,
	sf2ToWav,
	adxToWav,
	silkToWav,
	vocToWav,
	auToWav,
	aiffToWav,
	ircamToWav,
	nistToWav,
	dsfToWav,
	modToWav,
	rpgmvoToOgg,
	rpgmvmToM4a,
	opusToMp3,
	trimWav,
	trimFlac,
	removeTagsMp3,
	removeTagsFlac,
	coverArtMP3,
	coverArtFLAC,
	normaliseWAV,
	normaliseFLAC,
	waveformWAV,
	waveformFLAC,
	splitPdf,
	mergePdf,
	rotatePdf,
	xmindToMarkdown,
	goodnotesToPdf,
	pckToZip,
	rpaToZip,
	msgToEml,
	scormToZip,
	mhtmlToHtml,
	vcfToCsv,
	fitToCsv,
	actToCss,
	aseToCss,
	webarchiveToHtml,
	vntToTxt,
	smiToSrt,
	subToSrt,
	assToSrt,
	wadToZip,
	pakToZip,
	bspToZip,
	chmToZip,
	cueToJson,
	dxfToSvg,
	gpxToGeoJson,
	kmlToGeoJson,
	tcxToGeoJson,
	kmzToGeoJson,
	osmToGeoJson,
	gmlToGeoJson,
];

export function getTool(id: string): Tool | undefined {
	return TOOLS.find((t) => t.id === id);
}

export function getToolsByCategory(category: Category): Tool[] {
	return TOOLS.filter((t) => t.category === category);
}
