"use client";

import { useEffect, useRef, useState } from "react";
import { NOISE_GLSL, PALETTE_GLSL } from "./glsl/preamble";

/**
 * A 3x canvas on a 4K display spends real GPU on texture nobody looks at
 * directly -- this is a file converter, not a shader showcase, and the WASM
 * codecs on the working pages need that budget more than a decorative band
 * does.
 */
const MAX_DEVICE_PIXEL_RATIO = 1.5;

/**
 * A full-screen triangle rather than a quad: one draw call, no index buffer,
 * and the clipped-off corner never appears on screen. Written in GLSL ES
 * 1.00 (`attribute`, no `#version` pragma) deliberately -- a WebGL2 context
 * accepts ES 1.00 source with no pragma just as a WebGL1 context does, so
 * one vertex shader works unmodified on whichever context
 * `canvas.getContext("webgl2") ?? canvas.getContext("webgl")` returns, and a
 * caller's `fragment` (also ES 1.00, `gl_FragColor`) never has to know which
 * one it got either.
 */
const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
	gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const QUAD_VERTICES = new Float32Array([-1, -1, 3, -1, -1, 3]);

type ShaderSurfaceProps = {
	/**
	 * The fragment shader body: a complete `void main() { ... gl_FragColor
	 * = ...; }`, written against `u_resolution`, `u_time`, `u_pointer`,
	 * `u_intensity` and the palette/noise helpers `glsl/preamble.ts`
	 * supplies. This component wraps it with precision and uniform
	 * declarations plus the shared preamble before compiling it.
	 */
	fragment: string;
	/**
	 * A static, per-mount strength multiplier forwarded to the shader as
	 * `u_intensity`, in addition to (not instead of) the pointer-driven
	 * `u_pointer` uniform below. Task 3's textures dial this per usage to
	 * keep composited text contrast above 4.5:1 -- "reduce the intensity
	 * until it passes" reads this prop, not a shader constant buried in
	 * each fragment. Defaults to 1 (full strength).
	 */
	intensity?: number;
	/**
	 * Identifies which texture this instance is, written to `data-shader`
	 * for debugging in devtools. Carries no accessibility meaning -- the
	 * canvas is `aria-hidden`, so nothing here is ever read aloud.
	 */
	label: string;
};

function compileShader(
	gl: WebGLRenderingContext,
	type: number,
	source: string,
): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function createProgram(
	gl: WebGLRenderingContext,
	fragmentSource: string,
): WebGLProgram | null {
	const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
	const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
	if (!vertexShader || !fragmentShader) return null;

	const program = gl.createProgram();
	if (!program) return null;
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		gl.deleteProgram(program);
		return null;
	}
	return program;
}

/**
 * The one client component this plan adds. Everything downstream of it
 * (task 3's three named textures) is composition: a `<canvas>` sized to its
 * parent, running a caller-supplied fragment shader against the shared
 * palette and noise preamble.
 *
 * Containment is the whole design here, not an afterthought. The reference
 * shaders this plan draws on are full-viewport page takeovers with palettes
 * outside this system entirely; a canvas that filled the viewport instead of
 * its parent would break v2's guardrail that black must dominate and that
 * the mint accent never spreads across a large fill. So this canvas is
 * `position: absolute; inset: 0` inside whatever positioned parent renders
 * it -- never `fixed`, never a `100vw` width -- and every colour a fragment
 * can reach comes from the closed ten-value palette in `glsl/preamble.ts`,
 * which `tokens.test.ts` now reads directly.
 *
 * `pointer-events: none` and `aria-hidden` are both load-bearing, not
 * hygiene: this codebase already shipped a decorative overlay (the
 * dot-matrix grain in `DotMatrix.tsx`) that would have swallowed every click
 * in its band without the same property, invisible to any DOM-only test.
 * This is texture with nothing to say, sitting behind content.
 */
export function ShaderSurface({
	fragment,
	intensity = 1,
	label,
}: ShaderSurfaceProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [fallback, setFallback] = useState(false);

	// `fragment` and `intensity` are listed as dependencies for correctness,
	// but every call site in this plan (task 3's three named shaders) passes
	// a module-level constant string and a literal number, both referentially
	// and value-stable across re-renders -- so in practice this effect still
	// runs exactly once per mount, tearing down and recreating the WebGL
	// context only if a caller genuinely swaps the shader or its strength.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		// Called exactly once. If both contexts come back null there is
		// nothing else to try -- WebGL support does not appear mid-session,
		// so falling back here is a single decision, never a retry loop.
		const gl = (canvas.getContext("webgl2") ??
			canvas.getContext("webgl")) as WebGLRenderingContext | null;

		if (!gl) {
			setFallback(true);
			return;
		}

		const fragmentSource = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_pointer;
uniform vec2 u_mouse;
uniform float u_intensity;
${PALETTE_GLSL}
${NOISE_GLSL}
${fragment}
`;

		const program = createProgram(gl, fragmentSource);
		if (!program) {
			// A fragment that fails to compile or link is exactly as
			// unusable as no context at all -- same fallback, same
			// single-attempt rule.
			setFallback(true);
			return;
		}

		// biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram is WebGL's API, not a React hook -- the linter's use-prefix heuristic can't tell them apart.
		gl.useProgram(program);

		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);
		const positionLocation = gl.getAttribLocation(program, "a_position");
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

		const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
		const timeLocation = gl.getUniformLocation(program, "u_time");
		const pointerLocation = gl.getUniformLocation(program, "u_pointer");
		const mouseLocation = gl.getUniformLocation(program, "u_mouse");
		const intensityLocation = gl.getUniformLocation(program, "u_intensity");

		const parent = canvas.parentElement;
		const start = performance.now();

		// The pointer uniform's resting value is 0 -- it rises toward 1
		// while the pointer is over `parent` and relaxes back to 0 when it
		// leaves. Under reduced motion it simply never leaves 0, because
		// nothing below ever calls `draw` a second time to read a changed
		// target.
		let pointerCurrent = 0;
		let pointerTarget = 0;
		let mouseCurrentX = 0.5;
		let mouseCurrentY = 0.5;
		let mouseTargetX = 0.5;
		let mouseTargetY = 0.5;
		let raf = 0;
		let onScreen = true;
		let tabHidden = document.visibilityState === "hidden";

		const resize = () => {
			const width = parent?.clientWidth ?? canvas.clientWidth;
			const height = parent?.clientHeight ?? canvas.clientHeight;
			const dpr = Math.min(
				window.devicePixelRatio || 1,
				MAX_DEVICE_PIXEL_RATIO,
			);
			const nextWidth = Math.max(1, Math.round(width * dpr));
			const nextHeight = Math.max(1, Math.round(height * dpr));
			if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
				canvas.width = nextWidth;
				canvas.height = nextHeight;
			}
			gl.viewport(0, 0, canvas.width, canvas.height);
		};

		const draw = (now: number) => {
			resize();
			pointerCurrent += (pointerTarget - pointerCurrent) * 0.08;
			mouseCurrentX += (mouseTargetX - mouseCurrentX) * 0.1;
			mouseCurrentY += (mouseTargetY - mouseCurrentY) * 0.1;
			// biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram again, WebGL's API rather than a React hook.
			gl.useProgram(program);
			if (resolutionLocation) {
				gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
			}
			if (timeLocation) gl.uniform1f(timeLocation, (now - start) / 1000);
			if (pointerLocation) gl.uniform1f(pointerLocation, pointerCurrent);
			if (mouseLocation)
				gl.uniform2f(mouseLocation, mouseCurrentX, mouseCurrentY);
			if (intensityLocation) gl.uniform1f(intensityLocation, intensity);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		};

		const tick = (now: number) => {
			draw(now);
			raf = requestAnimationFrame(tick);
		};

		const stopLoop = () => {
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		};

		const resumeLoop = () => {
			// Reduced motion never restarts the loop -- not a slowed loop,
			// not a paused-then-resumed one, exactly the one frame already
			// drawn below and nothing after it.
			if (reducedMotion || raf || !onScreen || tabHidden) return;
			raf = requestAnimationFrame(tick);
		};

		if (reducedMotion) {
			draw(start);
		} else {
			raf = requestAnimationFrame(tick);
		}

		const onPointerEnter = () => {
			pointerTarget = 1;
		};
		const onPointerLeave = () => {
			pointerTarget = 0;
		};
		const onPointerMove = (e: PointerEvent) => {
			if (!parent) return;
			const rect = parent.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) {
				mouseTargetX = (e.clientX - rect.left) / rect.width;
				mouseTargetY = 1.0 - (e.clientY - rect.top) / rect.height;
			}
		};
		if (!reducedMotion && parent) {
			parent.addEventListener("pointerenter", onPointerEnter);
			parent.addEventListener("pointerleave", onPointerLeave);
			parent.addEventListener("pointermove", onPointerMove);
		}

		const intersectionObserver = new IntersectionObserver((entries) => {
			const entry = entries[entries.length - 1];
			onScreen = entry ? entry.isIntersecting : true;
			if (onScreen) resumeLoop();
			else stopLoop();
		});
		intersectionObserver.observe(canvas);

		const onVisibilityChange = () => {
			tabHidden = document.visibilityState === "hidden";
			if (tabHidden) stopLoop();
			else resumeLoop();
		};
		document.addEventListener("visibilitychange", onVisibilityChange);

		const resizeObserver =
			typeof ResizeObserver !== "undefined" && parent
				? new ResizeObserver(() => resize())
				: null;
		resizeObserver?.observe(parent as Element);

		return () => {
			stopLoop();
			intersectionObserver.disconnect();
			resizeObserver?.disconnect();
			document.removeEventListener("visibilitychange", onVisibilityChange);
			if (parent) {
				parent.removeEventListener("pointerenter", onPointerEnter);
				parent.removeEventListener("pointerleave", onPointerLeave);
				parent.removeEventListener("pointermove", onPointerMove);
			}
			gl.deleteProgram(program);
			gl.deleteBuffer(positionBuffer);
			// Releases the underlying GPU resource deterministically rather
			// than waiting on garbage collection -- a canvas that unmounts
			// and remounts often (a band scrolled in and out of a route)
			// should not accumulate contexts the driver never reclaimed.
			gl.getExtension("WEBGL_lose_context")?.loseContext();
		};
	}, [fragment, intensity]);

	return (
		<>
			{/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: a plain <canvas>
			    with no tabindex takes no focus, and pointer-events: none below
			    keeps it out of the interaction tree entirely -- aria-hidden is
			    required here (ShaderSurface.test.tsx asserts it directly) since
			    this is texture with nothing to say, sitting behind content. */}
			<canvas
				ref={canvasRef}
				data-shader={label}
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					width: "100%",
					height: "100%",
					pointerEvents: "none",
				}}
			/>
			{fallback && (
				// The static stand-in a browser with no WebGL (or a shader
				// that failed to link) gets instead -- rendered once, never
				// retried, and never itself the thing that starts a loop.
				<div
					data-shader-fallback
					aria-hidden="true"
					style={{
						position: "absolute",
						inset: 0,
						pointerEvents: "none",
						background: "var(--surface)",
					}}
				/>
			)}
		</>
	);
}
