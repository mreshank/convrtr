import type { Metadata } from "next";
import { getLicenceReport, type LicenceEntry } from "@/content/legal/licences";
import { licences } from "@/content/pages/licences";
import { LegalPage } from "@/design/templates";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Licences — convrtr";
	const description =
		"Third-party licences for the conversion engines convrtr ships, derived from package.json and the vendored WebAssembly builds.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/legal/licences` },
		openGraph: { title, description, url: `${SITE}/legal/licences` },
	};
}

/** One dependency's row: its version, licence, and — for a WASM engine — what it wraps. */
function LicenceRow({ entry }: { entry: LicenceEntry }) {
	return (
		<li className="flex flex-col gap-1">
			<p>
				<strong>{entry.dependency}</strong> {entry.version} — {entry.license}
				{entry.library ? (
					<>
						{" "}
						— wraps{" "}
						{entry.upstream ? (
							<a href={entry.upstream}>{entry.library}</a>
						) : (
							entry.library
						)}
					</>
				) : null}
			</p>
			{entry.wasmFiles.length > 0 ? (
				<p className="mono">{entry.wasmFiles.join(", ")}</p>
			) : null}
		</li>
	);
}

export default function LicencesPage() {
	const { entries, incomplete } = getLicenceReport();

	return (
		<LegalPage title={licences.title} revised={licences.updated}>
			<div className="flex flex-col gap-6">
				<p>
					{licences.introBefore} <code>package.json</code> {licences.introAfter}
				</p>
				{incomplete.length > 0 ? (
					<div data-incomplete className="flex flex-col gap-2">
						<h2 className="meta">Incomplete</h2>
						<ul className="flex flex-col gap-1">
							{incomplete.map((line) => (
								<li key={line}>{line}</li>
							))}
						</ul>
					</div>
				) : null}
				<ul className="flex flex-col gap-4">
					{entries.map((entry) => (
						<LicenceRow key={entry.dependency} entry={entry} />
					))}
				</ul>
			</div>
		</LegalPage>
	);
}
