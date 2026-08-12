// `libheif-js` ships no TypeScript declarations of its own beyond the
// generated Emscripten `WasmModule`/`EmbindModule` interfaces (see
// `node_modules/libheif-js/libheif/libheif.d.ts`), which cover only the raw
// `heif_*` C bindings. The convenience `HeifImage`/`HeifDecoder` classes are
// bolted onto the module object at runtime (see `libheif/libheif.js`, near
// the end: `K.HeifImage = g8, K.HeifDecoder = t7`) and are documented only
// in the package README's example code, not in any shipped `.d.ts`. This is
// a minimal ambient declaration covering exactly the surface `heic.ts`
// actually calls — not a full re-typing of the module.
declare module "libheif-js" {
	/**
	 * Result object handed to (and back out of) `HeifImageHandle.display` —
	 * literally the same object reference both ways: the implementation
	 * fills the caller-supplied `data` in place (`target.data.set(...)`) and
	 * hands that same object to the callback, it does not allocate a new
	 * one. `data` is typed `Uint8ClampedArray<ArrayBuffer>` (not the generic
	 * `Uint8ClampedArray<ArrayBufferLike>`) because callers always construct
	 * it via `new Uint8ClampedArray(n)`, which is always `ArrayBuffer`-backed.
	 */
	export interface HeifDisplayTarget {
		data: Uint8ClampedArray<ArrayBuffer>;
		width: number;
		height: number;
	}

	/** A decoded/decodable image bound to a native `heif_image_handle`. */
	export interface HeifImageHandle {
		get_width(): number;
		get_height(): number;
		/**
		 * NOTE: `is_primary()` is broken in libheif-js 1.19.8 — its
		 * implementation calls a bare, undeclared identifier
		 * (`heif_image_handle_is_primary_image(this.handle)`) instead of
		 * `K.heif_image_handle_is_primary_image(this.handle)`, so invoking it
		 * throws `ReferenceError: heif_image_handle_is_primary_image is not
		 * defined`. Declared here for completeness; `heic.ts` deliberately
		 * does not call it — see the comment there.
		 */
		is_primary(): boolean;
		/** Decodes this handle to interleaved RGBA into `target.data`, async via a macrotask; resolves `null` on failure. */
		display(
			target: HeifDisplayTarget,
			callback: (result: HeifDisplayTarget | null) => void,
		): void;
		/** Releases the native `heif_image_handle`. Must be called exactly once per handle obtained. */
		free(): void;
	}

	/** Opaque native `heif_context` handle, freed via `heif_context_free`. */
	export type HeifContext = unknown;

	/**
	 * `code`/`subcode` are opaque embind enum-value wrapper objects, not
	 * plain numbers — confirmed by probing a real error result: `typeof
	 * code === "object"`, `Number(code)` is `NaN`, and `code == 0` is
	 * `false`. Embind caches one singleton instance per enum member, so the
	 * library's own internal code (and this module) compares by identity
	 * against the named constant (e.g. `libheif.heif_error_code.
	 * heif_error_Ok`) rather than against a raw number.
	 */
	export interface HeifError {
		code: unknown;
		subcode?: unknown;
		message?: string;
	}

	/**
	 * The module's top-level export. Only the embind-bound functions
	 * `heic.ts` calls directly are declared; the full `heif_*` surface is far
	 * larger (see `libheif/libheif.d.ts`'s `EmbindModule`).
	 */
	export interface LibheifModule {
		heif_error_code: { heif_error_Ok: unknown };
		heif_context_alloc(): HeifContext;
		heif_context_free(context: HeifContext): void;
		heif_context_read_from_memory(
			context: HeifContext,
			data: Uint8Array,
		): HeifError;
		/**
		 * Reads the file's `pitm` box directly — the format's own notion of
		 * "primary image" — rather than assuming array order. Returns either
		 * a usable handle or a `HeifError` (distinguish with `"code" in
		 * result`, mirroring the library's own internal `!a || a.code` check).
		 */
		heif_js_context_get_primary_image_handle(
			context: HeifContext,
		): HeifImageHandle | HeifError;
		HeifImage: new (handle: unknown) => HeifImageHandle;
	}

	const libheif: LibheifModule;
	export default libheif;
}
