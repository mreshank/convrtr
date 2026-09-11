import { meta as appleMacpaintRetroGraphicsDecoding } from "./apple-macpaint-retro-graphics-decoding/meta";
import { meta as convertWhatsappWechatSilkToWavMp3 } from "./convert-whatsapp-wechat-silk-to-wav-mp3/meta";
import { meta as convertingGedcomFamilyTreeToCsv } from "./converting-gedcom-family-tree-to-csv/meta";
import { meta as convertingGoodnotesToPdfWithoutApp } from "./converting-goodnotes-to-pdf-without-app/meta";
import { meta as convertingTelephonyUlawAlawToWav } from "./converting-telephony-ulaw-alaw-to-wav/meta";
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
