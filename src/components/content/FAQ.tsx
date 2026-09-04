export interface FAQItem {
	q: string;
	a: string;
}

export function FAQ({ items }: { items: FAQItem[] }) {
	return (
		<dl className="flex flex-col gap-4">
			{items.map((item) => (
				<div key={item.q} className="flex flex-col gap-1">
					<dt className="text-[16px]">{item.q}</dt>
					<dd className="text-[14px]" style={{ color: "var(--ink-muted)" }}>
						{item.a}
					</dd>
				</div>
			))}
		</dl>
	);
}
