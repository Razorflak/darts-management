let resolve: ((value: boolean) => void) | null = null

export const confirmState = $state({ open: false, message: "" })

export function confirm(message: string): Promise<boolean> {
	confirmState.open = true
	confirmState.message = message
	return new Promise((res) => {
		resolve = res
	})
}

export function settle(value: boolean) {
	confirmState.open = false
	resolve?.(value)
	resolve = null
}
