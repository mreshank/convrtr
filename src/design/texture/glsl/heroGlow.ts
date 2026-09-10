/**
 * v2's hero stand-in: "dark radial glows with thin vertical mint/teal bars
 * for the hero" (`DESIGN.v2.md`'s Graphics & Effects), read against its own
 * Guardrails a few lines down -- "black must dominate; color stays confined
 * to thin vertical bars/glows in the upper hero region" and "never spread
 * the mint accent across large fills". Those two lines are the whole brief:
 * mostly `palette_ground`, a little `palette_surface` for the glow's own
 * dark lift, and `palette_accent` rationed to a handful of hairline bars.
 *
 * Two palette values carry the body of the shader (`palette_ground` and
 * `palette_surface`); `palette_accent` is the third and only ever reached
 * through a `mix()` whose fraction `topMask` forces toward zero by the
 * lower half of the canvas -- there is no code path that paints accent
 * below the hero's own headline region, regardless of `u_intensity`.
 *
 * `ShaderSurface` fills its entire parent, and this fragment's own parent
 * (`HeroBand.tsx`) is the whole hero section -- headline, CTAs and the bar
 * chart together, easily taller than the "upper hero region" the guardrail
 * names. `topMask` is what keeps the effect out of the chart's own
 * territory: it reads zero below `uv.y = 0.55` (bottom ~55% of the band,
 * gl_FragCoord's origin is bottom-left so this is literally the lower
 * portion) and ramps to full strength by `uv.y = 0.85`, so only the top
 * third or so of the band -- where the eyebrow, headline and CTA pills
 * actually sit -- ever carries a glow or a bar.
 *
 * The three bar x-positions are fixed literals, not a repeating lattice --
 * v2 says "thin and few", and a `mod()`-generated grid of bars is a wash
 * wearing a loop. Each bar's brightness drifts slowly through `fbm`, driven
 * by `u_time`, so `prefers-reduced-motion` (one frame, `u_time` frozen at
 * its start value) and the animated case are visibly different without the
 * drift ever being fast enough to distract from the content in front of it.
 *
 * Fix round 1: the bar half-width and shimmer floor below were both raised
 * once the composited screenshot showed them reading as effectively
 * invisible against `halftone`'s own grain -- correct per pixel (contrast
 * measurement over the eyebrow/headline text held at every setting tried)
 * but not per the guardrail's actual intent, which is a bar someone can see
 * as a bar, not one that only a colour-picker can find. Still three fixed
 * hairlines, still confined to the top of the band by `topMask`, still never
 * a fill -- "thin and few" describes the shape kept here, not the exact
 * pixel width, which was simply too thin to read as a deliberate stroke.
 */
export const HERO_GLOW_FRAGMENT = `
void main() {
	vec2 uv = gl_FragCoord.xy / u_resolution.xy;
	float aspect = u_resolution.x / max(u_resolution.y, 1.0);
	vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

	// Zero below the headline band, full strength by the top -- see the
	// file header for why this specific range keeps the bar chart clear.
	float topMask = smoothstep(0.55, 0.85, uv.y);

	// Two soft, dark radial glows -- barely lighter than the ground, never
	// a bright hero spotlight, with a subtle breathing pulse.
	float glowA = smoothstep(0.85, 0.0, length(p - vec2(-0.32, 0.34)));
	float glowB = smoothstep(0.70, 0.0, length(p - vec2(0.38, 0.30)));
	float glowPulse = 0.94 + 0.06 * sin(u_time * 0.6);
	float glow = (glowA * 0.55 + glowB * 0.35) * topMask * glowPulse;
	vec3 color = mix(palette_ground, palette_surface, glow * u_intensity);

	// Three thin, fixed vertical bars -- few enough to read as strokes, not
	// a fill. Distance is aspect-corrected so a bar reads as the same
	// physical width regardless of the canvas's own aspect ratio.
	float dx0 = abs(uv.x - 0.16) * aspect;
	float dx1 = abs(uv.x - 0.50) * aspect;
	float dx2 = abs(uv.x - 0.83) * aspect;
	float shimmer0 = 0.80 + 0.20 * fbm(vec2(1.3, u_time * 0.24));
	float shimmer1 = 0.80 + 0.20 * fbm(vec2(6.7, u_time * 0.24));
	float shimmer2 = 0.80 + 0.20 * fbm(vec2(11.9, u_time * 0.24));
	float bar0 = smoothstep(0.007, 0.0, dx0) * shimmer0;
	float bar1 = smoothstep(0.007, 0.0, dx1) * shimmer1;
	float bar2 = smoothstep(0.007, 0.0, dx2) * shimmer2;
	float bars = (bar0 + bar1 + bar2) * topMask;

	color = mix(color, palette_accent, clamp(bars * u_intensity, 0.0, 1.0));
	gl_FragColor = vec4(color, 1.0);
}
`;
