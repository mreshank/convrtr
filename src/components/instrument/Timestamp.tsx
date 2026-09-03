import { formatTimecode } from "@/lib/format";

type Props = {
	label: string;
	duration: number;
	value: number;
	onChange: (value: number) => void;
};

/**
 * Picks one moment on the loaded file's timeline.
 *
 * A native range input, so it is focusable, arrow-key adjustable and announced
 * with its value — none of which a div-and-pointer-events slider gives for
 * free. The step is a hundredth of the file so the handle feels the same on a
 * ten-second clip and a two-hour recording.
 */
export function Timestamp({ label, duration, value, onChange }: Props) {
	const step = Math.max(0.01, Math.round(duration) / 1000);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-baseline justify-between">
				<span className="text-[12px]">{label}</span>
				<span
					data-testid="timestamp-readout"
					className="mono text-[11px]"
					style={{ color: "var(--text-muted)" }}
				>
					{formatTimecode(value)} / {formatTimecode(duration)}
				</span>
			</div>
			<input
				type="range"
				aria-label={label}
				className="w-full"
				min={0}
				max={duration}
				step={step}
				value={value}
				onChange={(event) => onChange(Number(event.target.value))}
			/>
		</div>
	);
}
