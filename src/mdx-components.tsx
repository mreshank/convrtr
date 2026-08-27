import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/content/Callout";
import { ComparisonTable } from "@/components/content/ComparisonTable";
import { FAQ } from "@/components/content/FAQ";
import { ToolCTA } from "@/components/content/ToolCTA";

const components: MDXComponents = {
	Callout,
	FAQ,
	ComparisonTable,
	ToolCTA,
	h2: (props) => <h2 className="text-[22px] tracking-[-0.01em]" {...props} />,
	h3: (props) => <h3 className="text-[18px] tracking-[-0.01em]" {...props} />,
	p: (props) => <p className="text-[15px] leading-relaxed" {...props} />,
	ul: (props) => (
		<ul
			className="flex flex-col gap-1 pl-5 text-[15px]"
			style={{ listStyleType: "disc" }}
			{...props}
		/>
	),
	ol: (props) => (
		<ol
			className="flex flex-col gap-1 pl-5 text-[15px]"
			style={{ listStyleType: "decimal" }}
			{...props}
		/>
	),
	a: (props) => <a className="underline" {...props} />,
	code: (props) => (
		<code
			className="rounded-[var(--radius)] px-1 py-0.5 font-[family-name:--font-mono] text-[13px]"
			style={{ background: "var(--surface-raised)" }}
			{...props}
		/>
	),
};

export function useMDXComponents(): MDXComponents {
	return components;
}
