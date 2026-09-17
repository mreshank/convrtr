export type DiagnosticStatus = "PASS" | "WARN" | "FAIL";

export interface DiagnosticItem {
	id: string;
	name: string;
	status: DiagnosticStatus;
	spec: string;
	description: string;
}

export interface EnvironmentInfo {
	userAgent: string;
	browser: string;
	os: string;
	viewport: string;
	devicePixelRatio: number;
	hardwareConcurrency: number;
	deviceMemoryGb: number | null;
	isOnline: boolean;
	timestamp: string;
}

export interface DiagnosticReport {
	overallReadiness: "OPTIMAL" | "LIMITED" | "DEGRADED";
	items: DiagnosticItem[];
	environment: EnvironmentInfo;
}

/**
 * Validates WebAssembly SIMD byte support in the current JS engine.
 */
export function checkWasmSimd(): boolean {
	if (
		typeof WebAssembly === "undefined" ||
		typeof WebAssembly.validate !== "function"
	) {
		return false;
	}
	try {
		// Valid minimal WASM module containing an i32x4.splat opcode (0xfd, 0x0f)
		const simdBytes = new Uint8Array([
			0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10,
			1, 8, 0, 65, 0, 253, 15, 26, 11,
		]);
		return WebAssembly.validate(simdBytes);
	} catch {
		return false;
	}
}

/**
 * Parses user agent string to identify primary browser family.
 */
export function detectBrowser(ua: string): string {
	if (/Firefox\/([0-9.]+)/.test(ua)) return "Firefox";
	if (/Edg\/([0-9.]+)/.test(ua)) return "Edge";
	if (/Chrome\/([0-9.]+)/.test(ua)) return "Chromium / Chrome";
	if (/Safari\/([0-9.]+)/.test(ua) && !/Chrome/.test(ua)) return "Safari";
	return "Standard Web Browser";
}

/**
 * Parses user agent string to identify primary operating system.
 */
export function detectOS(ua: string): string {
	if (/Macintosh|Mac OS X/.test(ua)) return "macOS";
	if (/Windows NT/.test(ua)) return "Windows";
	if (/Linux/.test(ua)) return "Linux";
	if (/Android/.test(ua)) return "Android";
	if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
	return "Unknown OS";
}

/**
 * Runs full browser capability and engine diagnostics synchronously on the client.
 */
export function runSystemDiagnostics(): DiagnosticReport {
	const hasWindow = typeof window !== "undefined";
	const hasNav = typeof navigator !== "undefined";

	const ua = hasNav ? navigator.userAgent : "";
	const isOnline = hasNav ? navigator.onLine : true;
	const hardwareConcurrency = hasNav ? navigator.hardwareConcurrency || 1 : 1;
	const deviceMemoryGb =
		hasNav && "deviceMemory" in navigator
			? (navigator as unknown as { deviceMemory: number }).deviceMemory
			: null;

	const viewport = hasWindow
		? `${window.innerWidth}x${window.innerHeight} (Screen: ${window.screen.width}x${window.screen.height})`
		: "N/A";
	const devicePixelRatio = hasWindow ? window.devicePixelRatio || 1 : 1;

	// 1. WebAssembly Core
	const wasmCore =
		typeof WebAssembly === "object" &&
		typeof WebAssembly.instantiate === "function";

	// 2. WebAssembly SIMD
	const wasmSimd = checkWasmSimd();

	// 3. SharedArrayBuffer & Cross-Origin Isolation
	const hasSab = typeof SharedArrayBuffer !== "undefined";
	const isIsolated = hasWindow && Boolean(window.crossOriginIsolated);
	const multiThreading = hasSab && isIsolated;

	// 4. WebCodecs
	const hasWebCodecs =
		hasWindow && "VideoEncoder" in window && "VideoDecoder" in window;

	// 5. Web Workers
	const hasWorkers = typeof Worker !== "undefined";

	// 6. OPFS (Origin Private File System)
	const hasOpfs =
		hasNav &&
		"storage" in navigator &&
		typeof navigator.storage?.getDirectory === "function";

	// Build diagnostic checklist
	const items: DiagnosticItem[] = [
		{
			id: "wasm_core",
			name: "WASM CORE EXECUTION",
			status: wasmCore ? "PASS" : "FAIL",
			spec: wasmCore ? "ENABLED // JIT INSTANTIATION ACTIVE" : "UNAVAILABLE",
			description:
				"Required for all 147 offline conversion engines to execute in-memory.",
		},
		{
			id: "wasm_simd",
			name: "WASM SIMD 128-BIT VECTORIZATION",
			status: wasmSimd ? "PASS" : "WARN",
			spec: wasmSimd ? "ACCELERATED // 128-BIT ACTIVE" : "SCALAR FALLBACK",
			description:
				"Accelerates raster resizing, AVIF, JXL, and audio matrix math up to 4x.",
		},
		{
			id: "multithreading",
			name: "CROSS-ORIGIN ISOLATION & SHARED BUFFER",
			status: multiThreading ? "PASS" : "WARN",
			spec: multiThreading
				? "ISOLATED // SHARED MEMORY ACTIVE"
				: isIsolated
					? "ISOLATED // NO SHARED BUFFER"
					: "SINGLE-THREADED FALLBACK",
			description:
				"Powers multi-core parallel codec processing across heavy video and audio tasks.",
		},
		{
			id: "webcodecs",
			name: "HARDWARE ACCELERATED WEBCODECS",
			status: hasWebCodecs ? "PASS" : "WARN",
			spec: hasWebCodecs
				? "SUPPORTED // HARDWARE GPU LINK"
				: "WASM DECODER FALLBACK",
			description:
				"Direct GPU stream decoding and encoding for MP4, WebM, and MP3 pipelines.",
		},
		{
			id: "workers",
			name: "BACKGROUND WEB WORKERS POOL",
			status: hasWorkers ? "PASS" : "FAIL",
			spec: hasWorkers
				? `OPERATIONAL // ${hardwareConcurrency} LOGICAL CORES`
				: "WORKERS BLOCKED",
			description:
				"Keeps UI 100% fluid and responsive while heavy conversions crunch in background threads.",
		},
		{
			id: "opfs",
			name: "ORIGIN PRIVATE FILE SYSTEM (OPFS)",
			status: hasOpfs ? "PASS" : "WARN",
			spec: hasOpfs
				? "AVAILABLE // HIGH-SPEED PERSISTENCE"
				: "IN-MEMORY BUFFER FALLBACK",
			description:
				"Enables zero-latency streaming of multi-gigabyte files directly off disk.",
		},
		{
			id: "memory",
			name: "DEVICE MEMORY HEADROOM",
			status:
				deviceMemoryGb && deviceMemoryGb >= 4
					? "PASS"
					: deviceMemoryGb
						? "WARN"
						: "PASS",
			spec: deviceMemoryGb
				? `${deviceMemoryGb} GB ESTIMATED RAM`
				: "STANDARD (UNRESTRICTED)",
			description:
				"Determines the maximum batch size and video resolution safe for local conversion.",
		},
		{
			id: "network",
			name: "NETWORK CONNECTIVITY",
			status: isOnline ? "PASS" : "WARN",
			spec: isOnline
				? "ONLINE // FULL TRANSMISSION DISPATCH"
				: "OFFLINE // LOCAL CACHED PWA",
			description:
				"Conversions always operate 100% offline; forms and updates activate when connected.",
		},
	];

	// Compute overall readiness
	let overallReadiness: DiagnosticReport["overallReadiness"] = "OPTIMAL";
	const hasFail = items.some((i) => i.status === "FAIL");
	const warnCount = items.filter((i) => i.status === "WARN").length;

	if (hasFail) {
		overallReadiness = "DEGRADED";
	} else if (warnCount > 2) {
		overallReadiness = "LIMITED";
	}

	return {
		overallReadiness,
		items,
		environment: {
			userAgent: ua,
			browser: detectBrowser(ua),
			os: detectOS(ua),
			viewport,
			devicePixelRatio,
			hardwareConcurrency,
			deviceMemoryGb,
			isOnline,
			timestamp: new Date().toISOString(),
		},
	};
}

/**
 * Converts a diagnostic report into standard clean Markdown for support tickets and issue filing.
 */
export function formatDiagnosticMarkdown(report: DiagnosticReport): string {
	const { overallReadiness, items, environment } = report;

	const lines: string[] = [
		"### SYSTEM DIAGNOSTIC AUDIT",
		`Overall Status: ${overallReadiness}`,
		`Timestamp: ${environment.timestamp}`,
		"",
		"#### ENVIRONMENT",
		`- Operating System: ${environment.os}`,
		`- Browser: ${environment.browser}`,
		`- User Agent: ${environment.userAgent}`,
		`- Viewport: ${environment.viewport}`,
		`- Logical CPU Cores: ${environment.hardwareConcurrency}`,
		`- Device Memory: ${environment.deviceMemoryGb ? `${environment.deviceMemoryGb} GB` : "Unknown / Unrestricted"}`,
		`- Network Status: ${environment.isOnline ? "ONLINE" : "OFFLINE"}`,
		"",
		"#### CORE CAPABILITIES",
	];

	for (const item of items) {
		lines.push(`- [${item.status}] **${item.name}**: ${item.spec}`);
	}

	lines.push("");
	lines.push("*Generated automatically by convrtr client diagnostic engine*");

	return lines.join("\n");
}
