/**
 * The GLSL every `ShaderSurface` fragment shares: the closed palette as
 * named colours, and the noise stack the three named textures in v2's
 * Graphics & Effects section (task 3) are built from. `ShaderSurface`
 * assembles the final shader source as precision + uniform declarations +
 * this preamble + the caller's `fragment` body, so anything declared here is
 * available to every fragment in the plan without repeating it.
 */

/**
 * v2's ten-value palette, expressed as GLSL `vec3`s in the 0-1 range WebGL
 * expects. Each line names the `tokens.css` custom property the colour comes
 * from, plus that token's channels on the 0-255 scale, so a reader can
 * recompute the 0-1 value from either and check all three against each
 * other. Written as plain channel numbers rather than `#rrggbb` on purpose,
 * the same convention `tokens.css` and `DifferenceCursor.tsx` already use:
 * the palette guard in `tokens.test.ts` sweeps comments as well as code, so a
 * hex literal here would trip the very check this file exists to satisfy.
 *
 * These are the ONLY colour literals a shader in this codebase may declare.
 * The guard reads every file under `glsl/` for `vec3(r, g, b)` literals,
 * converts each back to an 8-bit hex triplet, and fails if it is not one of
 * the ten below -- so a fragment that wants a colour references one of these
 * names; it never writes its own `vec3`. The reference shaders this texture
 * plan draws on specify their own palettes entirely outside this system,
 * and closing GLSL colour literals to these ten is what keeps one of those
 * from landing here unnoticed.
 */
export const PALETTE_GLSL = `
vec3 palette_ground      = vec3(0.0000, 0.0000, 0.0000); // --ground       0, 0, 0
vec3 palette_surface     = vec3(0.0667, 0.0745, 0.0824); // --surface      17, 19, 21
vec3 palette_surfaceAlt  = vec3(0.8941, 0.9451, 0.9216); // --surface-alt  228, 241, 235
vec3 palette_ink         = vec3(1.0000, 1.0000, 1.0000); // --ink          255, 255, 255
vec3 palette_inkMuted    = vec3(0.5804, 0.5922, 0.6196); // --ink-muted    148, 151, 158
vec3 palette_inkInverse  = vec3(0.0745, 0.0784, 0.0824); // --ink-inverse  19, 20, 21
vec3 palette_rule        = vec3(0.1882, 0.1961, 0.2118); // --rule         48, 50, 54
vec3 palette_ruleSubtle  = vec3(0.0941, 0.0980, 0.1059); // --rule-subtle  24, 25, 27
vec3 palette_accent      = vec3(0.2039, 0.8353, 0.6039); // --accent       52, 213, 154
vec3 palette_accentHover = vec3(0.2784, 0.8196, 0.5490); // --accent-hover 71, 209, 140
`;

/**
 * A hashed value noise, a six-octave fbm built on it, and a two-level domain
 * warp on top of that -- the standard noise stack the three named textures
 * in task 3 (`heroGlow`, `halftone`, `branchNetwork`) are built from.
 *
 * Kept entirely in `vec2`/`float`/`mat2`: nothing here is a colour, so
 * nothing here can trip the palette guard above. A fragment mixes this
 * shape against the named `palette_*` constants to turn it into one.
 */
export const NOISE_GLSL = `
float hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
	float sum = 0.0;
	float amp = 0.5;
	mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
	for (int i = 0; i < 6; i++) {
		sum += amp * valueNoise(p);
		p = rot * p * 2.0;
		amp *= 0.5;
	}
	return sum;
}

vec2 domainWarp(vec2 p) {
	vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
	vec2 r = vec2(
		fbm(p + 4.0 * q + vec2(1.7, 9.2)),
		fbm(p + 4.0 * q + vec2(8.3, 2.8))
	);
	return r;
}
`;

/** Both blocks, in the order a fragment shader needs them declared. */
export const PREAMBLE_GLSL = `${PALETTE_GLSL}\n${NOISE_GLSL}`;
