type Row = {
	label: string;
	value: number;
};

type Props = {
	data: Row[];
};

/**
 * v2's hero data visualisation, in the only form its guardrails permit: thin
 * vertical mint bars over black. v2 forbids a full-frame saturated gradient
 * behind the hero and confines colour to "thin vertical bars/glows in the
 * upper hero region", which is precisely this.
 *
 * Built on a `<table>` rather than a row of divs. The bars are geometry and
 * the numbers are the content, so assistive technology gets a real table with
 * real figures while the visual layer stays decorative. That also means the
 * chart degrades to something legible with no CSS at all, which a static
 * export should.
 *
 * A zero row draws a 1px floor rather than nothing. A category with no tools
 * yet is an empty column, and a column of height zero reads as a missing one.
 */
export function BarChart({ data }: Props) {
	const max = Math.max(...data.map((row) => row.value), 1);

	return (
		<table
			style={{
				width: "100%",
				borderCollapse: "collapse",
				tableLayout: "fixed",
			}}
		>
			<caption className="meta" style={{ textAlign: "left" }}>
				Tools by category
			</caption>
			<tbody>
				<tr>
					{data.map((row) => (
						<td
							key={row.label}
							style={{
								verticalAlign: "bottom",
								height: "var(--gap-lg)",
								padding: 0,
							}}
						>
							<div
								data-bar
								style={{
									background: "var(--accent)",
									height:
										row.value === 0
											? "1px"
											: `${Math.round((row.value / max) * 10000) / 100}%`,
									width: "var(--space-base)",
									margin: "0 auto",
								}}
							/>
						</td>
					))}
				</tr>
				<tr>
					{data.map((row) => (
						<td
							key={row.label}
							className="mono"
							style={{
								color: "var(--ink)",
								textAlign: "center",
								padding: "var(--gap-sm) 0 0",
							}}
						>
							{row.value}
						</td>
					))}
				</tr>
				<tr>
					{data.map((row) => (
						<th
							key={row.label}
							scope="col"
							className="meta"
							style={{
								color: "var(--ink-muted)",
								fontWeight: 400,
								textAlign: "center",
								padding: "var(--space-base) 0 0",
							}}
						>
							{row.label}
						</th>
					))}
				</tr>
			</tbody>
		</table>
	);
}
