import type { Metadata } from "next";
import { getLicenceReport, type LicenceEntry } from "@/content/legal/licences";
import { LegalPage } from "@/design/templates";
import { SITE } from "@/lib/site";

const REVISED = "9 September 2026";

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
		<LegalPage title="Licences" revised={REVISED}>
			<div className="flex flex-col gap-6">
				<p>
					convrtr runs every conversion locally using the open-source engines
					below. This list is generated from each engine's own installed{" "}
					<code>package.json</code> — version and licence read live, not typed
					by hand — and, for the engines that ship WebAssembly, a scan of the
					files each one actually installs. A version bump cannot make this page
					stale.
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
