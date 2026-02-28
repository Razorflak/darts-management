import { auth } from "$lib/server/auth"
import { svelteKitHandler } from "better-auth/svelte-kit"
import { building } from "$app/environment"
import type { Handle } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"

const authHandle: Handle = async ({ event, resolve }) => {
	const sessionData = await auth.api.getSession({
		headers: event.request.headers,
	})
	event.locals.user = sessionData?.user ?? null
	event.locals.session = sessionData?.session ?? null
	return resolve(event)
}

const betterAuthHandle: Handle = ({ event, resolve }) =>
	svelteKitHandler({ event, resolve, auth, building })

export const handle: Handle = sequence(betterAuthHandle, authHandle)
