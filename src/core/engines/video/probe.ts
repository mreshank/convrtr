/**
 * Reads a media file's duration without decoding it.
 *
 * Needed because a trim control cannot be declared in the registry the way
 * every other option is: its bounds are the length of the file the user just
 * dropped, which nothing knows until then. The registry can say "this tool
 * needs a time range"; only the file can say how long that range is.
 *
 * mediabunny is imported dynamically so the demuxer is fetched when someone
 * loads a video, not by every page in the catalogue. Reading duration parses
 * the container's index — it does not read the media data, so it stays fast on
 * a file of any size.
 */
export async function probeDuration(file: Blob): Promise<number> {
	const { Input, BlobSource, ALL_FORMATS } = await import("mediabunny");
	const input = new Input({
		source: new BlobSource(file),
		formats: ALL_FORMATS,
	});
	return input.computeDuration();
}
