import "@darts-management/logger/tracing"

import { logger } from "@darts-management/logger"
import type { Handle } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import { svelteKitHandler } from "better-auth/svelte-kit"
import { building } from "$app/environment"
import { auth } from "$lib/server/auth"
import { sql } from "$lib/server/db"
import { PlayerSchema } from "$lib/server/schemas/event-schemas.js"

const authHandle: Handle = async ({ event, resolve }) => {
	const start = performance.now()

	const sessionData = await auth.api.getSession({
		headers: event.request.headers,
	})
	event.locals.user = sessionData?.user ?? null
	event.locals.session = sessionData?.session ?? null

	if (!event.locals.user) {
		event.locals.player = null
		const response = await resolve(event)
		logger.info(
			{
				method: event.request.method,
				path: event.url.pathname,
				status: response.status,
				duration_ms: Math.round(performance.now() - start),
			},
			"HTTP request",
		)
		return response
	}

	const userId = event.locals.user.id

	// Look up existing player profile — lookup only, no auto-create
	const rows = await sql<Record<string, unknown>[]>`
		SELECT id, user_id, first_name, last_name, birth_date::text, licence_no, department
		FROM player
		WHERE user_id = ${userId}
		LIMIT 1
	`
	event.locals.player = rows.length > 0 ? PlayerSchema.parse(rows[0]) : null

	const response = await resolve(event)
	logger.info(
		{
			method: event.request.method,
			path: event.url.pathname,
			status: response.status,
			duration_ms: Math.round(performance.now() - start),
			userId,
		},
		"HTTP request",
	)
	return response
}

const betterAuthHandle: Handle = ({ event, resolve }) =>
	svelteKitHandler({ event, resolve, auth, building })

export const handle: Handle = sequence(betterAuthHandle, authHandle)
