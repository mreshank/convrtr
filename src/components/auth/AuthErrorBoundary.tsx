"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

/**
 * Resilient Error Boundary for third-party authentication services.
 *
 * Prevents DNS, network, or third-party script failures (such as unreachable
 * Clerk custom domains or unconfigured OAuth origins) from crashing the
 * application or preventing visitors from using the in-browser converter.
 */
export class AuthErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		// Log gracefully in non-production or silence third-party script load failures
		if (process.env.NODE_ENV !== "production") {
			console.warn("AuthErrorBoundary caught an error:", error, errorInfo);
		}
	}

	override render() {
		if (this.state.hasError) {
			return this.props.fallback ?? this.props.children;
		}
		return this.props.children;
	}
}
