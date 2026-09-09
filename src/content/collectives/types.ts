export interface CollectiveMeta {
	slug: string;
	title: string;
	/**
	 * The editorial reason these specific tools belong together -- the thing
	 * that separates a collective from a group. A group is mechanical
	 * ("every tool that accepts wav"); a collective states *why* this set
	 * serves one job someone actually has ("everything for a podcast"). A
	 * `why` without substance is a group with extra steps, so the registry
	 * test requires more than a token phrase here.
	 */
	why: string;
	/** Tool ids from `@/core/registry`'s `TOOLS` -- must resolve via `getTool()`. */
	toolIds: string[];
}
