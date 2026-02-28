// SvelteKit virtual modules -- resolved at SvelteKit build time.
// This declaration allows packages/db to import from $app/server
// without TypeScript errors. The actual implementation is provided
// by the SvelteKit Vite plugin when building packages/front.

declare module "$app/server" {
	export function getRequestEvent(): import("@sveltejs/kit").RequestEvent
}
