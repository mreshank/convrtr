/**
 * The subset of libflac.js's low-level API this project uses.
 *
 * Written against the package's own `lib/encoder.js` and `lib/decoder.js`,
 * which are the authoritative callers, rather than against its README — the
 * README documents the helper classes, and those cannot be used here.
 *
 * Deliberately narrow. A wider guess would type-check right up to the moment it
 * failed at runtime, which is exactly how the `getSamples` misreading produced
 * a confident "not lossless" result that was purely my own mistake.
 */
declare module "libflacjs/dist/libflac.min.wasm.js" {
	export type StreamMetadata = {
		sampleRate: number;
		channels: number;
		bitsPerSample: number;
		total_samples?: number;
	};

	export type ReadResult = {
		buffer?: Uint8Array;
		readDataLength: number;
		error: boolean;
	};

	const Flac: {
		isReady(): boolean;
		on(event: "ready", handler: () => void): void;

		create_libflac_encoder(
			sampleRate: number,
			channels: number,
			bitsPerSample: number,
			compression: number,
			totalSamples: number,
			verify: boolean,
		): number;
		init_encoder_stream(
			encoder: number,
			onWrite: (data: Uint8Array) => void,
			onMetadata?: (metadata: StreamMetadata) => void,
		): number;
		/** `pcm` is interleaved; `samples` counts frames, not values. */
		FLAC__stream_encoder_process_interleaved(
			encoder: number,
			pcm: Int32Array,
			samples: number,
		): number;
		FLAC__stream_encoder_finish(encoder: number): boolean;
		FLAC__stream_encoder_delete(encoder: number): void;

		create_libflac_decoder(verify: boolean): number;
		init_decoder_stream(
			decoder: number,
			onRead: (bufferSize: number) => ReadResult,
			onWrite: (channels: Uint8Array[]) => void,
			onError: (code: number, description: string) => void,
			onMetadata?: (metadata: StreamMetadata) => void,
		): number;
		FLAC__stream_decoder_process_until_end_of_stream(decoder: number): boolean;
		FLAC__stream_decoder_finish(decoder: number): boolean;
		FLAC__stream_decoder_delete(decoder: number): void;
	};

	export default Flac;
}
