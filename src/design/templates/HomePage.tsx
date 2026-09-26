import type { HOME } from "@/app/home-content";
import { ArchitectureManifestoCard } from "@/components/content/ArchitectureManifestoCard";
import { EcosystemRadarCard } from "@/components/content/EcosystemRadarCard";
import { ExtensionWaitlistCard } from "@/components/content/ExtensionWaitlistCard";
import { MultiHopGraphCard } from "@/components/content/MultiHopGraphCard";
import { StoryProgress } from "@/components/StoryProgress";
import { TOOLS } from "@/core/registry";
import {
	BranchDiagram,
	CategoryCards,
	ComplianceRow,
	DotMatrix,
	FaqBand,
	FeatureGrid,
	FeatureStrip,
	FinalCta,
	FormatStrip,
	FreeForeverBand,
	HeroBand,
	LineageExplorer,
	PipelineTimeline,
	StatsBand,
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
 * The homepage follows the proven SaaS landing shape -- hero, proof strip,
 * capability cards, problem, how-it-works, live demo, price, takeaway,
 * FAQ, final call -- with honest substitutions where that shape fakes it:
 * registry counts instead of logo soup, capability cards with real routes
 * instead of vapourware features, one true $0 plan instead of tier
 * theatre, checkable answers instead of bought testimonials.
 *
 * Each `StoryChapter` carries its number, headline and lede from
 * `home-content.ts`; `SectionSeparator` rails mark the act breaks; the
 * `StoryProgress` rail tracks the reader down the right edge.
 */
export function HomePage({ content }: Props) {
	const { chapters } = content;
	return (
		<>
			<StoryProgress items={content.chapterNav} />
			<EditorialPage
				hero={<HeroBand {...content.hero} />}
				bands={[
					{
						key: "proof",
						node: <StatsBand stats={content.stats} />,
					},
					{ key: "formats", node: <FormatStrip formats={content.formats} /> },
					{
						key: "ch1-what",
						node: (
							<StoryChapter
								index={chapters.what.index}
								eyebrow={chapters.what.eyebrow}
								title={chapters.what.title}
								lede={chapters.what.lede}
							>
								<CategoryCards cards={content.categoryCards} />
								<ToolGrid tools={TOOLS} {...content.toolGrid} />
							</StoryChapter>
						),
					},
					{
						key: "sep-1",
						node: <SectionSeparator label="CH.01 // WHAT IT DOES" />,
					},
					{
						key: "ch2-why",
						node: (
							<StoryChapter
								index={chapters.why.index}
								eyebrow={chapters.why.eyebrow}
								title={chapters.why.title}
								lede={chapters.why.lede}
							>
								<ArchitectureManifestoCard />
								<FeatureStrip items={content.features} />
								<FeatureGrid items={content.gridFeatures} />
							</StoryChapter>
						),
					},
					{
						key: "sep-2",
						node: <SectionSeparator label="CH.02 // WHY NOT CLOUD" />,
					},
					{
						key: "ch3-how",
						node: (
							<StoryChapter
								index={chapters.how.index}
								eyebrow={chapters.how.eyebrow}
								title={chapters.how.title}
								lede={chapters.how.lede}
							>
								<PipelineTimeline stages={content.pipelineStages} />
								<DotMatrix>
									<TerminalPanel {...content.terminal} />
								</DotMatrix>
							</StoryChapter>
						),
					},
					{
						key: "sep-3",
						node: <SectionSeparator label="CH.03 // HOW IT WORKS" />,
					},
					{
						key: "ch4-graph",
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
					{
						key: "sep-4",
						node: <SectionSeparator label="CH.04 // WATCH IT THINK" />,
					},
					{
						key: "ch5-free",
						node: (
							<StoryChapter
								index={chapters.free.index}
								eyebrow={chapters.free.eyebrow}
								title={chapters.free.title}
								lede={chapters.free.lede}
							>
								<FreeForeverBand />
							</StoryChapter>
						),
					},
					{
						key: "sep-5",
						node: <SectionSeparator label="CH.05 // FREE FOREVER" />,
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
						key: "faq",
						node: <FaqBand items={content.faq} />,
					},
					{
						key: "final",
						node: (
							<FinalCta
								eyebrow={content.finalCta.eyebrow}
								title={content.finalCta.title}
								lede={content.finalCta.lede}
							/>
						),
					},
					{
						key: "compliance",
						node: <ComplianceRow {...content.compliance} />,
					},
				]}
			/>
		</>
	);
}
