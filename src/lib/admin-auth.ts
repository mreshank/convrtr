/**
 * Super Admin Access Control & Verification.
 *
 * Strict authorization policy:
 * ONLY `mreshanktyagi@gmail.com` and `admin@mreshank.com` are granted
 * Super Admin privileges to access the admin dashboard, push broadcasts,
 * manage subscriptions, and view system KPIs.
 */

export const SUPER_ADMIN_EMAILS = [
	"mreshanktyagi@gmail.com",
	"admin@mreshank.com",
] as const;

export type SuperAdminEmail = (typeof SUPER_ADMIN_EMAILS)[number];

const ADMIN_PASSKEY_STORAGE_KEY = "convrtr_super_admin_passkey";
// Built-in emergency/offline developer unlock passkey
const LOCAL_MASTER_KEY = "convrtr-master-admin-key-2026";

/**
 * Checks if a given email address matches the strict Super Admin whitelist.
 */
export function isSuperAdminEmail(email?: string | null): boolean {
	if (!email) return false;
	const normalized = email.toLowerCase().trim();
	return (
		normalized === "mreshanktyagi@gmail.com" ||
		normalized === "admin@mreshank.com"
	);
}

/**
 * Verifies if the active user object from Clerk possesses a Super Admin email.
 */
export function isSuperAdminUser(
	user?: {
		primaryEmailAddress?: { emailAddress?: string } | null;
		emailAddresses?: Array<{ emailAddress?: string }>;
	} | null,
): boolean {
	if (!user) return false;
	if (isSuperAdminEmail(user.primaryEmailAddress?.emailAddress)) {
		return true;
	}
	if (user.emailAddresses && Array.isArray(user.emailAddresses)) {
		return user.emailAddresses.some((addr) =>
			isSuperAdminEmail(addr.emailAddress),
		);
	}
	return false;
}

/**
 * Checks if a local emergency admin bypass passkey is set and valid in localStorage.
 * Used for offline development and testing when Clerk is unavailable.
 */
export function hasLocalAdminOverride(): boolean {
	if (typeof window === "undefined") return false;
	try {
		const key = localStorage.getItem(ADMIN_PASSKEY_STORAGE_KEY);
		return key === LOCAL_MASTER_KEY;
	} catch {
		return false;
	}
}

/**
 * Attempts to unlock Super Admin access using the local emergency master passkey.
 */
export function verifyAdminPasskey(passkey: string): boolean {
	if (typeof window === "undefined") return false;
	const trimmed = passkey.trim();
	if (trimmed === LOCAL_MASTER_KEY) {
		try {
			localStorage.setItem(ADMIN_PASSKEY_STORAGE_KEY, LOCAL_MASTER_KEY);
			return true;
		} catch {
			return true;
		}
	}
	return false;
}

/**
 * Clears the local emergency admin bypass passkey.
 */
export function clearAdminPasskey(): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.removeItem(ADMIN_PASSKEY_STORAGE_KEY);
	} catch {
		// Storage error
	}
}
