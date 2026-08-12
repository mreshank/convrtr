import { createImagePipelineEngine } from "./image";
import type { Engine } from "./types";

export * from "./image";
export * from "./types";

// The image pack's entire tool matrix is composed from decoders × encoders
// (see `src/core/engines/image/`), so wiring one up here costs a single
// line, not a bespoke engine file per format pair.
const pngToWebp = createImagePipelineEngine("png", "webp");

export const ENGINES = new Map<string, Engine>([[pngToWebp.id, pngToWebp]]);

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
