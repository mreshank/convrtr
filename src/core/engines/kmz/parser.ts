import { unzipSync } from "fflate";
import { parseKmlToGeoJson } from "../kml/parser";

/**
 * Converts Google Earth Compressed Keyhole Archive (.kmz) to RFC 7946 GeoJSON.
 */
export function convertKmzToGeoJson(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Unpacking Google Earth KMZ archive");

	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = unzipSync(new Uint8Array(input));
	} catch {
		throw new Error(
			"Invalid KMZ file: Corrupted or invalid ZIP archive container",
		);
	}

	onProgress?.(0.3, "Locating KML document within archive");

	const kmlFiles = Object.keys(unzipped).filter((name) =>
		name.toLowerCase().endsWith(".kml"),
	);

	if (kmlFiles.length === 0) {
		throw new Error("Invalid KMZ file: No .kml document found within archive");
	}

	// Prioritize doc.kml if present, otherwise sort naturally
	kmlFiles.sort((a, b) => {
		const aIsDoc = a.toLowerCase().endsWith("doc.kml");
		const bIsDoc = b.toLowerCase().endsWith("doc.kml");
		if (aIsDoc && !bIsDoc) return -1;
		if (!aIsDoc && bIsDoc) return 1;
		return a.localeCompare(b);
	});

	const decoder = new TextDecoder("utf-8");
	const allFeatures: ReturnType<typeof parseKmlToGeoJson>["features"] = [];
	let combinedMetadata:
		| ReturnType<typeof parseKmlToGeoJson>["metadata"]
		| undefined;

	onProgress?.(0.5, "Parsing KML placemarks and vector geometries");

	for (const fileName of kmlFiles) {
		const fileBytes = unzipped[fileName];
		if (!fileBytes) continue;

		const kmlText = decoder.decode(fileBytes);
		const geojson = parseKmlToGeoJson(kmlText);

		if (geojson.metadata && !combinedMetadata) {
			combinedMetadata = geojson.metadata;
		}

		allFeatures.push(...geojson.features);
	}

	const featureCollection = {
		type: "FeatureCollection" as const,
		...(combinedMetadata ? { metadata: combinedMetadata } : {}),
		features: allFeatures,
	};

	onProgress?.(0.9, "Serializing RFC 7946 GeoJSON");
	const jsonString = JSON.stringify(featureCollection, null, 2);
	const encoded = new TextEncoder().encode(jsonString);

	onProgress?.(1.0, "Complete");
	return encoded.buffer.slice(
		encoded.byteOffset,
		encoded.byteOffset + encoded.byteLength,
	) as ArrayBuffer;
}
