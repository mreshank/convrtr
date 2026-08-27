import type { ImageTransform } from "../types";
import { resizeTransform } from "./resize";

export const IMAGE_TRANSFORMS = new Map<string, ImageTransform>([
	[resizeTransform.id, resizeTransform],
]);

export function getTransform(id: string): ImageTransform | undefined {
	return IMAGE_TRANSFORMS.get(id);
}
