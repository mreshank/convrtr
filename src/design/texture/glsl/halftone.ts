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

	// Sampled once per cell -- cellCenter never varies inside a cell, so
	// every pixel in it reads the same n and therefore the same radius.
	float n = fbm(cellCenter * 3.0 + u_time * 0.02);

	// The ramp is what makes this a halftone screen rather than a field of
	// noise. A halftone reproduces a TONE by varying dot area across the
	// frame; without a gradient underneath it there is nothing being
	// reproduced, and the result reads as uniform speckle -- which is what
	// this did. "across" runs 0 at the left edge to 1 at the right, so the
	// screen opens up into the empty right half of the hero and closes to
	// nothing under the headline and the buttons on the left.
	//
	// Multiplied, not added: where the ramp is 0 the cell has no dot at all,
	// rather than a small one. That is what keeps the text side of the band
	// pure ground rather than merely dim.
	//
	// No backticks anywhere in this string: the whole shader is a JS template
	// literal, so one would end it mid-comment and take the build with it.
	float across = cellCenter.x / max(aspect, 0.0001);
	float ramp = smoothstep(0.12, 1.0, across);
	float field = clamp(ramp * (0.55 + clamp(n, 0.0, 1.0) * 0.45), 0.0, 1.0);
	float radius = field * 0.46;

	float dot = smoothstep(radius, radius - 0.09, length(cellUv));
	vec3 color = mix(palette_ground, palette_rule, dot * u_intensity);
	gl_FragColor = vec4(color, 1.0);
}
`;
