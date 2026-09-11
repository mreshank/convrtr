import type { Metadata } from "next";
import { MasterConverterClient } from "@/components/instrument/MasterConverterClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { ConverterPage } from "@/design/templates";
import { buildConvertStudioJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Master File Converter — convrtr";
	const description =
		"Universal in-browser file converter. Convert images, audio, video, and documents with selective batch customization. Nothing is uploaded.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/convert` },
		openGraph: {
			title,
			description,
			url: `${SITE}/convert`,
		},
	};
}

export default function MasterConvertPage() {
	return (
		<>
			<JsonLd schema={buildConvertStudioJsonLd(`${SITE}/convert`)} />
			<ConverterPage
				eyebrow="Universal · Multi-File Studio"
				title="Master File Converter"
				lede="Convert multiple files between formats entirely in your browser. Customize your selection on the go, choose target formats individually or in bulk, and download individually or as a ZIP."
			>
				<MasterConverterClient />
			</ConverterPage>
		</>
	);
}
