import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShaderSurface } from "@/design/texture/ShaderSurface";

const FRAG = "void main() { gl_FragColor = vec4(0.0); }";

describe("ShaderSurface", () => {
	it("fills its parent rather than the viewport", () => {
		// A texture layer that escapes its band would break v2's guardrail
		// that black must dominate and colour stays confined to a region.
		const { container } = render(<ShaderSurface fragment={FRAG} label="x" />);
		const el = container.querySelector("canvas") as HTMLCanvasElement;
		expect(el.style.position).toBe("absolute");
		expect(el.style.width).toBe("100%");
	});

	it("never intercepts pointer events", () => {
		const { container } = render(<ShaderSurface fragment={FRAG} label="x" />);
		const el = container.querySelector("canvas") as HTMLCanvasElement;
		expect(el.style.pointerEvents).toBe("none");
	});

	it("is hidden from assistive technology", () => {
		const { container } = render(<ShaderSurface fragment={FRAG} label="x" />);
		expect(container.querySelector("canvas")?.getAttribute("aria-hidden")).toBe(
			"true",
		);
	});

	it("renders a fallback and does not loop when WebGL is unavailable", () => {
		const spy = vi
			.spyOn(HTMLCanvasElement.prototype, "getContext")
			.mockReturnValue(null);
		const raf = vi.spyOn(window, "requestAnimationFrame");
		const { container } = render(<ShaderSurface fragment={FRAG} label="x" />);
		expect(container.querySelector("[data-shader-fallback]")).not.toBeNull();
		expect(raf).not.toHaveBeenCalled();
		spy.mockRestore();
		raf.mockRestore();
	});
});
