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
import { EditorialPage } from "@/design/templates";
import { HOME } from "./home-content";

export default function Home() {
	return (
		<EditorialPage
			hero={<HeroBand {...HOME.hero} />}
			bands={[
				{
					key: "terminal",
					node: (
						<DotMatrix>
							<TerminalPanel {...HOME.terminal} />
						</DotMatrix>
					),
				},
				{ key: "strip", node: <FeatureStrip items={HOME.features} /> },
				{ key: "grid", node: <FeatureGrid items={HOME.gridFeatures} /> },
				{
					key: "formats",
					node: <FormatStrip formats={HOME.formats} />,
				},
				{
					key: "tools",
					node: <ToolGrid tools={TOOLS} {...HOME.toolGrid} />,
				},
				{
					key: "branch",
					node: <BranchDiagram from="heic" to={HOME.heicBranches} />,
				},
				{
					key: "compliance",
					node: <ComplianceRow {...HOME.compliance} />,
				},
			]}
		/>
	);
}
