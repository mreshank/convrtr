import { jsquashWebp } from "./jsquash-webp";
import type { Engine } from "./types";

export * from "./types";

export const ENGINES = new Map<string, Engine>([[jsquashWebp.id, jsquashWebp]]);

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
