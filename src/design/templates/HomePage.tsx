import type { HOME } from "@/app/home-content";
import { StoryProgress } from "@/components/StoryProgress";
import { ArchitectureManifestoCard } from "@/components/content/ArchitectureManifestoCard";
import { EcosystemRadarCard } from "@/components/content/EcosystemRadarCard";
import { ExtensionWaitlistCard } from "@/components/content/ExtensionWaitlistCard";
import { MultiHopGraphCard } from "@/components/content/MultiHopGraphCard";
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
 * `home-content.ts`. The act-break `SectionSeparator` sits INSIDE its
 * chapter's band rather than as its own band: a standalone separator band
 * pays the shell's full section rhythm on both sides, leaving a 480px void
 * around a 1px line. Fused, the break costs one breath, not two.
 * The `StoryProgress` rail tracks the reader down the right edge.
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
							<>
								<SectionSeparator label="CH.01 // WHAT IT DOES" />
								<StoryChapter
									index={chapters.what.index}
									eyebrow={chapters.what.eyebrow}
									title={chapters.what.title}
									lede={chapters.what.lede}
								>
									<CategoryCards cards={content.categoryCards} />
									<ToolGrid tools={TOOLS} {...content.toolGrid} />
								</StoryChapter>
							</>
						),
					},
					{
						key: "ch2-why",
						node: (
							<>
								<SectionSeparator label="CH.02 // WHY NOT CLOUD" />
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
							</>
						),
					},
					{
						key: "ch3-how",
						node: (
							<>
								<SectionSeparator label="CH.03 // HOW IT WORKS" />
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
							</>
						),
					},
					{
						key: "ch4-graph",
						node: (
							<>
								<SectionSeparator label="CH.04 // WATCH IT THINK" />
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
							</>
						),
					},
					{
						key: "ch5-free",
						node: (
							<>
								<SectionSeparator label="CH.05 // FREE FOREVER" />
								<StoryChapter
									index={chapters.free.index}
									eyebrow={chapters.free.eyebrow}
									title={chapters.free.title}
									lede={chapters.free.lede}
								>
									<FreeForeverBand />
								</StoryChapter>
							</>
						),
					},
					{
						key: "ch6-carry",
						node: (
							<>
								<SectionSeparator label="CH.06 // TAKE IT WITH YOU" />
								<StoryChapter
									index={chapters.carry.index}
									eyebrow={chapters.carry.eyebrow}
									title={chapters.carry.title}
									lede={chapters.carry.lede}
								>
									<ExtensionWaitlistCard />
									<EcosystemRadarCard />
								</StoryChapter>
							</>
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
