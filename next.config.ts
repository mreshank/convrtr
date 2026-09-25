import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "export",
	images: { unoptimized: true },
	reactStrictMode: true,
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
