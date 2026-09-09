/**
 * v2's dot-matrix/halftone grain: "overlays the topmost strip banner and
 * recurs faintly behind code-panel graphics" (`DESIGN.v2.md`'s Graphics &
 * Effects). The supplied reference's mechanism is the right one and this
 * fragment does exactly that and nothing more: floor the coordinate to a
 * lattice, sample `fbm` once per cell centre, and use that single value as
 * the whole cell's dot radius.
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

	float cell = 0.026;
	vec2 cellId = floor(p / cell);
	vec2 cellUv = fract(p / cell) - 0.5;
	vec2 cellCenter = (cellId + 0.5) * cell;

	// Sampled once per cell -- cellCenter never varies inside a cell, so
	// every pixel in it reads the same n and therefore the same radius.
	float n = fbm(cellCenter * 7.0 + u_time * 0.03);
	float radius = clamp(n, 0.0, 1.0) * 0.40;

	float dot = smoothstep(radius, radius - 0.10, length(cellUv));
	vec3 color = mix(palette_ground, palette_rule, dot * u_intensity);
	gl_FragColor = vec4(color, 1.0);
}
`;
