import type { Metadata } from "next";
import { MasterConverterClient } from "@/components/instrument/MasterConverterClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { ConverterPage } from "@/design/templates";
import { buildConvertStudioJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Master File Converter — convrtr";
	const description =
		"Convert single files or whole batches in your browser — images, audio, video, documents and data. Per-file or bulk target formats, ZIP download. Nothing is uploaded.";
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
				breadcrumbs={[
					{ name: "Home", href: "/" },
					{ name: "Master File Converter" },
				]}
				eyebrow="Universal · Multi-File Studio"
				title="Master File Converter"
				lede="Drop in one file or a hundred. Pick a target format per file or for the whole batch, convert everything on your own device, then download files one by one or as a single ZIP. Nothing is uploaded, ever."
			>
				<MasterConverterClient />
			</ConverterPage>
		</>
	);
}
