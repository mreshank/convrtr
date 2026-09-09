/**
 * v2's footer graphic: "a fine branching-line network graphic for the
 * footer band" (`DESIGN.v2.md`'s Graphics & Effects), in "thin lines in
 * `--rule-subtle`" per task 3's brief.
 *
 * The footer is the one band this system inverts: `SiteFooter.tsx`
 * redefines `--ground` to `--surface-alt` and `--rule` to `--rule-subtle`
 * locally, so this shader has to paint dark-on-pale rather than the
 * light-on-dark every other texture in this file does. A GLSL fragment
 * cannot read a CSS custom property or its local redefinition -- it only
 * ever sees the closed palette's own fixed values -- so getting the
 * inversion right here means literally swapping which named constant is
 * the base fill and which is the line: `palette_surfaceAlt` is the ground,
 * `palette_ruleSubtle` is what the lines are drawn in. That is the reverse
 * of `halftone.ts`, which paints `palette_rule` lines on a `palette_ground`
 * base, and is why the two are separate fragments rather than one
 * parameterised by colour.
 *
 * The network itself is a ridge line through `fbm`'s own domain-warped
 * field: `line` is the inverse distance from the 0.5 contour of a warped
 * `fbm`, which is what turns a smooth noise field into a network of fine,
 * branching threads instead of a soft cloud -- the same warp
 * (`domainWarp`) the shared preamble already exposes, composed here rather
 * than restated.
 */
export const BRANCH_NETWORK_FRAGMENT = `
void main() {
	vec2 uv = gl_FragCoord.xy / u_resolution.xy;
	float aspect = u_resolution.x / max(u_resolution.y, 1.0);
	vec2 p = vec2(uv.x * aspect, uv.y) * 3.2;

	vec2 warp = domainWarp(p + vec2(0.0, u_time * 0.015));
	float field = fbm(p + warp * 1.5);

	// A thin ridge where the warped field crosses 0.5 -- a contour line,
	// not a filled region, which is what reads as "network" rather than
	// "cloud".
	float line = 1.0 - smoothstep(0.0, 0.018, abs(field - 0.5));

	vec3 color = mix(palette_surfaceAlt, palette_ruleSubtle, line * u_intensity);
	gl_FragColor = vec4(color, 1.0);
}
`;
