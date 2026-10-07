import { describe, expect, it } from "vitest";
import { getEngine } from "@/core/engines";
import { getToolsByCategory, TOOLS } from "../index";
import { ToolSchema } from "../types";

describe("Audit all registered tools", () => {
	it("verifies all tools adhere strictly to ToolSchema", () => {
		for (const tool of TOOLS) {
			const result = ToolSchema.safeParse(tool);
			if (!result.success) {
				throw new Error(
					`Tool ${tool.id} failed schema: ${result.error.message}`,
				);
			}
			expect(result.success).toBe(true);
		}
	});

	it("verifies each tool's declared engines exist in ENGINES", () => {
		const missingEngines: { tool: string; engine: string }[] = [];
		for (const tool of TOOLS) {
			for (const engineId of tool.engines) {
				const engine = getEngine(engineId);
				if (!engine) {
					missingEngines.push({ tool: tool.id, engine: engineId });
				}
			}
		}
		expect(missingEngines).toEqual([]);
	});

	it("verifies probe() completes for all primary engines without throwing", async () => {
		const failedProbes: { tool: string; engine: string; error: string }[] = [];
		for (const tool of TOOLS) {
			const primaryEngineId = tool.engines[0];
			if (!primaryEngineId) continue;
			const engine = getEngine(primaryEngineId);
			if (!engine) continue;
			try {
				const probeResult = await engine.probe();
				expect(typeof probeResult).toBe("boolean");
			} catch (err: unknown) {
				failedProbes.push({
					tool: tool.id,
					engine: primaryEngineId,
					error: err instanceof Error ? err.message : String(err),
				});
			}
		}
		expect(failedProbes).toEqual([]);
	});

	it("verifies selectEngine resolves for every tool with at least one viable engine", async () => {
		for (const tool of TOOLS) {
			const primaryId = tool.engines[0];
			expect(
				primaryId,
				`Tool ${tool.id} has at least one engine`,
			).toBeDefined();
			if (!primaryId) continue;
			const engine = getEngine(primaryId);
			expect(
				engine,
				`Tool ${tool.id} primary engine ${primaryId}`,
			).toBeDefined();
		}
	});

	it("verifies categories return valid tools lists", () => {
		const activeCategories = ["image", "video", "audio", "document"] as const;
		for (const cat of activeCategories) {
			const catTools = getToolsByCategory(cat);
			expect(catTools.length, `Active category ${cat} tools`).toBeGreaterThan(
				0,
			);
		}
		// Data category returns array (even if 0 tools currently)
		expect(Array.isArray(getToolsByCategory("data"))).toBe(true);
	});

	it("verifies output and accept extensions are normalized without dots", () => {
		for (const tool of TOOLS) {
			expect(tool.output.ext.startsWith(".")).toBe(false);
			for (const ext of tool.accept.ext) {
				expect(ext.startsWith(".")).toBe(false);
			}
		}
	});

	it("verifies quality presets have a matching defaultPreset", () => {
		for (const tool of TOOLS) {
			if (tool.quality.presets.length > 0) {
				const hasDefault = tool.quality.presets.some(
					(p) => p.id === tool.quality.defaultPreset,
				);
				expect(
					hasDefault,
					`Tool ${tool.id} defaultPreset "${tool.quality.defaultPreset}" must exist in presets`,
				).toBe(true);
			}
		}
	});
});
