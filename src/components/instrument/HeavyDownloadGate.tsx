type Props = {
	megabytes: number;
	formatLabel: string;
	onAccept: () => void;
};

/**
 * Asks before spending a large one-time download.
 *
 * Every other converter here downloads its codec silently, because a few
 * hundred kilobytes does not warrant a decision. 31MB does — on a phone, on
 * a metered connection, or on a slow line it is a real cost, and discovering
 * it as an unexplained wait would be worse than being asked.
 *
 * It states the size, why it is needed, and that it happens once. Nothing is
 * fetched until the button is pressed.
 */
export function HeavyDownloadGate({ megabytes, formatLabel, onAccept }: Props) {
	return (
		<div
			data-testid="download-gate"
			className="flex flex-col gap-4 border p-6"
			style={{
				borderColor: "var(--text-primary)",
				borderStyle: "dashed",
				borderRadius: "var(--radius)",
			}}
		>
			<span
				className="mono text-[11px] tracking-[0.08em]"
				style={{ color: "var(--text-muted)" }}
			>
				ONE-TIME DOWNLOAD
			</span>
			<p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
				{formatLabel} is an older format that no browser can read on its own, so
				converting it needs a full copy of ffmpeg — about {megabytes}MB. It
				downloads once and your browser keeps it; every conversion after this
				one starts immediately.
			</p>
			<p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
				Your file is still never uploaded. The download is the converter coming
				to your device, not your video leaving it.
			</p>
			<button
				type="button"
				onClick={onAccept}
				className="mono self-start border px-4 py-2 text-[12px]"
				style={{
					color: "var(--text-primary)",
					borderColor: "var(--text-primary)",
				}}
			>
				DOWNLOAD AND CONVERT
			</button>
		</div>
	);
}
