import type { HeifDisplayTarget } from "libheif-js";
import type { ImageDecoder } from "../types";

export const heicDecoder: ImageDecoder = {
	id: "heic",
	mime: ["image/heic", "image/heif"],

	async probe() {
		// `libheif-js`'s default build (`import("libheif-js")`, used below)
		// compiles to asm.js, not WebAssembly — verified by grepping the
		// installed bundle for the string "WebAssembly" and finding zero
		// occurrences (the package also ships `libheif-js/wasm` and
		// `libheif-js/wasm-bundle` entry points that *do* use real
		// WebAssembly, but the brief names the bare `libheif-js` package, and
		// its default export is this pure-JS build). Gating on
		// `typeof WebAssembly` would therefore test a capability this build
		// doesn't use; the real requirement is typed-array support, which
		// every runtime this ships to (Worker, browser, Node for tests) has.
		return typeof Uint8ClampedArray === "function";
	},

	async decode(input: ArrayBuffer): Promise<ImageData> {
		// Dynamic import: even the pure-JS build is ~2MB uncompressed and
		// must only download when a HEIC conversion actually needs it.
		const { default: libheif } = await import("libheif-js");

		const context = libheif.heif_context_alloc();
		try {
			const readError = libheif.heif_context_read_from_memory(
				context,
				new Uint8Array(input),
			);
			// `readError.code` is an opaque embind enum-value object, not a
			// plain number (confirmed by probing: `typeof code === "object"`,
			// `Number(code)` is `NaN`) — compare by identity against the
			// named constant, exactly as libheif-js's own internal code does.
			if (readError.code !== libheif.heif_error_code.heif_error_Ok) {
				throw new Error(
					`HEIC parse failed: ${readError.message ?? "unknown error"}`,
				);
			}

			// A HEIC container can hold several images — burst shots,
			// live-photo frames, depth/thumbnail auxiliaries — all reachable
			// as "top-level" images. Two tempting shortcuts both give the
			// wrong image in general:
			//
			// 1. `new libheif.HeifDecoder().decode(buffer)[0]` — this
			//    enumerates every top-level image in raw ID order with no
			//    primary flag attached; the file's actual primary item is
			//    not guaranteed to be first (confirmed by inspecting
			//    `HeifDecoder.prototype.decode`, which builds its array from
			//    `heif_js_context_get_list_of_top_level_image_IDs` and never
			//    consults `heif_context_get_primary_image_ID` at all).
			// 2. `image.is_primary()` on each candidate — broken in
			//    libheif-js 1.19.8, see `libheif-js.d.ts` in this directory;
			//    it throws a ReferenceError the instant it's called.
			//
			// `heif_js_context_get_primary_image_handle` sidesteps both: it
			// reads the file's `pitm` box directly, which is the format's own
			// designation of the image viewers/OSes show by default, and is
			// what this library uses internally to answer "primary" for
			// everything else (e.g. its own C API's `heif_context_
			// get_primary_image_ID`). Verified end-to-end against a genuine
			// three-top-level-image HEIC fixture (see
			// `__tests__/fixtures/C020.heic` and `__tests__/heic-decoder.
			// test.ts`) before relying on it here.
			const primary = libheif.heif_js_context_get_primary_image_handle(context);
			if (!primary || "code" in primary) {
				const message =
					primary && "message" in primary ? primary.message : undefined;
				throw new Error(
					`HEIC primary image lookup failed: ${message ?? "unknown error"}`,
				);
			}

			const image = new libheif.HeifImage(primary);
			try {
				const width = image.get_width();
				const height = image.get_height();
				const target: HeifDisplayTarget = {
					data: new Uint8ClampedArray(width * height * 4),
					width,
					height,
				};

				const decoded = await new Promise<HeifDisplayTarget | null>(
					(resolve) => {
						image.display(target, resolve);
					},
				);
				if (!decoded) {
					throw new Error("HEIC decode failed: display() produced no data");
				}

				return {
					data: decoded.data,
					width: decoded.width,
					height: decoded.height,
					colorSpace: "srgb",
				};
			} finally {
				// Release the native image handle. Phone photos are large —
				// a handle leak here compounds across every burst/live-photo
				// frame decoded in a session.
				image.free();
			}
		} finally {
			libheif.heif_context_free(context);
		}
	},
};
