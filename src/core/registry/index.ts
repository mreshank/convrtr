import { pngToWebp } from "./tools/png-to-webp";
import type { Category, Tool } from "./types";

export * from "./types";

export const TOOLS: Tool[] = [pngToWebp];

export function getTool(id: string): Tool | undefined {
	return TOOLS.find((t) => t.id === id);
}

export function getToolsByCategory(category: Category): Tool[] {
	return TOOLS.filter((t) => t.category === category);
}
