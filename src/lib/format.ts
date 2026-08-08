const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatBytes(bytes: number): string {
	if (bytes < 1000) return `${bytes} B`
	let value = bytes
	let unit = 0
	while (value >= 1000 && unit < UNITS.length - 1) {
		value /= 1000
		unit += 1
	}
	const decimals = value < 10 ? 2 : 1
	return `${value.toFixed(decimals)} ${UNITS[unit]}`
}

export function formatDelta(from: number, to: number): string {
	if (from === 0) return '0%'
	const change = Math.round(((to - from) / from) * 100)
	if (change === 0) return '0%'
	return change < 0 ? `−${Math.abs(change)}%` : `+${change}%`
}

export function formatDuration(seconds: number): string {
	if (seconds < 60) {
		const whole = Math.floor(seconds)
		const tenth = Math.floor((seconds - whole) * 10)
		return `00:${String(whole).padStart(2, '0')}.${tenth}`
	}
	const hrs = Math.floor(seconds / 3600)
	const mins = Math.floor((seconds % 3600) / 60)
	const secs = Math.floor(seconds % 60)
	return [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':')
}

export function formatPercent(ratio: number): string {
	return `${Math.round(ratio * 100)}%`
}
