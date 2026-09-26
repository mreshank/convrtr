import { eightSvxToWav } from "./tools/audio/8svx-to-wav";
import { sixSixNineToWav } from "./tools/audio/669-to-wav";
import { adxToWav } from "./tools/audio/adx-to-wav";
import { aiffToWav } from "./tools/audio/aiff-to-wav";
import { amfToWav } from "./tools/audio/amf-to-wav";
import { amrToWav } from "./tools/audio/amr-to-wav";
import { auToWav } from "./tools/audio/au-to-wav";
import { audToWav } from "./tools/audio/aud-to-wav";
import { avrToWav } from "./tools/audio/avr-to-wav";
import { cafToWav } from "./tools/audio/caf-to-wav";
import { dsfToWav } from "./tools/audio/dsf-to-wav";
import { dsmToWav } from "./tools/audio/dsm-to-wav";
import { dspToWav } from "./tools/audio/dsp-to-wav";
import { farToWav } from "./tools/audio/far-to-wav";
import { coverArtFLAC } from "./tools/audio/flac-cover-art";
import { flacToWav } from "./tools/audio/flac-to-wav";
import { waveformFLAC } from "./tools/audio/flac-waveform";
import { hmiToWav } from "./tools/audio/hmi-to-wav";
import { imfToWav } from "./tools/audio/imf-to-wav";
import { ircamToWav } from "./tools/audio/ircam-to-wav";
import { itToWav } from "./tools/audio/it-to-wav";
import { modToWav } from "./tools/audio/mod-to-wav";
import { coverArtMP3 } from "./tools/audio/mp3-cover-art";
import { mp4ToM4a } from "./tools/audio/mp4-to-m4a";
import { mtmToWav } from "./tools/audio/mtm-to-wav";
import { nistToWav } from "./tools/audio/nist-to-wav";
import { normaliseFLAC } from "./tools/audio/normalise-flac";
import { normaliseWAV } from "./tools/audio/normalise-wav";
import { oktToWav } from "./tools/audio/okt-to-wav";
import { opusToMp3 } from "./tools/audio/opus-to-mp3";
import { ptmToWav } from "./tools/audio/ptm-to-wav";
import { radToWav } from "./tools/audio/rad-to-wav";
import { removeTagsFlac } from "./tools/audio/remove-tags-flac";
import { removeTagsMp3 } from "./tools/audio/remove-tags-mp3";
import { rolToWav } from "./tools/audio/rol-to-wav";
import { rpgmvmToM4a } from "./tools/audio/rpgmvm-to-m4a";
import { rpgmvoToOgg } from "./tools/audio/rpgmvo-to-ogg";
import { s3mToWav } from "./tools/audio/s3m-to-wav";
import { sf2ToWav } from "./tools/audio/sf2-to-wav";
import { silkToWav } from "./tools/audio/silk-to-wav";
import { stmToWav } from "./tools/audio/stm-to-wav";
import { styToMid } from "./tools/audio/sty-to-mid";
import { trimFlac } from "./tools/audio/trim-flac";
import { trimWav } from "./tools/audio/trim-wav";
import { ulawToWav } from "./tools/audio/ulaw-to-wav";
import { ultToWav } from "./tools/audio/ult-to-wav";
import { vagToWav } from "./tools/audio/vag-to-wav";
import { vocToWav } from "./tools/audio/voc-to-wav";
import { voxToWav } from "./tools/audio/vox-to-wav";
import { wavToFlac } from "./tools/audio/wav-to-flac";
import { wavToMp3 } from "./tools/audio/wav-to-mp3";
import { wavToOpus } from "./tools/audio/wav-to-opus";
import { waveformWAV } from "./tools/audio/wav-waveform";
import { xmToWav } from "./tools/audio/xm-to-wav";
import { xmiToWav } from "./tools/audio/xmi-to-wav";
import { avifToJpg } from "./tools/avif-to-jpg";
import { avifToPng } from "./tools/avif-to-png";
import { compressJpg } from "./tools/compress-jpg";
import { ti8xpToTxt } from "./tools/document/8xp-to-txt";
import { abwToMarkdown } from "./tools/document/abw-to-markdown";
import { acoToCss } from "./tools/document/aco-to-css";
import { actToCss } from "./tools/document/act-to-css";
import { adifToCsv } from "./tools/document/adif-to-csv";
import { alsToJson } from "./tools/document/als-to-json";
import { arrowToCsv } from "./tools/document/arrow-to-csv";
import { ascToCsv } from "./tools/document/asc-to-csv";
import { aseToCss } from "./tools/document/ase-to-css";
import { assToSrt } from "./tools/document/ass-to-srt";
import { bibtexToMarkdown } from "./tools/document/bibtex-to-markdown";
import { bspToZip } from "./tools/document/bsp-to-zip";
import { bupToZip } from "./tools/document/bup-to-zip";
import { canvasToMarkdown } from "./tools/document/canvas-to-markdown";
import { cb7ToPdf } from "./tools/document/cb7-to-pdf";
import { cbrToPdf } from "./tools/document/cbr-to-pdf";
import { cbtToPdf } from "./tools/document/cbt-to-pdf";
import { cbzToPdf } from "./tools/document/cbz-to-pdf";
import { chmToZip } from "./tools/document/chm-to-zip";
import { cifToJson } from "./tools/document/cif-to-json";
import { cueToJson } from "./tools/document/cue-to-json";
import { cwkToMarkdown } from "./tools/document/cwk-to-markdown";
import { dbfToCsv } from "./tools/document/dbf-to-csv";
import { discordToMarkdown } from "./tools/document/discord-to-markdown";
import { djiToCsv } from "./tools/document/dji-to-csv";
import { dtaToZip } from "./tools/document/dta-to-zip";
import { dxfToSvg } from "./tools/document/dxf-to-svg";
import { emlToTxt } from "./tools/document/eml-to-txt";
import { emlxToEml } from "./tools/document/emlx-to-eml";
import { enexToMarkdown } from "./tools/document/enex-to-markdown";
import { epubToMarkdown } from "./tools/document/epub-to-markdown";
import { fb2ToMarkdown } from "./tools/document/fb2-to-markdown";
import { fitToCsv } from "./tools/document/fit-to-csv";
import { gciToJson } from "./tools/document/gci-to-json";
import { gedcomToCsv } from "./tools/document/gedcom-to-csv";
import { gmlToGeoJson } from "./tools/document/gml-to-geojson";
import { goodnotesToPdf } from "./tools/document/goodnotes-to-pdf";
import { gpkgToGeoJson } from "./tools/document/gpkg-to-geojson";
import { gpmfToCsv } from "./tools/document/gpmf-to-csv";
import { gpxToGeoJson } from "./tools/document/gpx-to-geojson";
import { hwpToMarkdown } from "./tools/document/hwp-to-markdown";
import { icsToCsv } from "./tools/document/ics-to-csv";
import { igcToGpx } from "./tools/document/igc-to-gpx";
import { isoToZip } from "./tools/document/iso-to-zip";
import { keyToZip } from "./tools/document/key-to-zip";
import { kmlToGeoJson } from "./tools/document/kml-to-geojson";
import { kmzToGeoJson } from "./tools/document/kmz-to-geojson";
import { latexToMarkdown } from "./tools/document/latex-to-markdown";
import { ldifToCsv } from "./tools/document/ldif-to-csv";
import { lrcToSrt } from "./tools/document/lrc-to-srt";
import { lyxToMarkdown } from "./tools/document/lyx-to-markdown";
import { manToMarkdown } from "./tools/document/man-to-markdown";
import { matToZip } from "./tools/document/mat-to-zip";
import { mboxToZip } from "./tools/document/mbox-to-zip";
import { mcrToZip } from "./tools/document/mcr-to-zip";
import { mhtmlToHtml } from "./tools/document/mhtml-to-html";
import { mmapToMarkdown } from "./tools/document/mmap-to-markdown";
import { mobiToMarkdown } from "./tools/document/mobi-to-markdown";
import { msgToEml } from "./tools/document/msg-to-eml";
import { nbToMarkdown } from "./tools/document/nb-to-markdown";
import { nfoToHtml } from "./tools/document/nfo-to-html";
import { nscriptToTxt } from "./tools/document/nscript-to-txt";
import { ofxToCsv } from "./tools/document/ofx-to-csv";
import { opmlToMarkdown } from "./tools/document/opml-to-markdown";
import { orgToMarkdown } from "./tools/document/org-to-markdown";
import { osmToGeoJson } from "./tools/document/osm-to-geojson";
import { pagesToZip } from "./tools/document/pages-to-zip";
import { pakToZip } from "./tools/document/pak-to-zip";
import { parquetToCsv } from "./tools/document/parquet-to-csv";
import { pckToZip } from "./tools/document/pck-to-zip";
import { pdbToMarkdown } from "./tools/document/pdb-to-markdown";
import { psuToZip } from "./tools/document/psu-to-zip";
import { rpaToZip } from "./tools/document/rpa-to-zip";
import { rppToJson } from "./tools/document/rpp-to-json";
import { rtfToMarkdown } from "./tools/document/rtf-to-markdown";
import { rtfdToMarkdown } from "./tools/document/rtfd-to-markdown";
import { savToZip } from "./tools/document/sav-to-zip";
import { sbvToSrt } from "./tools/document/sbv-to-srt";
import { sccToSrt } from "./tools/document/scc-to-srt";
import { scormToZip } from "./tools/document/scorm-to-zip";
import { scrivToMarkdown } from "./tools/document/scriv-to-markdown";
import { sdwToMarkdown } from "./tools/document/sdw-to-markdown";
import { shpToGeoJson } from "./tools/document/shp-to-geojson";
import { smiToSrt } from "./tools/document/smi-to-srt";
import { solToJson } from "./tools/document/sol-to-json";
import { sqliteToZip } from "./tools/document/sqlite-to-zip";
import { srtToVtt } from "./tools/document/srt-to-vtt";
import { stlToSrt } from "./tools/document/stl-to-srt";
import { subToSrt } from "./tools/document/sub-to-srt";
import { sxwToMarkdown } from "./tools/document/sxw-to-markdown";
import { tcxToGeoJson } from "./tools/document/tcx-to-geojson";
import { telegramToMarkdown } from "./tools/document/telegram-to-markdown";
import { texinfoToMarkdown } from "./tools/document/texinfo-to-markdown";
import { torrentToJson } from "./tools/document/torrent-to-json";
import { troffToMarkdown } from "./tools/document/troff-to-markdown";
import { vcdToCsv } from "./tools/document/vcd-to-csv";
import { vcfToCsv } from "./tools/document/vcf-to-csv";
import { vntToTxt } from "./tools/document/vnt-to-txt";
import { vttToSrt } from "./tools/document/vtt-to-srt";
import { wadToZip } from "./tools/document/wad-to-zip";
import { webarchiveToHtml } from "./tools/document/webarchive-to-html";
import { weblocToUrl } from "./tools/document/webloc-to-url";
import { whatsappToMarkdown } from "./tools/document/whatsapp-to-markdown";
import { xmindToMarkdown } from "./tools/document/xmind-to-markdown";
import { xp3ToZip } from "./tools/document/xp3-to-zip";
import { xptToCsv } from "./tools/document/xpt-to-csv";
import { zabwToMarkdown } from "./tools/document/zabw-to-markdown";
import { faviconPack } from "./tools/favicon-pack";
import { gifFrames } from "./tools/gif-frames";
import { heicToJpg } from "./tools/heic-to-jpg";
import { heicToPng } from "./tools/heic-to-png";
import { heicToWebp } from "./tools/heic-to-webp";
import { abrToPng } from "./tools/image/abr-to-png";
import { acbmToPng } from "./tools/image/acbm-to-png";
import { aniToPng } from "./tools/image/ani-to-png";
import { artToPng } from "./tools/image/art-to-png";
import { asepriteToPng } from "./tools/image/aseprite-to-png";
import { blpToPng } from "./tools/image/blp-to-png";
import { bpgToPng } from "./tools/image/bpg-to-png";
import { cdrToPng } from "./tools/image/cdr-to-png";
import { cgmToSvg } from "./tools/image/cgm-to-svg";
import { chrToPng } from "./tools/image/chr-to-png";
import { clipToPng } from "./tools/image/clip-to-png";
import { cpcToPng } from "./tools/image/cpc-to-png";
import { curToPng } from "./tools/image/cur-to-png";
import { dcmToPng } from "./tools/image/dcm-to-png";
import { ddsToPng } from "./tools/image/dds-to-png";
import { degasToPng } from "./tools/image/degas-to-png";
import { drawioToSvg } from "./tools/image/drawio-to-svg";
import { dstToSvg } from "./tools/image/dst-to-svg";
import { excalidrawToSvg } from "./tools/image/excalidraw-to-svg";
import { expToSvg } from "./tools/image/exp-to-svg";
import { fitsToPng } from "./tools/image/fits-to-png";
import { gbToPng } from "./tools/image/gb-to-png";
import { gbrToPng } from "./tools/image/gbr-to-png";
import { hdrToPng } from "./tools/image/hdr-to-png";
import { icnsToPng } from "./tools/image/icns-to-png";
import { icoToPng } from "./tools/image/ico-to-png";
import { iffToPng } from "./tools/image/iff-to-png";
import { jefToSvg } from "./tools/image/jef-to-svg";
import { koaToPng } from "./tools/image/koa-to-png";
import { kraToPng } from "./tools/image/kra-to-png";
import { macpaintToPng } from "./tools/image/macpaint-to-png";
import { mngToPng } from "./tools/image/mng-to-png";
import { ndsToPng } from "./tools/image/nds-to-png";
import { neoToPng } from "./tools/image/neo-to-png";
import { oraToPng } from "./tools/image/ora-to-png";
import { pcdToPng } from "./tools/image/pcd-to-png";
import { pcxToPng } from "./tools/image/pcx-to-png";
import { pltToSvg } from "./tools/image/plt-to-svg";
import { ppmToPng } from "./tools/image/ppm-to-png";
import { procreateToPng } from "./tools/image/procreate-to-png";
import { psdToPng } from "./tools/image/psd-to-png";
import { qoiToPng } from "./tools/image/qoi-to-png";
import { rasToPng } from "./tools/image/ras-to-png";
import { rawToPng } from "./tools/image/raw-to-png";
import { rpgmvpToPng } from "./tools/image/rpgmvp-to-png";
import { sgiToPng } from "./tools/image/sgi-to-png";
import { sketchToPng } from "./tools/image/sketch-to-png";
import { srfToPng } from "./tools/image/srf-to-png";
import { studio3ToSvg } from "./tools/image/studio3-to-svg";
import { svgSpriteSheet } from "./tools/image/svg-sprite-sheet";
import { svgzToSvg } from "./tools/image/svgz-to-svg";
import { tgaToPng } from "./tools/image/tga-to-png";
import { tgsToJson } from "./tools/image/tgs-to-json";
import { thmToJpg } from "./tools/image/thm-to-jpg";
import { timToPng } from "./tools/image/tim-to-png";
import { vdaToPng } from "./tools/image/vda-to-png";
import { vmsToPng } from "./tools/image/vms-to-png";
import { vtfToPng } from "./tools/image/vtf-to-png";
import { walToPng } from "./tools/image/wal-to-png";
import { wmfToSvg } from "./tools/image/wmf-to-svg";
import { xbmToPng } from "./tools/image/xbm-to-png";
import { xcurToPng } from "./tools/image/xcur-to-png";
import { xdToPng } from "./tools/image/xd-to-png";
import { xpmToPng } from "./tools/image/xpm-to-png";
import { xwdToPng } from "./tools/image/xwd-to-png";
import { zxToPng } from "./tools/image/zx-to-png";
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
import { fliToGif } from "./tools/video/fli-to-gif";
import { frameMp4 } from "./tools/video/frame-mp4";
import { h264ToMp4 } from "./tools/video/h264-to-mp4";
import { lrvToMp4 } from "./tools/video/lrv-to-mp4";
import { mkvToMp4 } from "./tools/video/mkv-to-mp4";
import { mlwToMp4 } from "./tools/video/mlw-to-mp4";
import { movToMp4 } from "./tools/video/mov-to-mp4";
import { mp4ToGif } from "./tools/video/mp4-to-gif";
import { mp4ToWebm } from "./tools/video/mp4-to-webm";
import { pkgToMp4 } from "./tools/video/pkg-to-mp4";
import { procreateToMp4 } from "./tools/video/procreate-to-mp4";
import { trimMp4 } from "./tools/video/trim-mp4";
import { vroToMp4 } from "./tools/video/vro-to-mp4";
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
	thmToJpg,
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
	svgSpriteSheet,
	svgzToSvg,
	mlwToMp4,
	lrvToMp4,
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
	fliToGif,
	mp4ToGif,
	aviToMp4,
	vroToMp4,
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
	cafToWav,
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
	scrivToMarkdown,
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
	pagesToZip,
	isoToZip,
	bspToZip,
	chmToZip,
	cueToJson,
	dxfToSvg,
	gpxToGeoJson,
	kmlToGeoJson,
	keyToZip,
	tcxToGeoJson,
	kmzToGeoJson,
	osmToGeoJson,
	gmlToGeoJson,
	vttToSrt,
	ppmToPng,
	cbzToPdf,
	srtToVtt,
	icoToPng,
	epubToMarkdown,
	eightSvxToWav,
	timToPng,
	rtfToMarkdown,
	dspToWav,
	macpaintToPng,
	latexToMarkdown,
	voxToWav,
	zxToPng,
	gedcomToCsv,
	ulawToWav,
	koaToPng,
	acoToCss,
	vagToWav,
	bibtexToMarkdown,
	degasToPng,
	audToWav,
	avrToWav,
	nfoToHtml,
	chrToPng,
	orgToMarkdown,
	dcmToPng,
	xmToWav,
	cgmToSvg,
	s3mToWav,
	enexToMarkdown,
	itToWav,
	fb2ToMarkdown,
	qoiToPng,
	opmlToMarkdown,
	oraToPng,
	ptmToWav,
	hdrToPng,
	pdbToMarkdown,
	neoToPng,
	farToWav,
	abwToMarkdown,
	artToPng,
	sixSixNineToWav,
	hwpToMarkdown,
	acbmToPng,
	amfToWav,
	cwkToMarkdown,
	cpcToPng,
	dsmToWav,
	sxwToMarkdown,
	xcurToPng,
	radToWav,
	sdwToMarkdown,
	bpgToPng,
	oktToWav,
	zabwToMarkdown,
	blpToPng,
	mtmToWav,
	rtfdToMarkdown,
	vdaToPng,
	amrToWav,
	nbToMarkdown,
	walToPng,
	imfToWav,
	lyxToMarkdown,
	srfToPng,
	hmiToWav,
	texinfoToMarkdown,
	mngToPng,
	rolToWav,
	manToMarkdown,
	pcdToPng,
	xmiToWav,
	troffToMarkdown,
	rawToPng,
	kraToPng,
	sketchToPng,
	alsToJson,
	rppToJson,
	whatsappToMarkdown,
	mboxToZip,
	cbtToPdf,
	lrcToSrt,
	telegramToMarkdown,
	discordToMarkdown,
	emlxToEml,
	ofxToCsv,
	stlToSrt,
	styToMid,
	ti8xpToTxt,
	solToJson,
	weblocToUrl,
	nscriptToTxt,
	adifToCsv,
	igcToGpx,
	pltToSvg,
	canvasToMarkdown,
	djiToCsv,
	mmapToMarkdown,
	dstToSvg,
	drawioToSvg,
	excalidrawToSvg,
	sqliteToZip,
	mobiToMarkdown,
	expToSvg,
	shpToGeoJson,
	parquetToCsv,
	psdToPng,
	cb7ToPdf,
	gpmfToCsv,
	cbrToPdf,
	arrowToCsv,
	icsToCsv,
	torrentToJson,
	jefToSvg,
	stmToWav,
	sbvToSrt,
	dbfToCsv,
	matToZip,
	ultToWav,
	dtaToZip,
	ldifToCsv,
	ascToCsv,
	gciToJson,
	mcrToZip,
	sccToSrt,
	vcdToCsv,
	ndsToPng,
	xp3ToZip,
	bupToZip,
	vmsToPng,
	gbToPng,
	psuToZip,
	cifToJson,
	savToZip,
	xptToCsv,
	gpkgToGeoJson,
	xdToPng,
	emlToTxt,
];

export function getTool(id: string): Tool | undefined {
	return TOOLS.find((t) => t.id === id);
}

export function getToolsByCategory(category: Category): Tool[] {
	return TOOLS.filter((t) => t.category === category);
}
