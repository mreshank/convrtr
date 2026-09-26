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
	LineageExplorer,
	PipelineTimeline,
	StoryChapter,
	TerminalPanel,
	ToolGrid,
} from "@/design/families";
import { SectionSeparator } from "@/design/primitives/SectionSeparator";
import { EditorialPage } from "./EditorialPage";

type Props = {
	content: typeof HOME;
};

/**
 * The homepage tells one story -- a single file's journey from drop to
 * download -- in six chapters. Each `StoryChapter` carries its number,
 * headline and lede from `home-content.ts`; `SectionSeparator` rails mark
 * the act breaks. Bands that used to stand alone now play a part:
 * the terminal log is the journey's evidence, the multi-hop demo and the
 * lineage explorer are the graph made touchable, and the compliance row
 * closes the page as a verification seal.
 */
export function HomePage({ content }: Props) {
	const { chapters } = content;
	return (
		<EditorialPage
			hero={<HeroBand {...content.hero} />}
			bands={[
				{
					key: "ch1-problem",
					node: (
						<StoryChapter
							index={chapters.problem.index}
							eyebrow={chapters.problem.eyebrow}
							title={chapters.problem.title}
							lede={chapters.problem.lede}
						>
							<ArchitectureManifestoCard />
						</StoryChapter>
					),
				},
				{
					key: "sep-1",
					node: <SectionSeparator label="CH.01 // THE PROBLEM" />,
				},
				{
					key: "ch2-journey",
					node: (
						<StoryChapter
							index={chapters.journey.index}
							eyebrow={chapters.journey.eyebrow}
							title={chapters.journey.title}
							lede={chapters.journey.lede}
						>
							<PipelineTimeline stages={content.pipelineStages} />
							<DotMatrix>
								<TerminalPanel {...content.terminal} />
							</DotMatrix>
						</StoryChapter>
					),
				},
				{
					key: "sep-2",
					node: <SectionSeparator label="CH.02 // THE JOURNEY" />,
				},
				{
					key: "ch3-graph",
					node: (
						<StoryChapter
							index={chapters.graph.index}
							eyebrow={chapters.graph.eyebrow}
							title={chapters.graph.title}
							lede={chapters.graph.lede}
						>
							<MultiHopGraphCard />
							<LineageExplorer sources={content.lineageSources} />
							<BranchDiagram from="heic" to={content.heicBranches} />
						</StoryChapter>
					),
				},
				{ key: "sep-3", node: <SectionSeparator label="CH.03 // THE GRAPH" /> },
				{
					key: "ch4-refusals",
					node: (
						<StoryChapter
							index={chapters.refusals.index}
							eyebrow={chapters.refusals.eyebrow}
							title={chapters.refusals.title}
							lede={chapters.refusals.lede}
						>
							<FeatureStrip items={content.features} />
							<FeatureGrid items={content.gridFeatures} />
						</StoryChapter>
					),
				},
				{
					key: "sep-4",
					node: <SectionSeparator label="CH.04 // THE REFUSALS" />,
				},
				{
					key: "ch5-arsenal",
					node: (
						<StoryChapter
							index={chapters.arsenal.index}
							eyebrow={chapters.arsenal.eyebrow}
							title={chapters.arsenal.title}
							lede={chapters.arsenal.lede}
						>
							<ToolGrid tools={TOOLS} {...content.toolGrid} />
						</StoryChapter>
					),
				},
				{ key: "formats", node: <FormatStrip formats={content.formats} /> },
				{
					key: "sep-5",
					node: <SectionSeparator label="CH.05 // THE ARSENAL" />,
				},
				{
					key: "ch6-carry",
					node: (
						<StoryChapter
							index={chapters.carry.index}
							eyebrow={chapters.carry.eyebrow}
							title={chapters.carry.title}
							lede={chapters.carry.lede}
						>
							<ExtensionWaitlistCard />
							<EcosystemRadarCard />
						</StoryChapter>
					),
				},
				{
					key: "compliance",
					node: <ComplianceRow {...content.compliance} />,
				},
			]}
		/>
	);
}
