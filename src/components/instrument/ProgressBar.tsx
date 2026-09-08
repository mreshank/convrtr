import { formatDuration, formatPercent } from "@/lib/format";

type Props = { ratio: number; phase: string; elapsedSeconds: number };

export function ProgressBar({ ratio, phase, elapsedSeconds }: Props) {
	return (
		<div className="flex flex-col gap-2">
			<div
				role="progressbar"
				aria-valuenow={Math.round(ratio * 100)}
				aria-valuemin={0}
				aria-valuemax={100}
				// h-px: a hairline track, same thickness as --rule-width. Was
				// `h-[2px]` -- an ad-hoc value the F3 Tailwind-arbitrary-value
				// sweep (`design-system.test.ts`) now catches; this track is
				// painted with `--rule`, the hairline colour, so it reads as one.
				className="h-px w-full"
				style={{ background: "var(--rule)" }}
			>
				<div
					className="h-full"
					style={{
						width: `${ratio * 100}%`,
						background: "var(--ink)",
					}}
				/>
			</div>
			<span data-testid="progress-readout" className="mono text-[12px]">
				{formatPercent(ratio)} {"·"} {phase} {"·"} ELAPSED{" "}
				{formatDuration(elapsedSeconds)}
			</span>
		</div>
	);
}
