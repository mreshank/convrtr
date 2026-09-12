import type {
	NfoConversionResult,
	NfoMetadata,
	NfoToHtmlOptions,
} from "./types";

// Official IBM PC Code Page 437 (CP437) byte-to-Unicode mapping table for bytes 0x80 to 0xFF
const CP437_EXTENDED = [
	// 0x80 - 0x8F
	"Ç",
	"ü",
	"é",
	"â",
	"ä",
	"à",
	"å",
	"ç",
	"ê",
	"ë",
	"è",
	"ï",
	"î",
	"ì",
	"Ä",
	"Å",
	// 0x90 - 0x9F
	"É",
	"æ",
	"Æ",
	"ô",
	"ö",
	"ò",
	"û",
	"ù",
	"ÿ",
	"Ö",
	"Ü",
	"¢",
	"£",
	"¥",
	"₧",
	"ƒ",
	// 0xA0 - 0xAF
	"á",
	"í",
	"ó",
	"ú",
	"ñ",
	"Ñ",
	"ª",
	"º",
	"¿",
	"⌐",
	"¬",
	"½",
	"¼",
	"¡",
	"«",
	"»",
	// 0xB0 - 0xBF (Light/Medium/Dark shades & box single vertical/corners)
	"░",
	"▒",
	"▓",
	"│",
	"┤",
	"╡",
	"╢",
	"╖",
	"╕",
	"╣",
	"║",
	"╗",
	"╝",
	"╜",
	"╛",
	"┐",
	// 0xC0 - 0xCF (Box single/double lines, tees, corners, crossings)
	"└",
	"┴",
	"┬",
	"├",
	"─",
	"┼",
	"╞",
	"╟",
	"╚",
	"╔",
	"╩",
	"╦",
	"╠",
	"═",
	"╬",
	"╧",
	// 0xD0 - 0xDF (Box double/single combinations & full/half blocks)
	"╨",
	"╤",
	"╥",
	"╙",
	"╘",
	"╒",
	"╓",
	"╫",
	"╪",
	"┘",
	"┌",
	"█",
	"▄",
	"▌",
	"▐",
	"▀",
	// 0xE0 - 0xEF (Greek mathematical symbols)
	"α",
	"ß",
	"Γ",
	"π",
	"Σ",
	"σ",
	"µ",
	"τ",
	"Φ",
	"Θ",
	"Ω",
	"δ",
	"∞",
	"φ",
	"ε",
	"∩",
	// 0xF0 - 0xFF (Math operators, bullet, square root, powers, NBSP)
	"≡",
	"±",
	"≥",
	"≤",
	"⌠",
	"⌡",
	"÷",
	"≈",
	"°",
	"∙",
	"·",
	"√",
	"ⁿ",
	"²",
	"■",
	"\u00A0",
];

// CP437 glyphs for control codes 0x01 to 0x1F (when used in graphic ASCII art)
const CP437_LOW_GRAPHICS: Record<number, string> = {
	1: "☺",
	2: "☻",
	3: "♥",
	4: "♦",
	5: "♣",
	6: "♠",
	7: "•",
	8: "◘",
	11: "♂",
	12: "♀",
	14: "♫",
	15: "☼",
	16: "►",
	17: "◄",
	18: "↕",
	19: "‼",
	20: "¶",
	21: "§",
	22: "▬",
	23: "↨",
	24: "↑",
	25: "↓",
	26: "→",
	27: "←",
	28: "∟",
	29: "↔",
	30: "▲",
	31: "▼",
	127: "⌂",
};

/**
 * Decodes raw CP437 bytes into a UTF-8 string with block and box-drawing characters preserved.
 */
export function decodeCp437(bytes: Uint8Array): {
	text: string;
	boxCharCount: number;
} {
	let out = "";
	let boxCharCount = 0;

	for (let i = 0; i < bytes.length; i++) {
		const b = bytes[i] ?? 0;

		// Preserve standard whitespace and line breaks
		if (b === 0x0a || b === 0x0d || b === 0x09) {
			out += String.fromCharCode(b);
			continue;
		}

		if (b === 0x00) {
			// Skip null bytes
			continue;
		}

		if (b < 0x20) {
			// Low graphics symbols in ANSI art
			const glyph = CP437_LOW_GRAPHICS[b];
			if (glyph) {
				out += glyph;
				boxCharCount++;
			} else {
				out += " ";
			}
		} else if (b === 0x7f) {
			out += "⌂";
			boxCharCount++;
		} else if (b < 0x80) {
			// Standard printable ASCII
			out += String.fromCharCode(b);
		} else {
			// Extended CP437 (0x80 - 0xFF)
			const char = CP437_EXTENDED[b - 0x80] ?? " ";
			out += char;
			// Check if box drawing, shade, or block element
			if (b >= 0xb0 && b <= 0xdf) {
				boxCharCount++;
			}
		}
	}

	return { text: out, boxCharCount };
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function toHexColor(r: number, g: number, b: number): string {
	const c = (n: number) => n.toString(16).padStart(2, "0");
	return `#${c(r)}${c(g)}${c(b)}`;
}

interface ThemePalette {
	bg: [number, number, number];
	fg: [number, number, number];
	border: [number, number, number];
}

const DEFAULT_THEME: ThemePalette = {
	bg: [13, 17, 23],
	fg: [201, 209, 217],
	border: [48, 54, 61],
};

const THEMES: Record<string, ThemePalette> = {
	dark: DEFAULT_THEME,
	matrix: {
		bg: [8, 15, 8],
		fg: [0, 255, 102],
		border: [13, 51, 20],
	},
	amber: {
		bg: [18, 12, 2],
		fg: [255, 176, 0],
		border: [61, 40, 0],
	},
	plain: {
		bg: [255, 255, 255],
		fg: [31, 35, 40],
		border: [208, 215, 222],
	},
};

/**
 * Converts an NFO / DIZ file (IBM CP437 encoded) into styled HTML or clean UTF-8 text.
 */
export function convertNfoToHtml(
	input: Uint8Array | ArrayBuffer,
	options: NfoToHtmlOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): NfoConversionResult {
	onProgress?.(0.1, "READ_INPUT");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	onProgress?.(0.3, "DECODE_CP437");
	const { text, boxCharCount } = decodeCp437(bytes);

	const lines = text.split(/\r?\n/);
	const lineCount = lines.length;
	const charCount = text.length;
	const hasAnsiArt = boxCharCount > 10;

	const metadata: NfoMetadata = {
		lineCount,
		charCount,
		boxCharCount,
		hasAnsiArt,
		encoding: "IBM Code Page 437 (CP437)",
	};

	if (options.format === "txt") {
		onProgress?.(1.0, "COMPLETE");
		return {
			metadata,
			content: text,
		};
	}

	onProgress?.(0.7, "RENDER_HTML");

	const themeKey = options.theme ?? "dark";
	const selectedTheme = THEMES[themeKey] ?? DEFAULT_THEME;
	const bg = toHexColor(
		selectedTheme.bg[0],
		selectedTheme.bg[1],
		selectedTheme.bg[2],
	);
	const fg = toHexColor(
		selectedTheme.fg[0],
		selectedTheme.fg[1],
		selectedTheme.fg[2],
	);
	const border = toHexColor(
		selectedTheme.border[0],
		selectedTheme.border[1],
		selectedTheme.border[2],
	);
	const shadow = `${toHexColor(0, 0, 0)}66`;

	const escapedText = escapeHtml(text);

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NFO Viewer</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px 16px;
    background: ${bg};
    color: ${fg};
    font-family: ui-monospace, "Cascadia Code", "Courier New", monospace;
    line-height: 1.25;
    display: flex;
    justify-content: center;
  }
  .nfo-container {
    max-width: 100%;
    overflow-x: auto;
    background: ${bg};
    border: 1px solid ${border};
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 20px ${shadow};
  }
  pre {
    margin: 0;
    font-family: inherit;
    font-size: 13px;
    letter-spacing: 0;
    white-space: pre;
    user-select: text;
  }
</style>
</head>
<body>
  <div class="nfo-container">
    <pre>${escapedText}</pre>
  </div>
</body>
</html>`;

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		content: html,
	};
}
