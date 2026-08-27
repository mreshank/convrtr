import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "export",
	images: { unoptimized: true },
	reactStrictMode: true,
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
