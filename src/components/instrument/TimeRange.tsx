import { formatTimecode } from "@/lib/format";

type Props = {
	label: string;
	duration: number;
	start: number;
	end: number;
	onChange: (start: number, end: number) => void;
};

/**
 * Selects a span of a loaded file's timeline.
 *
 * Two native range inputs rather than a custom-drawn dual slider: a real
 * `<input type="range">` is focusable, arrow-key adjustable and announced by
 * screen readers with its current value, none of which comes free with a
 * div-and-pointer-events reimplementation. They are stacked over one shared
 * track so it reads as one control, and the handles cannot cross — each is
 * bounded by the other, so the selection can never invert.
 */
export function TimeRange({ label, duration, start, end, onChange }: Props) {
	// A hundredth of the file, so the handles feel the same on a 10-second clip
	// and a two-hour recording rather than being uselessly coarse or absurdly
	// precise.
	const step = Math.max(0.01, Math.round((duration / 100) * 100) / 100 / 10);
	const leftPercent = duration > 0 ? (start / duration) * 100 : 0;
	const widthPercent = duration > 0 ? ((end - start) / duration) * 100 : 0;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-baseline justify-between">
				<span className="text-[12px]">{label}</span>
				<span
					data-testid="timerange-readout"
					className="mono text-[11px]"
					style={{ color: "var(--text-muted)" }}
				>
					{formatTimecode(start)} — {formatTimecode(end)} (
					{formatTimecode(end - start)})
				</span>
			</div>

			<div className="relative h-8">
				{/* The unselected timeline. */}
				<div
					className="absolute top-[14px] h-[2px] w-full"
					style={{ background: "var(--hairline)" }}
				/>
				{/* The selected span, so the choice is legible without reading
				    the numbers. */}
				<div
					className="absolute top-[14px] h-[2px]"
					style={{
						left: `${leftPercent}%`,
						width: `${widthPercent}%`,
						background: "var(--text-primary)",
					}}
				/>
				<input
					type="range"
					aria-label={`${label} — start`}
					className="absolute w-full"
					style={{ background: "transparent" }}
					min={0}
					max={duration}
					step={step}
					value={start}
					onChange={(event) => {
						// Clamped below the end handle: a start after the end is not
						// a state the rest of the app should ever have to handle.
						const next = Math.min(Number(event.target.value), end - step);
						onChange(Math.max(0, next), end);
					}}
				/>
				<input
					type="range"
					aria-label={`${label} — end`}
					className="absolute w-full"
					style={{ background: "transparent" }}
					min={0}
					max={duration}
					step={step}
					value={end}
					onChange={(event) => {
						const next = Math.max(Number(event.target.value), start + step);
						onChange(start, Math.min(duration, next));
					}}
				/>
			</div>
		</div>
	);
}
