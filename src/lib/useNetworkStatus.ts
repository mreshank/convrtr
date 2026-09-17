"use client";

import { useEffect, useState } from "react";

export interface NetworkStatus {
	isOnline: boolean;
	hasChecked: boolean;
}

/**
 * Monitors browser network connectivity state.
 * Safe for SSR and static export: defaults to online on the server,
 * then synchronizes with window navigator and network events.
 */
export function useNetworkStatus(): NetworkStatus {
	const [status, setStatus] = useState<NetworkStatus>(() => {
		if (typeof window === "undefined") {
			return { isOnline: true, hasChecked: false };
		}
		return {
			isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
			hasChecked: true,
		};
	});

	useEffect(() => {
		if (typeof window === "undefined") return;

		const updateOnline = () => {
			setStatus({
				isOnline: navigator.onLine,
				hasChecked: true,
			});
		};

		window.addEventListener("online", updateOnline);
		window.addEventListener("offline", updateOnline);

		// Initial sync
		updateOnline();

		return () => {
			window.removeEventListener("online", updateOnline);
			window.removeEventListener("offline", updateOnline);
		};
	}, []);

	return status;
}
