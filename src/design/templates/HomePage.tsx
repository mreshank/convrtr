import type { HOME } from "@/app/home-content";
import { ArchitectureManifestoCard } from "@/components/content/ArchitectureManifestoCard";
import { EcosystemRadarCard } from "@/components/content/EcosystemRadarCard";
import { ExtensionWaitlistCard } from "@/components/content/ExtensionWaitlistCard";
import { MultiHopGraphCard } from "@/components/content/MultiHopGraphCard";
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

export function HomePage({ content }: Props) {
	return (
		<EditorialPage
			hero={<HeroBand {...content.hero} />}
			bands={[
				{
					key: "extension-waitlist",
					node: <ExtensionWaitlistCard />,
				},
				{
					key: "manifesto",
					node: <ArchitectureManifestoCard />,
				},
				{
					key: "multihop",
					node: <MultiHopGraphCard />,
				},
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
					key: "radar",
					node: <EcosystemRadarCard />,
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

