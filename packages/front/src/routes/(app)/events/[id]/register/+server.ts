import { error, json } from "@sveltejs/kit"
import { sql } from "$lib/server/db"
import { z } from "zod"
import type { RequestHandler } from "./$types"

const BodySchema = z.object({ tournament_id: z.string().uuid() })

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user || !locals.player) {
		error(401, "Non authentifié")
	}

	const body = BodySchema.parse(await request.json())
	const tournamentId = body.tournament_id
	const eventId = params.id
	const playerId = locals.player.id

	// Verify tournament belongs to this event and event is open for registration
	const [row] = await sql<Record<string, unknown>[]>`
		SELECT t.id FROM tournament t
		JOIN event e ON e.id = t.event_id
		WHERE t.id = ${tournamentId}
		  AND e.id = ${eventId}
		  AND e.status = 'ready'
	`

	if (!row) {
		error(404, "Tournoi introuvable ou fermé")
	}

	try {
		await sql`
			INSERT INTO tournament_registration (tournament_id, player_id)
			VALUES (${tournamentId}, ${playerId})
		`
	} catch (err) {
		// Unique constraint violation — already registered
		if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
			error(409, "Déjà inscrit")
		}
		throw err
	}

	return json({ ok: true })
}

export const DELETE: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user || !locals.player) {
		error(401, "Non authentifié")
	}

	const body = BodySchema.parse(await request.json())
	const tournamentId = body.tournament_id
	const eventId = params.id
	const playerId = locals.player.id

	// Delete only if event is still 'ready' (can't unregister after start)
	await sql`
		DELETE FROM tournament_registration r
		USING tournament t
		JOIN event e ON e.id = t.event_id
		WHERE r.tournament_id = ${tournamentId}
		  AND r.player_id = ${playerId}
		  AND t.id = ${tournamentId}
		  AND e.status = 'ready'
	`

	// Idempotent: no error if registration didn't exist
	return json({ ok: true })
}
