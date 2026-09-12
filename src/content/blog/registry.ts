import { meta as appleMacpaintRetroGraphicsDecoding } from "./apple-macpaint-retro-graphics-decoding/meta";
import { meta as convertWhatsappWechatSilkToWavMp3 } from "./convert-whatsapp-wechat-silk-to-wav-mp3/meta";
import { meta as convertingAdobePhotoshopAcoPaletteToCss } from "./converting-adobe-photoshop-aco-palette-to-css/meta";
import { meta as convertingAtariStAvrAudioToWav } from "./converting-atari-st-avr-audio-to-wav/meta";
import { meta as convertingAtariStDegasToPng } from "./converting-atari-st-degas-to-png/meta";
import { meta as convertingBibtexToMarkdownTables } from "./converting-bibtex-to-markdown-tables/meta";
import { meta as convertingC64KoalaKoaToPng } from "./converting-c64-koala-koa-to-png/meta";
import { meta as convertingCgmToSvg } from "./converting-cgm-to-svg/meta";
import { meta as convertingCp437NfoSceneArtToHtml } from "./converting-cp437-nfo-scene-art-to-html/meta";
import { meta as convertingDicomMedicalImagesToPng } from "./converting-dicom-medical-images-to-png/meta";
import { meta as convertingEmacsOrgModeToMarkdown } from "./converting-emacs-org-mode-to-markdown/meta";
import { meta as convertingEvernoteEnexToMarkdown } from "./converting-evernote-enex-to-markdown/meta";
import { meta as convertingFasttrackerXmModulesToWav } from "./converting-fasttracker-xm-modules-to-wav/meta";
import { meta as convertingFictionbookFb2ToMarkdown } from "./converting-fictionbook-fb2-to-markdown/meta";
import { meta as convertingGedcomFamilyTreeToCsv } from "./converting-gedcom-family-tree-to-csv/meta";
import { meta as convertingGoodnotesToPdfWithoutApp } from "./converting-goodnotes-to-pdf-without-app/meta";
import { meta as convertingImpulseTrackerItToWav } from "./converting-impulse-tracker-it-to-wav/meta";
import { meta as convertingNesChrTileRomToPng } from "./converting-nes-chr-tile-rom-to-png/meta";
import { meta as convertingOpenrasterOraToPng } from "./converting-openraster-ora-to-png/meta";
import { meta as convertingOpmlOutlinesToMarkdown } from "./converting-opml-outlines-to-markdown/meta";
import { meta as convertingPlaystationVagAudioToWav } from "./converting-playstation-vag-audio-to-wav/meta";
import { meta as convertingQuiteOkImageQoiToPng } from "./converting-quite-ok-image-qoi-to-png/meta";
import { meta as convertingScreamTrackerS3mToWav } from "./converting-scream-tracker-s3m-to-wav/meta";
import { meta as convertingTelephonyUlawAlawToWav } from "./converting-telephony-ulaw-alaw-to-wav/meta";
import { meta as convertingWestwoodAudAudioToWav } from "./converting-westwood-aud-audio-to-wav/meta";
import { meta as decodingZxSpectrumScrMemoryDumps } from "./decoding-zx-spectrum-scr-memory-dumps/meta";
import { meta as extractingChmHelpFilesModernSystems } from "./extracting-chm-help-files-modern-systems/meta";
import { meta as extractingGodotPckPackagesBrowser } from "./extracting-godot-pck-packages-browser/meta";
import { meta as garminFitToCsvGeojsonGpsData } from "./garmin-fit-to-csv-geojson-gps-data/meta";
import { meta as howMlwEncryptionWorks } from "./how-mlw-encryption-works/meta";
import { meta as isExtractingMlwVideoLegal } from "./is-extracting-mlw-video-legal/meta";
import { meta as mlwVsOtherCoursePlatformVideoWrappers } from "./mlw-vs-other-course-platform-video-wrappers/meta";
import { meta as recoveringCourseVideosAfterAPlatformShutsDown } from "./recovering-course-videos-after-a-platform-shuts-down/meta";
import { meta as troubleshootingAFailedMlwExtraction } from "./troubleshooting-a-failed-mlw-extraction/meta";
import type { BlogPostMeta } from "./types";
import { meta as unpackingRenpyRpaArchivesBrowser } from "./unpacking-renpy-rpa-archives-browser/meta";
import { meta as whyClientSideWasmConvertersBeatCloud } from "./why-client-side-wasm-converters-beat-cloud/meta";

/**
 * Metadata only — every entry here is a plain object imported from a
 * `meta.ts` file. Content bodies (`content.mdx`/`content.tsx`) are never
 * imported here; only `src/app/blog/[slug]/page.tsx` loads one, per slug,
 * via a dynamic import. Importing every post's body into this file would
 * pull all of them into the build graph of any page that lists posts —
 * the same class of bug `core/registry`'s module-boundary test guards
 * against for tools.
 */
export const BLOG_POSTS: BlogPostMeta[] = [
	howMlwEncryptionWorks,
	recoveringCourseVideosAfterAPlatformShutsDown,
	isExtractingMlwVideoLegal,
	mlwVsOtherCoursePlatformVideoWrappers,
	troubleshootingAFailedMlwExtraction,
	unpackingRenpyRpaArchivesBrowser,
	convertWhatsappWechatSilkToWavMp3,
	whyClientSideWasmConvertersBeatCloud,
	convertingGoodnotesToPdfWithoutApp,
	garminFitToCsvGeojsonGpsData,
	extractingChmHelpFilesModernSystems,
	appleMacpaintRetroGraphicsDecoding,
	extractingGodotPckPackagesBrowser,
	convertingGedcomFamilyTreeToCsv,
	convertingTelephonyUlawAlawToWav,
	decodingZxSpectrumScrMemoryDumps,
	convertingC64KoalaKoaToPng,
	convertingAdobePhotoshopAcoPaletteToCss,
	convertingPlaystationVagAudioToWav,
	convertingBibtexToMarkdownTables,
	convertingAtariStDegasToPng,
	convertingWestwoodAudAudioToWav,
	convertingAtariStAvrAudioToWav,
	convertingCp437NfoSceneArtToHtml,
	convertingNesChrTileRomToPng,
	convertingFasttrackerXmModulesToWav,
	convertingDicomMedicalImagesToPng,
	convertingEmacsOrgModeToMarkdown,
	convertingCgmToSvg,
	convertingScreamTrackerS3mToWav,
	convertingEvernoteEnexToMarkdown,
	convertingImpulseTrackerItToWav,
	convertingOpmlOutlinesToMarkdown,
	convertingOpenrasterOraToPng,
	convertingFictionbookFb2ToMarkdown,
	convertingQuiteOkImageQoiToPng,
];

export function getPost(
	slug: string,
	posts: BlogPostMeta[] = BLOG_POSTS,
): BlogPostMeta | undefined {
	return posts.find((post) => post.slug === slug);
}

export function getPostsByTool(
	toolId: string,
	posts: BlogPostMeta[] = BLOG_POSTS,
): BlogPostMeta[] {
	return posts.filter((post) => post.relatedTools.includes(toolId));
}
