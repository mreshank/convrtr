/**
 * WebVTT (Web Video Text Tracks) Subtitle Types
 * W3C standard format for HTML5 video captions and podcast transcripts.
 */

export interface VttCue {
	id?: string;
	startTime: number; // in seconds
	endTime: number; // in seconds
	startRaw: string;
	endRaw: string;
	settings?: string;
	text: string;
}

export interface VttConversionOptions {
	/**
	 * Remove WebVTT formatting tags (<c>, <v>, timestamp tags).
	 * Preserves standard <b>, <i>, <u> tags for SRT.
	 * Default: true
	 */
	cleanTags?: boolean;
	/**
	 * Convert voice tags like "<v Narrator>Hello" to "Narrator: Hello".
	 * Default: false
	 */
	preserveVoiceAsPrefix?: boolean;
}

export interface VttConversionResult {
	srtText: string;
	cueCount: number;
}
