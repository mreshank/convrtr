import type { ParamValue } from "@/core/quality";

export interface Engine {
	id: string;
	probe(): Promise<boolean>;
	run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number) => void,
	): Promise<ArrayBuffer>;
}
