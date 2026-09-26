import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const STUB = "./stubs/node-builtin-empty.js";

const nextConfig: NextConfig = {
	output: "export",
	images: { unoptimized: true },
	reactStrictMode: true,
	// Mirrors the webpack `resolve.fallback: false` below for Turbopack,
	// which powers `next dev`. `7z-wasm` references Node built-ins only under
	// its ENVIRONMENT_IS_NODE guard (never executed in browsers), but the
	// specifiers must still resolve at build time. The `browser` condition
	// keeps real built-ins for server/Node bundles.
	turbopack: {
		resolveAlias: {
			module: { browser: STUB },
			fs: { browser: STUB },
			path: { browser: STUB },
			url: { browser: STUB },
			crypto: { browser: STUB },
		},
	},
	webpack: (config, { isServer, webpack }) => {
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				module: false,
				path: false,
				crypto: false,
			};
			config.plugins.push(
				new webpack.NormalModuleReplacementPlugin(
					/^node:/,
					(resource: { request: string }) => {
						resource.request = resource.request.replace(/^node:/, "");
					},
				),
			);
		}
		return config;
	},
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
