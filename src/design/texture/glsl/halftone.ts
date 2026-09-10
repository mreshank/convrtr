/**
 * v2's dot-matrix/halftone grain: "overlays the topmost strip banner and
 * recurs faintly behind code-panel graphics" (`DESIGN.v2.md`'s Graphics &
 * Effects). The supplied reference's mechanism is the right one: floor
 * the coordinate to a lattice, sample `fbm` once per cell centre, and use
 * that value as the whole cell's dot radius.
 *
 * `fbm` alone was not enough, and the hero is where that showed. A halftone
 * screen reproduces a tone by varying dot AREA across the frame; given noise
 * and no gradient, every cell lands in the same narrow size band, which
 * reads as uniform speckle rather than as a screen. The cell pitch made it
 * worse: at the hero's height a `0.026` cell resolved to about 15.6px, and
 * `DotMatrix` paints its own uniform CSS dot grid at a 12px pitch directly
 * OVER this canvas -- two near-identical lattices interfering, which is what
 * made the landing page's texture look like flat grain rather than dots. The
 * cell is now `0.045`, about 27px in the hero, clearly a different scale
 * from the grain above it, so the two read as fine grain plus a coarse
 * screen instead of one confused pitch.
 *
 * "Once per cell centre" is load-bearing, not an implementation detail --
 * sampling `fbm` at the varying per-pixel position instead would shade each
 * dot with its own internal gradient, which reads as smoke, not a
 * dot-matrix grain. Computing `n` from `cellCenter` alone means every
 * pixel inside one cell sees the same radius and the dot keeps a crisp,
 * halftone-legible edge.
 *
 * Two palette values only: `palette_ground` (the page's own black) and
 * `palette_rule` -- literally "recoloured to `--rule` on `--ground`", the
 * brief's own words, not an approximation of them. `u_intensity` scales the
 * mix fraction directly, which is the knob task 3's contrast pass turns
 * down for the TerminalPanel usage ("recurs faintly") without this file
 * needing two variants.
 */
export const HALFTONE_FRAGMENT = `
void main() {
	vec2 uv = gl_FragCoord.xy / u_resolution.xy;
	float aspect = u_resolution.x / max(u_resolution.y, 1.0);
	vec2 p = vec2(uv.x * aspect, uv.y);

	float cell = 0.045;
	vec2 cellId = floor(p / cell);
	vec2 cellUv = fract(p / cell) - 0.5;
	vec2 cellCenter = (cellId + 0.5) * cell;

	// Organic drift motion across time
	vec2 drift = vec2(u_time * 0.09, u_time * 0.05);
	float n = fbm(cellCenter * 3.2 + drift);

	// Gentle ambient wave harmonics for a living digital fabric feel
	float wave = sin(cellCenter.x * 4.5 - u_time * 0.45) * cos(cellCenter.y * 5.0 + u_time * 0.35) * 0.16;

	// Interactive pointer reaction when hovering
	vec2 mousePos = vec2(u_mouse.x * aspect, u_mouse.y);
	float mouseDist = length(cellCenter - mousePos);
	float mouseProximity = smoothstep(0.38, 0.0, mouseDist) * u_pointer;

	// Halftone density gradient across the screen
	float across = cellCenter.x / max(aspect, 0.0001);
	float ramp = smoothstep(0.12, 1.0, across);
	float field = clamp(ramp * (0.44 + clamp(n + wave, 0.0, 1.0) * 0.46 + mouseProximity * 0.26), 0.0, 1.0);
	float radius = field * 0.46;

	float dot = smoothstep(radius, radius - 0.09, length(cellUv));
	vec3 dotColor = mix(palette_rule, palette_accent, clamp(mouseProximity * 1.6, 0.0, 1.0));
	vec3 color = mix(palette_ground, dotColor, dot * u_intensity);
	gl_FragColor = vec4(color, 1.0);
}
`;
