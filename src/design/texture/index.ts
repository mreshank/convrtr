/**
 * The texture layer's import surface: `ShaderSurface` and the three named
 * fragments v2's Graphics & Effects section names -- `heroGlow`,
 * `halftone`, `branchNetwork` -- and nothing else. `HeroBand.tsx`,
 * `TerminalPanel.tsx` and `SiteFooter.tsx` import their fragment from here
 * rather than reaching into `glsl/` directly, the same reason every other
 * composition layer in this codebase goes through a barrel.
 */
export { BRANCH_NETWORK_FRAGMENT } from "./glsl/branchNetwork";
export { HALFTONE_FRAGMENT } from "./glsl/halftone";
export { HERO_GLOW_FRAGMENT } from "./glsl/heroGlow";
export { ShaderSurface } from "./ShaderSurface";
