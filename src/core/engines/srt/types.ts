/**
 * SubRip (.srt) Subtitle Types and Conversion Options
 */

export interface SrtCue {
	id?: string;
	startTime: number; // in seconds
	endTime: number; // in seconds
	startRaw: string; // HH:MM:SS,mmm
	endRaw: string; // HH:MM:SS,mmm
	text: string;
}

export interface SrtToVttOptions {
	/**
	 * Include a NOTE header block in WebVTT indicating local conversion.
	 * Default: true
	 */
	includeNoteHeader?: boolean;
	/**
	 * Clean obsolete HTML font tags (<font color="...">) into clean text.
	 * Preserves <b>, <i>, <u> tags.
	 * Default: true
	 */
	cleanFontTags?: boolean;
}

export interface SrtConversionResult {
	vttText: string;
	cueCount: number;
}
