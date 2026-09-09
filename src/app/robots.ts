import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Static export note: same reason `manifest.ts` states one -- this compiles
// to a Route Handler with no request-time input, and `output: "export"`
// refuses to export one unless it is explicitly marked static.
export const dynamic = "force-static";

// The product has no accounts and no private routes -- there is nothing
// here to disallow. Every route a crawler can reach is one `sitemap.ts`
// already lists, derived from the same registries.
export default function robots(): MetadataRoute.Robots {
	return {
		rules: { userAgent: "*", allow: "/" },
		sitemap: `${SITE}/sitemap.xml`,
	};
}
