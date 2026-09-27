"use client";

import { Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef } from "react";

/**
 * React Bits' `Radar` (ogl + GLSL), ported to TypeScript for this codebase.
 * Concentric rings, radial spokes and a rotating sweep beam rendered on a
 * transparent WebGL canvas -- the backdrop for the release-radar panel, so
 * the "radar" pun is literal, not decorative noise from another planet.
 *
 * Containment, per `ShaderSurface`'s discipline: the canvas fills its
 * positioned parent (`width/height: 100%`, never viewport units), DPR is
 * capped at 1.5 so a decorative band never outspends the WASM codecs on
 * GPU, the loop pauses off-screen via `IntersectionObserver`, and
 * `prefers-reduced-motion` renders one static frame instead of animating.
 * The canvas is `aria-hidden` -- pure texture, never read aloud.
 */

type RadarProps = {
	/** Overall animation speed multiplier. */
	speed?: number;
	/** Zoom level of the radar pattern. */
	scale?: number;
	/** Number of concentric rings. */
	ringCount?: number;
	/** Number of radial spoke lines. */
	spokeCount?: number;
	/** Thickness of the concentric ring lines. */
	ringThickness?: number;
	/** Thickness of the radial spoke lines. */
	spokeThickness?: number;
	/** Rotation speed of the sweep beam. */
	sweepSpeed?: number;
	/** Width of the sweep trail (higher = thinner). */
	sweepWidth?: number;
	/** Number of sweep beams around the radar. */
	sweepLobes?: number;
	/** Primary radar color in HEX format. */
	color?: string;
	/** Background color in HEX format. */
	backgroundColor?: string;
	/** Edge fade intensity based on distance from center. */
	falloff?: number;
	/** Overall brightness multiplier. */
	brightness?: number;
	/** Enable cursor-reactive center offset. */
	enableMouseInteraction?: boolean;
	/** Strength of the mouse offset effect. */
	mouseInfluence?: number;
	/** Render the light-mode transfer curve instead of additive dark. */
	lightMode?: boolean;
};

/** A 3x canvas on a 4K display spends real GPU on texture nobody looks at
 * directly -- same cap `ShaderSurface` applies, for the same reason. */
const MAX_DEVICE_PIXEL_RATIO = 1.5;

function hexToVec3(hex: string): [number, number, number] {
	const h = hex.replace(/^#/, "");
	if (h.length === 6) {
		return [
			parseInt(h.slice(0, 2), 16) / 255,
			parseInt(h.slice(2, 4), 16) / 255,
			parseInt(h.slice(4, 6), 16) / 255,
		];
	}
	return [0.204, 0.835, 0.604];
}

const VERTEX_SHADER = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform float uSpeed;
uniform float uScale;
uniform float uRingCount;
uniform float uSpokeCount;
uniform float uRingThickness;
uniform float uSpokeThickness;
uniform float uSweepSpeed;
uniform float uSweepWidth;
uniform float uSweepLobes;
uniform vec3 uColor;
uniform vec3 uBgColor;
uniform bool uLightMode;
uniform float uFalloff;
uniform float uBrightness;
uniform vec2 uMouse;
uniform float uMouseInfluence;
uniform bool uEnableMouse;

#define TAU 6.28318530718
#define PI 3.14159265359

void main() {
  vec2 st = gl_FragCoord.xy / uResolution.xy;
  st = st * 2.0 - 1.0;
  st.x *= uResolution.x / uResolution.y;

  if (uEnableMouse) {
    vec2 mShift = (uMouse * 2.0 - 1.0);
    mShift.x *= uResolution.x / uResolution.y;
    st -= mShift * uMouseInfluence;
  }

  st *= uScale;

  float dist = length(st);
  float theta = atan(st.y, st.x);
  float t = uTime * uSpeed;

  float ringPhase = dist * uRingCount - t;
  float ringDist = abs(fract(ringPhase) - 0.5);
  float ringGlow = 1.0 - smoothstep(0.0, uRingThickness, ringDist);

  float spokeAngle = abs(fract(theta * uSpokeCount / TAU + 0.5) - 0.5) * TAU / uSpokeCount;
  float arcDist = spokeAngle * dist;
  float spokeGlow = (1.0 - smoothstep(0.0, uSpokeThickness, arcDist)) * smoothstep(0.0, 0.1, dist);

  float sweepPhase = t * uSweepSpeed;
  float sweepBeam = pow(max(0.5 * sin(uSweepLobes * theta + sweepPhase) + 0.5, 0.0), uSweepWidth);

  float fade = smoothstep(1.05, 0.85, dist) * pow(max(1.0 - dist, 0.0), uFalloff);

  float intensity = max((ringGlow + spokeGlow + sweepBeam) * fade * uBrightness, 0.0);
  vec3 signal = uColor * intensity;
  vec3 col;
  if (uLightMode) {
    vec3 mapped = vec3(1.0) - exp(-max(signal, vec3(0.0)) * 1.45);
    float energy = clamp(max(mapped.r, max(mapped.g, mapped.b)), 0.0, 1.0);
    vec3 hue = mapped / max(energy, 0.0001);
    hue = pow(clamp(hue, 0.0, 1.0), vec3(1.2));
    col = mix(uBgColor, hue, smoothstep(0.015, 0.8, energy) * 0.96);
    gl_FragColor = vec4(col, 1.0);
  } else {
    col = signal + uBgColor;
    float alpha = clamp(length(col), 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
}
`;

export default function Radar({
	speed = 1.0,
	scale = 0.5,
	ringCount = 10.0,
	spokeCount = 10.0,
	ringThickness = 0.05,
	spokeThickness = 0.01,
	sweepSpeed = 1.0,
	sweepWidth = 2.0,
	sweepLobes = 1.0,
	color = "34d59a",
	backgroundColor = "000000",
	falloff = 2.0,
	brightness = 1.0,
	enableMouseInteraction = true,
	mouseInfluence = 0.1,
	lightMode = false,
}: RadarProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;
		const container = containerRef.current;

		// Probe before touching ogl: happy-dom/jsdom and WebGL-less browsers
		// return null for both contexts, and ogl's `Renderer` throws in its
		// constructor when that happens. This is decorative texture --
		// absence renders nothing, never an error boundary.
		const probe = document.createElement("canvas");
		if (!probe.getContext("webgl2") && !probe.getContext("webgl")) return;

		let renderer: Renderer;
		try {
			renderer = new Renderer({
				alpha: true,
				premultipliedAlpha: false,
				dpr: Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO),
			});
		} catch {
			return;
		}
		const gl = renderer.gl;
		gl.clearColor(0, 0, 0, 0);

		let program: Program | undefined;
		let animationFrameId = 0;
		let visible = true;
		const currentMouse: [number, number] = [0.5, 0.5];
		let targetMouse: [number, number] = [0.5, 0.5];

		function handleMouseMove(e: MouseEvent) {
			const rect = gl.canvas.getBoundingClientRect();
			targetMouse = [
				(e.clientX - rect.left) / rect.width,
				1.0 - (e.clientY - rect.top) / rect.height,
			];
		}

		function handleMouseLeave() {
			targetMouse = [0.5, 0.5];
		}

		function resize() {
			if (container.offsetWidth === 0 || container.offsetHeight === 0) return;
			renderer.setSize(container.offsetWidth, container.offsetHeight);
			if (program) {
				program.uniforms.uResolution.value = [
					gl.canvas.width,
					gl.canvas.height,
					gl.canvas.width / gl.canvas.height,
				];
			}
		}
		window.addEventListener("resize", resize);
		resize();

		const geometry = new Triangle(gl);
		program = new Program(gl, {
			vertex: VERTEX_SHADER,
			fragment: FRAGMENT_SHADER,
			uniforms: {
				uTime: { value: 0 },
				uResolution: {
					value: [
						gl.canvas.width,
						gl.canvas.height,
						gl.canvas.width / gl.canvas.height,
					],
				},
				uSpeed: { value: speed },
				uScale: { value: scale },
				uRingCount: { value: ringCount },
				uSpokeCount: { value: spokeCount },
				uRingThickness: { value: ringThickness },
				uSpokeThickness: { value: spokeThickness },
				uSweepSpeed: { value: sweepSpeed },
				uSweepWidth: { value: sweepWidth },
				uSweepLobes: { value: sweepLobes },
				uColor: { value: hexToVec3(color) },
				uBgColor: { value: hexToVec3(backgroundColor) },
				uLightMode: { value: lightMode },
				uFalloff: { value: falloff },
				uBrightness: { value: brightness },
				uMouse: { value: new Float32Array([0.5, 0.5]) },
				uMouseInfluence: { value: mouseInfluence },
				uEnableMouse: { value: enableMouseInteraction },
			},
		});

		const mesh = new Mesh(gl, { geometry, program });
		container.appendChild(gl.canvas);

		if (enableMouseInteraction) {
			gl.canvas.addEventListener("mousemove", handleMouseMove);
			gl.canvas.addEventListener("mouseleave", handleMouseLeave);
		}

		const reduceMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		function render(time: number) {
			if (!program) return;
			program.uniforms.uTime.value = time * 0.001;
			if (enableMouseInteraction) {
				currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
				currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
				program.uniforms.uMouse.value[0] = currentMouse[0];
				program.uniforms.uMouse.value[1] = currentMouse[1];
			}
			renderer.render({ scene: mesh });
		}

		function update(time: number) {
			animationFrameId = requestAnimationFrame(update);
			if (!visible) return;
			render(time);
		}

		if (reduceMotion) {
			// One static frame: the texture without the motion.
			render(0);
		} else {
			animationFrameId = requestAnimationFrame(update);
		}

		const observer = new IntersectionObserver(
			(entries) => {
				visible = entries.some((entry) => entry.isIntersecting);
			},
			{ threshold: 0 },
		);
		observer.observe(container);

		return () => {
			cancelAnimationFrame(animationFrameId);
			observer.disconnect();
			window.removeEventListener("resize", resize);
			if (enableMouseInteraction) {
				gl.canvas.removeEventListener("mousemove", handleMouseMove);
				gl.canvas.removeEventListener("mouseleave", handleMouseLeave);
			}
			container.removeChild(gl.canvas);
			gl.getExtension("WEBGL_lose_context")?.loseContext();
		};
	}, [
		speed,
		scale,
		ringCount,
		spokeCount,
		ringThickness,
		spokeThickness,
		sweepSpeed,
		sweepWidth,
		sweepLobes,
		color,
		backgroundColor,
		falloff,
		brightness,
		enableMouseInteraction,
		mouseInfluence,
		lightMode,
	]);

	// Inline sizing replaces `Radar.css`: the canvas fills whatever
	// positioned parent renders it, same contract as `ShaderSurface`.
	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			style={{ width: "100%", height: "100%" }}
		/>
	);
}
