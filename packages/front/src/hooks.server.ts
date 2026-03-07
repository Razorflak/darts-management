import { auth } from "$lib/server/auth"
import { sql } from "$lib/server/db"
import { PlayerSchema } from "$lib/server/schemas/event-schemas.js"
import { svelteKitHandler } from "better-auth/svelte-kit"
import { building } from "$app/environment"
import type { Handle } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import { z } from "zod"

const authHandle: Handle = async ({ event, resolve }) => {
	const sessionData = await auth.api.getSession({
		headers: event.request.headers,
	})
	event.locals.user = sessionData?.user ?? null
	event.locals.session = sessionData?.session ?? null

	if (!event.locals.user) {
		event.locals.player = null
		return resolve(event)
	}

	const userId = event.locals.user.id

	// Look up existing player profile
	const existing = z.array(PlayerSchema).parse(
		await sql<Record<string, unknown>[]>`
			SELECT id, user_id, first_name, last_name, birth_date::text, licence_no
			FROM player
			WHERE user_id = ${userId}
			LIMIT 1
		`
	)

	if (existing.length > 0) {
		event.locals.player = existing[0]
	} else {
		// Auto-create player profile from user's name (best-effort split)
		const parts = (event.locals.user.name ?? '').split(' ')
		const firstName = parts[0] ?? ''
		const lastName = parts.slice(1).join(' ') || firstName

		await sql<Record<string, unknown>[]>`
			INSERT INTO player (user_id, first_name, last_name, birth_date)
			VALUES (${userId}, ${firstName}, ${lastName}, '1900-01-01')
			ON CONFLICT DO NOTHING
		`

		// Re-SELECT after insert (handles race condition: another request may have inserted first)
		const created = z.array(PlayerSchema).parse(
			await sql<Record<string, unknown>[]>`
				SELECT id, user_id, first_name, last_name, birth_date::text, licence_no
				FROM player
				WHERE user_id = ${userId}
				LIMIT 1
			`
		)

		event.locals.player = created[0] ?? null
	}

	return resolve(event)
}

const betterAuthHandle: Handle = ({ event, resolve }) =>
	svelteKitHandler({ event, resolve, auth, building })

export const handle: Handle = sequence(betterAuthHandle, authHandle)
