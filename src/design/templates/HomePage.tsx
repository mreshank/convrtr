import type { HOME } from "@/app/home-content";
import { TOOLS } from "@/core/registry";
import {
	BranchDiagram,
	ComplianceRow,
	DotMatrix,
	FeatureGrid,
	FeatureStrip,
	FormatStrip,
	HeroBand,
	TerminalPanel,
	ToolGrid,
} from "@/design/families";
import { EditorialPage } from "./EditorialPage";

type Props = {
	content: typeof HOME;
};

/**
 * The home page's band sequence.
 *
 * Two templates, two jobs, deliberately not one. `EditorialPage` is a shell:
 * it knows the section rhythm (the hero, then a gap-separated stack of
 * bands) and nothing about which bands exist or what order they run in.
 * That sequence -- terminal demo, feature strip, feature grid, format strip,
 * tool grid, branch diagram, compliance row -- is `/`'s specific shape, and
 * a shape belongs in a template, not in the route that happens to serve it.
 *
 * `HomePage` owns that sequence and delegates the shell to `EditorialPage`,
 * which is what lets `src/app/page.tsx` import neither `@/design/families`
 * nor `@/design/primitives`: the route resolves `HOME` and hands it here:
 * everything past that is composition, and composition belongs in a
 * template per spec §6.3.
 *
 * `content` arrives as a prop rather than this file importing `HOME`
 * directly so the template stays testable against a fixture.
 */
export function HomePage({ content }: Props) {
	return (
		<EditorialPage
			hero={<HeroBand {...content.hero} />}
			bands={[
				{
					key: "terminal",
					node: (
						<DotMatrix>
							<TerminalPanel {...content.terminal} />
						</DotMatrix>
					),
				},
				{ key: "strip", node: <FeatureStrip items={content.features} /> },
				{ key: "grid", node: <FeatureGrid items={content.gridFeatures} /> },
				{
					key: "formats",
					node: <FormatStrip formats={content.formats} />,
				},
				{
					key: "tools",
					node: <ToolGrid tools={TOOLS} {...content.toolGrid} />,
				},
				{
					key: "branch",
					node: <BranchDiagram from="heic" to={content.heicBranches} />,
				},
				{
					key: "compliance",
					node: <ComplianceRow {...content.compliance} />,
				},
			]}
		/>
	);
}
