import { JsonLd } from "@/components/seo/JsonLd";
import { HomePage } from "@/design/templates";
import { buildHomeJsonLd } from "@/lib/jsonld";
import { HOME } from "./home-content";

export default function Home() {
	return (
		<>
			<JsonLd schema={buildHomeJsonLd()} />
			<HomePage content={HOME} />
		</>
	);
}
