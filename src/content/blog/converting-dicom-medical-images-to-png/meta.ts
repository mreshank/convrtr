import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-dicom-medical-images-to-png",
	title:
		"Converting DICOM Medical Images to PNG: Hounsfield Units and Window Leveling",
	description:
		"Understand DICOM Part 10 radiologic file architecture. Learn how 16-bit CT/MRI depth, Hounsfield units, and Window/Level contrast normalization work, with zero server upload.",
	publishedAt: "2026-09-12",
	tags: ["medical", "imaging", "dicom", "ct-scan", "mri", "privacy"],
	relatedTools: ["image/dcm-to-png", "image/fits-to-png", "image/png-to-webp"],
	bodyFormat: "mdx",
};
