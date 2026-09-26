/**
 * Browser stub for Node.js built-ins (`module`, `fs`, `path`, `url`, `crypto`).
 *
 * `7z-wasm` (7zz.es6.js) references these only under its
 * `ENVIRONMENT_IS_NODE` guard, which is false in browsers — but bundlers
 * still resolve the specifiers statically at build time. Turbopack (used by
 * `next dev`) has no `resolve.fallback: false` equivalent, so bare `module`
 * fails with "Can't resolve 'module'".
 *
 * next.config.ts aliases these to this file for browser chunks only (via the
 * `{ browser: ... }` condition), so server/Node bundles keep the real
 * built-ins. This module is never executed in the browser.
 */

const empty = {};
export default empty;
