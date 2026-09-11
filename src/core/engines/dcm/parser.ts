import { encodeRgbaToPng } from "../dds/parser";
import type {
	DcmConversionResult,
	DcmMetadata,
	DcmToPngOptions,
} from "./types";

const LONG_VRS = new Set(["OB", "OW", "OF", "SQ", "UT", "UN"]);

function parseStringValue(bytes: Uint8Array): string {
	let s = new TextDecoder("utf-8").decode(bytes).trim();
	// Strip trailing nulls or padding
	s = s.replace(/\0+$/, "").trim();
	return s;
}

/**
 * Parses a DICOM (.dcm, .dicom) medical image file and decodes its pixel raster
 * into a lossless 32-bit RGBA PNG image with accurate Window/Level contrast curves.
 */
export function convertDcmToPng(
	input: Uint8Array | ArrayBuffer,
	options: DcmToPngOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): DcmConversionResult {
	onProgress?.(0.05, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 132) {
		throw new Error(
			`Invalid DICOM file: File size (${bytes.length} bytes) is too small to contain a standard DICOM header.`,
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// Check standard 128-byte preamble + 'DICM'
	let offset = 0;
	const isStandardDicom =
		bytes[128] === 0x44 && // 'D'
		bytes[129] === 0x49 && // 'I'
		bytes[130] === 0x43 && // 'C'
		bytes[131] === 0x4d; // 'M'

	if (isStandardDicom) {
		offset = 132;
	} else {
		// Check for naked DICOM without 128-byte preamble
		const firstGroup = view.getUint16(0, true);
		if (firstGroup === 0x0002 || firstGroup === 0x0008) {
			offset = 0;
		} else {
			throw new Error("Invalid DICOM file: Missing 'DICM' magic marker at offset 128.");
		}
	}

	let modality = "OT";
	let patientId: string | undefined;
	let studyDate: string | undefined;
	let rows = 0;
	let columns = 0;
	let bitsAllocated = 16;
	let bitsStored = 16;
	let pixelRepresentation = 0; // 0 = unsigned, 1 = signed
	let samplesPerPixel = 1;
	let photometricInterpretation = "MONOCHROME2";
	let windowCenter: number | undefined;
	let windowWidth: number | undefined;
	let rescaleIntercept = 0;
	let rescaleSlope = 1;
	let pixelDataBytes: Uint8Array | undefined;

	onProgress?.(0.15, "PARSE_ELEMENTS");

	while (offset + 4 <= bytes.length) {
		const group = view.getUint16(offset, true);
		const element = view.getUint16(offset + 2, true);
		offset += 4;

		if (offset >= bytes.length) break;

		// Detect Explicit VR vs Implicit VR
		const char0 = bytes[offset] ?? 0;
		const char1 = bytes[offset + 1] ?? 0;
		const isExplicit =
			char0 >= 65 && char0 <= 90 && char1 >= 65 && char1 <= 90;

		let length = 0;
		let vr = "";

		if (isExplicit) {
			vr = String.fromCharCode(char0, char1);
			offset += 2;

			if (LONG_VRS.has(vr)) {
				// 2 reserved bytes, then 4-byte uint32 length
				offset += 2;
				if (offset + 4 > bytes.length) break;
				length = view.getUint32(offset, true);
				offset += 4;
			} else {
				// 2-byte uint16 length
				if (offset + 2 > bytes.length) break;
				length = view.getUint16(offset, true);
				offset += 2;
			}
		} else {
			// Implicit VR: 4-byte uint32 length
			if (offset + 4 > bytes.length) break;
			length = view.getUint32(offset, true);
			offset += 4;
		}

		// Undefined length (e.g. encapsulated pixel data SQ / 0xFFFFFFFF)
		if (length === 0xffffffff) {
			// Encapsulated data: read until sequence delimitation item (0xFFFE, 0xE0DD)
			const startData = offset;
			while (offset + 8 <= bytes.length) {
				const tagG = view.getUint16(offset, true);
				const tagE = view.getUint16(offset + 2, true);
				if (tagG === 0xfffe && tagE === 0xe0dd) {
					offset += 8;
					break;
				}
				offset += 2;
			}
			if (group === 0x7fe0 && element === 0x0010) {
				pixelDataBytes = bytes.subarray(startData, Math.min(offset, bytes.length));
			}
			continue;
		}

		if (offset + length > bytes.length) {
			length = bytes.length - offset;
		}

		const valBytes = bytes.subarray(offset, offset + length);
		offset += length;
		if (length % 2 !== 0) {
			offset += 1;
		}

		// Process key tags
		if (group === 0x0008 && element === 0x0060) {
			modality = parseStringValue(valBytes);
		} else if (group === 0x0008 && element === 0x0020) {
			studyDate = parseStringValue(valBytes);
		} else if (group === 0x0010 && element === 0x0020) {
			patientId = parseStringValue(valBytes);
		} else if (group === 0x0028 && element === 0x0002) {
			samplesPerPixel = valBytes.length >= 2 ? new DataView(valBytes.buffer, valBytes.byteOffset).getUint16(0, true) : 1;
		} else if (group === 0x0028 && element === 0x0004) {
			photometricInterpretation = parseStringValue(valBytes).toUpperCase();
		} else if (group === 0x0028 && element === 0x0010) {
			rows = valBytes.length >= 2 ? new DataView(valBytes.buffer, valBytes.byteOffset).getUint16(0, true) : 0;
		} else if (group === 0x0028 && element === 0x0011) {
			columns = valBytes.length >= 2 ? new DataView(valBytes.buffer, valBytes.byteOffset).getUint16(0, true) : 0;
		} else if (group === 0x0028 && element === 0x0100) {
			bitsAllocated = valBytes.length >= 2 ? new DataView(valBytes.buffer, valBytes.byteOffset).getUint16(0, true) : 16;
		} else if (group === 0x0028 && element === 0x0101) {
			bitsStored = valBytes.length >= 2 ? new DataView(valBytes.buffer, valBytes.byteOffset).getUint16(0, true) : bitsAllocated;
		} else if (group === 0x0028 && element === 0x0103) {
			pixelRepresentation = valBytes.length >= 2 ? new DataView(valBytes.buffer, valBytes.byteOffset).getUint16(0, true) : 0;
		} else if (group === 0x0028 && element === 0x1050) {
			const str = parseStringValue(valBytes).split("\\")[0];
			const parsed = Number.parseFloat(str || "");
			if (!Number.isNaN(parsed)) windowCenter = parsed;
		} else if (group === 0x0028 && element === 0x1051) {
			const str = parseStringValue(valBytes).split("\\")[0];
			const parsed = Number.parseFloat(str || "");
			if (!Number.isNaN(parsed)) windowWidth = parsed;
		} else if (group === 0x0028 && element === 0x1052) {
			const parsed = Number.parseFloat(parseStringValue(valBytes));
			if (!Number.isNaN(parsed)) rescaleIntercept = parsed;
		} else if (group === 0x0028 && element === 0x1053) {
			const parsed = Number.parseFloat(parseStringValue(valBytes));
			if (!Number.isNaN(parsed)) rescaleSlope = parsed;
		} else if (group === 0x7fe0 && element === 0x0010) {
			pixelDataBytes = valBytes;
		}
	}

	if (!pixelDataBytes || pixelDataBytes.length === 0) {
		throw new Error("Invalid DICOM file: No Pixel Data (7FE0,0010) element found.");
	}

	if (rows <= 0 || columns <= 0) {
		// Fallback: estimate square dimensions from pixel buffer size
		const pixelCount = bitsAllocated === 8 ? pixelDataBytes.length : Math.floor(pixelDataBytes.length / 2);
		const dim = Math.floor(Math.sqrt(pixelCount / (samplesPerPixel || 1)));
		rows = dim || 256;
		columns = dim || 256;
	}

	onProgress?.(0.4, "DECODE_PIXELS");

	const totalPixels = rows * columns;
	const rgbaBuffer = new Uint8Array(totalPixels * 4);

	// Determine Window Center and Window Width
	let wc = options.windowCenter !== undefined ? Number(options.windowCenter) : windowCenter;
	let ww = options.windowWidth !== undefined ? Number(options.windowWidth) : windowWidth;
	const isSigned = pixelRepresentation === 1;

	// If no window parameters exist, scan pixel min/max for auto-contrast
	if (wc === undefined || ww === undefined || ww <= 0) {
		let minVal = Infinity;
		let maxVal = -Infinity;

		if (bitsAllocated === 16) {
			const pv = new DataView(pixelDataBytes.buffer, pixelDataBytes.byteOffset, pixelDataBytes.byteLength);
			const count = Math.min(totalPixels, Math.floor(pixelDataBytes.length / 2));
			for (let i = 0; i < count; i++) {
				const raw = isSigned ? pv.getInt16(i * 2, true) : pv.getUint16(i * 2, true);
				const hu = raw * rescaleSlope + rescaleIntercept;
				if (hu < minVal) minVal = hu;
				if (hu > maxVal) maxVal = hu;
			}
		} else {
			for (let i = 0; i < Math.min(totalPixels, pixelDataBytes.length); i++) {
				const raw = pixelDataBytes[i] ?? 0;
				if (raw < minVal) minVal = raw;
				if (raw > maxVal) maxVal = raw;
			}
		}

		if (minVal === Infinity || maxVal === -Infinity || maxVal <= minVal) {
			minVal = 0;
			maxVal = bitsAllocated === 16 ? 4095 : 255;
		}

		ww = maxVal - minVal;
		wc = minVal + ww / 2;
	}

	const lowerBound = wc - 0.5 - (ww - 1) / 2;
	const upperBound = wc - 0.5 + (ww - 1) / 2;
	const windowSpan = ww - 1 > 0 ? ww - 1 : 1;

	const invertOpt = options.invert === true || options.invert === "true";
	const isMonochrome1 = photometricInterpretation === "MONOCHROME1";
	const shouldInvert = isMonochrome1 ? !invertOpt : invertOpt;

	if (samplesPerPixel === 3) {
		// RGB color DICOM
		for (let i = 0; i < totalPixels; i++) {
			const r = pixelDataBytes[i * 3] ?? 0;
			const g = pixelDataBytes[i * 3 + 1] ?? 0;
			const b = pixelDataBytes[i * 3 + 2] ?? 0;
			const offsetRgba = i * 4;
			rgbaBuffer[offsetRgba] = r;
			rgbaBuffer[offsetRgba + 1] = g;
			rgbaBuffer[offsetRgba + 2] = b;
			rgbaBuffer[offsetRgba + 3] = 255;
		}
	} else if (bitsAllocated === 16) {
		// 16-bit Grayscale (CT / MRI / X-ray)
		const pv = new DataView(pixelDataBytes.buffer, pixelDataBytes.byteOffset, pixelDataBytes.byteLength);
		const maxCount = Math.min(totalPixels, Math.floor(pixelDataBytes.length / 2));

		for (let i = 0; i < maxCount; i++) {
			const raw = isSigned ? pv.getInt16(i * 2, true) : pv.getUint16(i * 2, true);
			const hu = raw * rescaleSlope + rescaleIntercept;

			let norm = 0;
			if (hu <= lowerBound) {
				norm = 0;
			} else if (hu > upperBound) {
				norm = 255;
			} else {
				norm = Math.round(((hu - (wc - 0.5)) / windowSpan + 0.5) * 255);
			}

			norm = Math.max(0, Math.min(255, norm));
			if (shouldInvert) {
				norm = 255 - norm;
			}

			const offsetRgba = i * 4;
			rgbaBuffer[offsetRgba] = norm;
			rgbaBuffer[offsetRgba + 1] = norm;
			rgbaBuffer[offsetRgba + 2] = norm;
			rgbaBuffer[offsetRgba + 3] = 255;
		}
	} else {
		// 8-bit Grayscale
		for (let i = 0; i < Math.min(totalPixels, pixelDataBytes.length); i++) {
			let norm = pixelDataBytes[i] ?? 0;
			if (shouldInvert) {
				norm = 255 - norm;
			}
			const offsetRgba = i * 4;
			rgbaBuffer[offsetRgba] = norm;
			rgbaBuffer[offsetRgba + 1] = norm;
			rgbaBuffer[offsetRgba + 2] = norm;
			rgbaBuffer[offsetRgba + 3] = 255;
		}
	}

	onProgress?.(0.85, "ENCODE_PNG");
	const pngBytes = encodeRgbaToPng(columns, rows, rgbaBuffer);

	const metadata: DcmMetadata = {
		modality,
		rows,
		columns,
		bitsAllocated,
		bitsStored,
		photometricInterpretation,
		patientId,
		studyDate,
		windowCenter: wc,
		windowWidth: ww,
		rescaleIntercept,
		rescaleSlope,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		pngBytes,
	};
}
