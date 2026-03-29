import Sortable from "sortablejs"

/**
 * Svelte action that wraps SortableJS.
 * Usage: <ul use:sortable={{ group: 'phases', animation: 150, onEnd }}>
 */
export function sortable(node: HTMLElement, options: Sortable.Options) {
	const instance = Sortable.create(node, options)
	return {
		update(opts: Sortable.Options) {
			Object.assign(instance.options, opts)
		},
		destroy() {
			instance.destroy()
		},
	}
}
