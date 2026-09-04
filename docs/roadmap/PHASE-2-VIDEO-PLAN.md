# Phase 2 — Video Pack

The differentiator. Everything here follows from one idea.

## The idea: remux before transcode

Almost every browser-based converter re-encodes unconditionally. Feed one an
MKV containing H.264 video and AAC audio, ask for MP4, and it decodes every
frame and re-encodes it — minutes of CPU, a generation of quality lost, for a
file whose *streams were already legal in the target container*.

Changing the container without touching the streams is a **remux**: copy the
packets, write a new header. It is bit-exact, and it takes seconds because no
pixel is ever decoded.

```
demux container
  └─ inspect stream codecs
       ├─ legal in target container? ──> COPY PACKETS      lossless, seconds
       └─ not legal?                 ──> WebCodecs decode → encode → mux
                                                            lossy, honest, GPU
```

This is both the quality story and the speed story, and it is the reason the
fidelity ring exists: a remux genuinely scores 100.

## What is actually copyable

The decision is per stream, not per file, and it is a property of the
container/codec pair. This table is the core of the phase:

| Source | Streams | → MP4 | → WebM | Why |
|---|---|---|---|---|
| MKV | H.264 + AAC | **copy** | transcode | H.264/AAC are native MP4 |
| MOV | H.264 + AAC | **copy** | transcode | MOV and MP4 are both ISOBMFF |
| TS / M2TS | H.264 + AAC | **copy** | transcode | remux out of transport stream |
| WebM | AV1 + Opus | **copy** | **copy** | AV1 and Opus are legal in MP4 |
| WebM | VP9 + Opus | transcode¹ | **copy** | ¹VP9-in-MP4 is legal but poorly played |
| WebM | VP8 + Vorbis | transcode | **copy** | neither is legal in MP4 |
| MP4 | H.264 + AAC | **copy** | transcode | H.264 is not legal in WebM |
| AVI / FLV / WMV | legacy | transcode | transcode | needs the ffmpeg.wasm tier |

¹ The honest default. VP9 in MP4 is spec-legal but many players choke, so
`webm→mp4` transcodes to H.264 by default while offering "copy VP9" in the
advanced tier for users who know their playback target. The UI must say which
path it took — a silent transcode is the exact dishonesty this phase exists to
avoid.

## Architecture — mirroring the image pipeline

The image pack decomposed into decoders × encoders and turned an 80-file matrix
into 18. Video decomposes the same way, with an extra tier:

```ts
interface Demuxer  { id; mime[]; probe(); demux(input): Promise<Streams> }
interface Muxer    { id; mime;   probe(); mux(streams): Promise<Output>   }
interface Transcoder { probe(config); transcode(stream, target): Promise<Stream> }
```

`createVideoPipelineEngine(demuxerId, muxerId)` composes them and **decides the
copy-vs-transcode path per stream at runtime**, after probing what this device's
WebCodecs implementation actually supports.

## Engine tiers

| Tier | Technology | Cost | Role |
|---|---|---|---|
| 1 | Stream copy (mediabunny / mp4box.js) | 0 | remux — always tried first |
| 2 | **WebCodecs** | 0, GPU | real transcode, 10–50× ffmpeg.wasm |
| 3 | ffmpeg.wasm | ~30 MB | legacy containers only, downloaded on consent |

Tier 3 is never fetched without telling the user first. That rule already exists
in the spec and matters more here than anywhere: 30 MB on a phone is a real cost.

## The hard problems, honestly

**Memory.** A 2 GB video cannot be held in RAM, let alone twice. Everything must
stream: demux reads chunks, the muxer writes chunks to **OPFS**, and only the
finished file is handed to the save path. This is the single biggest engineering
difference from the image pack, where holding a whole file was fine.

**Codec probing is per device, not per browser.** `VideoEncoder.isConfigSupported()`
must be consulted at runtime. The same Chrome version has different hardware
codec support on different machines; guessing from the user agent produces either
a broken conversion or a needless fallback.

**Progress must be real.** Frame counts are known after demux, so progress is
genuinely computable. No indeterminate spinner.

**Cancellation must free GPU resources**, not just detach the UI. `VideoEncoder`
and `VideoDecoder` hold real hardware handles that must be closed.

## Tools this unlocks

Convert/remux: `webm→mp4` `mkv→mp4` `mov→mp4` `ts→mp4` `avi→mp4` `mp4→webm`
`mp4→mkv`. Edit: trim on keyframes (stream copy), split, concatenate, rotate via
container metadata (no re-encode), mute, replace audio. Extract: audio (copy
path first), frames, thumbnail, contact sheet. Create: `video→gif` with palette
generation, images→slideshow.

The lossless ones — remux, keyframe trim, metadata rotate, audio extract by copy
— are the ones competitors get wrong, so they lead.

## Order of work

1. **Demux/mux layer + the copy-path decision table.** Nothing else matters until
   a remux is provably bit-exact — the fidelity harness pattern extends here:
   assert the copied stream payload is byte-identical to the source's.
2. **OPFS streaming**, before any large-file tool ships.
3. **WebCodecs transcoder** with runtime probing.
4. `webm→mp4` end to end, both paths, with the UI stating which it took.
5. The remaining container pairs, which are then nearly free.
6. Edit and extract tools.
7. ffmpeg.wasm tier for legacy containers, behind consent.

## Dependencies to add

`mediabunny` (TS, WebCodecs-native demux/mux), `mp4box.js` (MP4 parsing),
`mediainfo.js` (stream probing for the inspector), and later
`@ffmpeg/ffmpeg` + `@ffmpeg/core-mt` for tier 3.

Install them in **one controller pass**, as with the image codecs — concurrent
agents must never race the lockfile.

## Definition of done

- [x] `mkv→mp4` on an H.264/AAC source produces a file whose video stream
  payload is **byte-identical** to the source's, proven by test, in seconds.
  — `e2e/remux.spec.ts`, verified with ffmpeg/ffprobe, which take no part in
  the conversion. Falsified by flipping the default preset to re-encode.
- [x] `webm→mp4` works on both paths and the UI names which one ran.
  — the finished readout says `STREAMS COPIED` or `RE-ENCODED`, taken from the
  engine's observed phases rather than from the chosen preset, so it is right
  even where the registry's guess is not. Tested in both directions; falsified
  by pinning the label.
- [x] A file larger than available RAM converts without the tab dying.
  — `e2e/stream.spec.ts` streams a 70MB MKV (over the 64MiB threshold at which
  preflight switches strategy) straight to disk and proves the H.264 payload
  is byte-identical to the source's. Input is read in slices via `BlobSource`
  and output written through `StreamTarget`, so neither side is ever resident.
- [ ] Cancellation releases GPU codec handles, verified.
- [ ] Every lossless claim has a test, exactly as the image pack does.

### What streaming cost, and what it did not

Whole-file hashes of the streamed and buffered outputs **differ**, and that is
correct rather than a defect: a seekable stream target lays the container out
differently from a buffer target — moov placement and interleaving — while
carrying identical compressed video. Any test comparing the two paths
byte-for-byte at the file level would fail while nothing was wrong, which is
why the streaming proof compares the *payload* against the source instead.

A streamed conversion has no in-memory result, so it cannot be previewed and
cannot be re-saved. The UI says "SAVED TO DISK" and shows no SAVE button,
because offering one would imply bytes are being held that are not.

### Keyframe trim, and why `Conversion` could not do it

The plan listed "trim on keyframes (stream copy)" as though mediabunny's
`trim` option would provide it. **It does not.** `Conversion`'s copy path
requires `firstTimestamp >= startTimestamp`, so asking for a clip that starts
anywhere but the beginning of the file fails that check and every frame goes
through a decoder and an encoder. Same for audio, via `needsTrimming`. That is
correct behaviour for an API promising a cut at the exact requested time — and
it is the trade this tool refuses.

So the trim is built at the packet level: `EncodedPacketSink` reads packets out,
`EncodedVideoPacketSource`/`EncodedAudioPacketSource` write them back with only
their timestamps shifted. Nothing is decoded. Proven by extracting the trimmed
file's H.264 with ffmpeg and finding it verbatim, contiguously, at a **non-zero
offset** inside the source's stream — which says these exact bytes came out of
that exact file, in order, untouched.

The cut has to move. Most frames are stored as differences from earlier ones,
so a copy must begin at a keyframe, and keyframes are seconds apart. The tool
moves the start back and says by how much; a shift under 0.1s is not reported,
because a message on every trim is a message nobody reads when it matters.

Two bugs worth remembering. Tracks must all be added to an `Output` **before**
`start()` — the first version added video, started, then added audio, and threw
partway through; the e2e caught it only because the fixture had both. And the
byte-substring check needed an explicit non-empty assertion: a falsification
run produced an unreadable output, and `indexOf` of an empty buffer is 0, which
satisfied the comparison by being nothing at all.

### The ffmpeg.wasm tier, and what it cost to wire up

AVI, FLV and WMV cannot be read by any browser API, so they need a real
ffmpeg. The core is 31MB — two orders of magnitude beyond every other engine
here — which drives every decision about it:

- **Not in git.** `scripts/copy-ffmpeg-core.mjs` copies it out of
  `node_modules` at build time and `public/ffmpeg/` is ignored. It is pinned in
  the lockfile and reproducible from it; committing 31MB would tax every clone
  forever.
- **Not precached.** The service worker excludes the whole `ffmpeg/` prefix.
  The `.wasm` was already excluded by extension, but the 109KB loader is a
  `.js` and would have been fetched on install by every visitor, quietly
  undoing the opt-in.
- **Not downloaded without asking.** `Tool.heavyDownloadMb` drives a consent
  gate that stands *in place of* the CONVERT button, so there is no path to the
  download that skips it. The e2e asserts zero `/ffmpeg/` requests before the
  gate is accepted, rather than assuming it.
- **Copy first.** An AVI usually holds MPEG-4 and MP3, both legal in MP4, so
  the streams copy across untouched and the result is genuinely lossless. Only
  when ffmpeg rejects the copy does it re-encode, and it says which happened.

Three failures on the way in, each with a misleading error:

1. `"failed to import ffmpeg-core.js"` — the UMD core was copied. The wrapper's
   worker is a *module* worker where `importScripts` does not exist, so it falls
   back to `await import(coreURL)` and reads `.default`, which a UMD bundle does
   not have. Use `dist/esm`.
2. `"Cannot find module '/ffmpeg/ffmpeg-core.js'"` — webpack bundles the
   wrapper's `worker.js` (its own source comments say the code is duplicated
   there *so that* webpack can), which rewrites the dynamic import into
   webpack's module loader, and that cannot resolve a runtime URL. Self-host
   the worker and pass `classWorkerURL`.
3. `"Script at 'file:///ffmpeg/worker.js' cannot be accessed"` — root-relative
   URLs are resolved with `new URL(path, import.meta.url)`, and inside a
   webpack worker bundle `import.meta.url` is a `file:` URL. Build absolute
   URLs from `self.location.origin`.

The first of those surfaced only as "Unknown failure", because the pipeline
worker collapsed every non-`Error` rejection to that string — ffmpeg.wasm
rejects with plain values. `describeFailure()` now recovers a message from
strings, `{ message }` objects and JSON, which the *user* needed as much as
this debugging did.

### Video to GIF: the one tool that cannot claim losslessness

GIF holds at most 256 colours per frame against the source's millions, so every
GIF made from video is a heavy approximation. `losslessAvailable: false`, and
the FAQ says so in the first answer — an honest exception matters more here
than anywhere, because it is what makes the lossless claims elsewhere worth
believing.

The options are therefore about how the loss is spent. The default builds one
palette from pixels sampled evenly across the clip and shares it between
frames: per-frame palettes give each frame better colours in isolation but
disagree with each other, so flat areas crawl and shimmer — more distracting
than the colour error they fix, and larger, since each frame then carries its
own colour table. ffmpeg's `palettegen`/`paletteuse` pair works this way for
the same reason. Per-frame stays available for clips whose subject changes
completely partway through.

Frame delays are stored in hundredths of a second, so most frame rates cannot
be expressed exactly — 15fps becomes 14.3. The tool says so when the difference
exceeds half a frame rather than letting someone wonder why their GIF runs
slow. Frames are capped at 300 because a shared palette cannot be computed
until every frame has been decoded and held.

Dependency added: `gifenc` (MIT, pure JS, no WASM). It ships no types, so
`src/types/gifenc.d.ts` declares the surface actually used, written from its
source rather than its README.

The stack-overflow worth remembering: `sampled.push(...frame.data)` passes
every pixel as a separate argument — half a million per 480px frame — and dies
with "Maximum call stack size exceeded" and no hint of where. Copy into a
pre-sized `Uint8Array` with `set()` instead.

Tested against a fixture of one solid colour per second, so ffprobe can report
which colours appear and in what order — pinning down both the section taken
and the direction of time without knowing anything about the encoder.
Falsified by reversing the frames, which reports
`yellow -> blue -> lime -> red`.

### Frame extraction, and a narrower fidelity claim

`frame:mp4` decodes one frame and hands the pixels to the same PNG encoder
every image tool uses, so it gets a real lossless encode with optional oxipng
recompression rather than `canvas.toBlob`'s version. `CanvasSink` does the
rasterising, which avoids reimplementing YUV-to-RGB — a step a hand-rolled
version would get subtly wrong on anything but BT.709.

The fidelity claim here is deliberately narrower than the trim's. The PNG is an
exact record of the frame *as decoded*, and nothing further is lost — but the
frame came out of a lossy codec and this cannot recover detail the video never
had. "A PNG of a frame is the best possible copy of that frame, not a better
version of it" is what the FAQ says, because the unqualified word "lossless"
would be the kind of half-truth the rest of the catalogue avoids.

Tested by building a fixture with one solid colour per second, so the colour of
the extracted image says which second it came from — a check that needs no
knowledge of either decoder. Falsified by pinning the engine to frame 0, which
returns red at a colour distance of 361 against a threshold of 60. Colours are
compared with tolerance because the YUV round trip is not exactly reversible:
pure red comes back as rgb(255, 24, 0).

Two bugs the tests caught. The duration probe was gated on `timerange` alone,
so the frame tool's `timestamp` slider rendered with a maximum of zero —
present, and unusable. And the tool's id and slug disagreed, which the
conformance test caught for the second time in this project: routes derive from
the slug and lookups from the id, so a page renders and then cannot find its
own tool.

### File-dependent controls

Trim needed something the registry could not express. Every control declares
its own `min`/`max`, but a clip's bounds are the duration of whatever file was
just dropped — a slider with a guessed maximum is unusable on both a
ten-second clip and a two-hour recording.

`control: "timerange"` therefore carries no bounds. It names two param keys and
the panel fills the range from a duration probe that reads the container index
without touching media data. Defaults are `0`/`0`, which the engine reads as
"the whole file", so an untouched control is the identity operation rather than
an empty selection. Frame extraction and video→GIF need the same capability,
which is why it was built as a control rather than special-cased into the trim
page.

### Poorly-supported combinations: copy and warn, not transcode

`compatibility.ts` originally documented that spec-legal but badly-played
combinations — VP9 in MP4 being the case that matters — should be transcoded by
default, reasoning that a lossless file which will not open is worse than an
honest re-encode. **The engine never implemented it.** mediabunny copies
whatever the container can legally carry, so the documented policy and the
shipped behaviour disagreed for as long as both existed, with `planRemux` being
the dead half. Measured: a VP9+Opus WebM converts to MP4 with a 0% size change.

The behaviour was right and the policy was wrong. Re-encoding by default
destroys quality permanently to fix a problem the user may not have — their
player may handle VP9-in-MP4 perfectly well. Copying costs a file that might
not open, which is discovered immediately and fixed by re-running with a
re-encode. One failure mode is recoverable and the other is not.

So the policy now matches: copy, state the caveat, leave the re-encode
available through the existing `forceTranscode` toggle. `planRemux`'s
`allowPoorSupport` became `avoidPoorSupport` and the two tests encoding the old
default were inverted.

### Notices, because progress phases are not a warning channel

The "some tracks could not be carried over" warning was emitted as a progress
phase, which renders inside the progress bar — the element removed the instant
the conversion ends. A warning visible only while someone waits for the thing
that triggered it is not a warning.

`Engine` gained an optional `onNotice`, carried through the worker as a
`notice` job event and rendered beside the result. Optional so the image
engines, which have nothing to warn about, needed no change. The panel is
absent when there is nothing to say — asserted, because a notice panel that
always appears trains people to ignore the one that matters.

### Audio extraction and AAC encoder pre-roll

`mp4->m4a` copies the AAC stream out byte for byte, proven by ffmpeg against
the source. Getting there took two corrections worth keeping.

First, it re-encoded. mediabunny's `trim.start` defaults to "the earliest track
timestamp, or 0, whichever is higher". AAC carries encoder-delay priming, which
an MP4 records as a *negative* first timestamp, so the default clamps to 0 —
asking for the pre-roll to be trimmed, which can only be done by decoding.
Measured: 64kbps in, 165kbps out, on a conversion advertised as a copy. Passing
the track's real first timestamp makes the trim a no-op and the packets copy.

Second, the obvious fix for the leftover pre-roll does not work. A preset that
re-encoded in order to trim it was built and measured: the new encoder adds its
own pre-roll and padding, so on a 2.020s source the copy came out 2.043s and
the re-encode 2.113s — further from the original, not closer, while also being
lossy. It was removed rather than shipped. A control whose stated benefit is
false is worse than no control, so the tool has one honest mode and the FAQ
states the ~23ms cost where the choice is made.

The general lesson, which cost time twice in this pack: **do not keep a local
table of what a library supports.** The first draft of the audio codec table
was wrong three ways (claimed MP4 takes ALAC, that Ogg takes FLAC, that WAV
never copies). `format.getSupportedAudioCodecs()` is the authority; ask it.

### The commit hazard, recorded because it is easy to reintroduce

A muxer closes its target when it stops writing, and mediabunny does so from a
`finally` — so it also closes after a *failed* finalize, and on cancel. For a
`FileSystemWritableFileStream`, `close()` is what commits the file. Passing the
file stream straight to the muxer therefore commits whatever bytes escaped a
crash: a truncated video that plays its opening seconds and silently lacks the
rest, which is worse than no file because it looks finished.

So `createFileSink`'s `close()` is deliberately a no-op, and committing is a
separate act taken only once the engine has resolved. `runStreamingConversion`
owns that decision and discards on any throw. Both halves are tested, and the
test was falsified against the naive `finally { commit() }`.
