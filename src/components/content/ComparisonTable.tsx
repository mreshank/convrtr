export interface ComparisonRow {
	label: string;
	values: string[];
}

export function ComparisonTable({
	columns,
	rows,
}: {
	columns: string[];
	rows: ComparisonRow[];
}) {
	return (
		<table className="w-full border-collapse text-[14px]">
			<thead>
				<tr>
					<th
						className="border-b p-2 text-left"
						style={{ borderColor: "var(--hairline)" }}
					/>
					{columns.map((column) => (
						<th
							key={column}
							className="border-b p-2 text-left"
							style={{ borderColor: "var(--hairline)" }}
						>
							{column}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.label}>
						<th
							className="border-b p-2 text-left font-normal"
							style={{ borderColor: "var(--hairline)" }}
						>
							{row.label}
						</th>
						{row.values.map((value, i) => (
							<td
								// biome-ignore lint/suspicious/noArrayIndexKey: values are positionally paired with columns, not independently identifiable
								key={`${row.label}-${i}`}
								className="border-b p-2"
								style={{ borderColor: "var(--hairline)" }}
							>
								{value}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
}
