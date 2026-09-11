import { meta as documentForensics } from "./document-forensics/meta";
import { meta as gameDevPipeline } from "./game-dev-pipeline/meta";
import { meta as geodataSpatial } from "./geodata-spatial/meta";
import { meta as podcastKit } from "./podcast-kit/meta";
import { meta as retroComputing } from "./retro-computing/meta";
import { meta as stripMetadata } from "./strip-metadata/meta";
import { meta as subtitleLocalization } from "./subtitle-localization/meta";
import type { CollectiveMeta } from "./types";

/**
 * Metadata only, following `content/blog/registry.ts`'s module boundary.
 * `toolIds` is an array of id strings, never an imported `Tool` object or a
 * value-import of a tool's own definition module. A collective that stored
 * resolved `Tool` objects here would pull every referenced tool's
 * definition -- and, transitively, whatever it drags in -- into the build
 * graph of any page that lists collectives, the same class of bug
 * `core/registry`'s module-boundary test guards against for tools and the
 * blog registry guards against for post bodies. Resolving an id to a `Tool`
 * is left to the route that renders one collective, via `getTool`.
 */
export const COLLECTIVES: CollectiveMeta[] = [
	podcastKit,
	stripMetadata,
	gameDevPipeline,
	retroComputing,
	subtitleLocalization,
	geodataSpatial,
	documentForensics,
];

export function getCollective(
	slug: string,
	collectives: CollectiveMeta[] = COLLECTIVES,
): CollectiveMeta | undefined {
	return collectives.find((collective) => collective.slug === slug);
}
