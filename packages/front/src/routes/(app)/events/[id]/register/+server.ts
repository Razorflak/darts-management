import { error, json } from "@sveltejs/kit"
import { sql } from "$lib/server/db"
import { z } from "zod"
import { findOrCreateSoloTeam, findOrCreateDoublesTeam } from "$lib/server/teams.js"
import type { RequestHandler } from "./$types"

const RegisterBodySchema = z.object({
	tournament_id: z.string().uuid(),
	partner_player_id: z.string().uuid().optional(),
	new_partner: z
		.object({
			first_name: z.string().min(1),
			last_name: z.string().min(1),
			department: z.string().min(1)
		})
		.optional()
})

const DeleteBodySchema = z.object({ tournament_id: z.string().uuid() })

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user || !locals.player) {
		error(401, "Non authentifié")
	}

	const body = RegisterBodySchema.parse(await request.json())
	const tournamentId = body.tournament_id
	const eventId = params.id
	const selfPlayerId = locals.player.id

	// Verify tournament belongs to this event and event is open for registration
	const [row] = await sql<Record<string, unknown>[]>`
		SELECT t.id FROM tournament t
		JOIN event e ON e.id = t.event_id
		WHERE t.id = ${tournamentId}
		  AND e.id = ${eventId}
		  AND e.status = 'ready'
		  AND t.status IN ('ready', 'check-in')
	`

	if (!row) {
		error(404, "Tournoi introuvable ou fermé")
	}

	let teamId: string

	if (body.partner_player_id) {
		teamId = await findOrCreateDoublesTeam(selfPlayerId, body.partner_player_id)
	} else if (body.new_partner) {
		const [newPlayer] = await sql<Record<string, unknown>[]>`
			INSERT INTO player (first_name, last_name, birth_date, department)
			VALUES (${body.new_partner.first_name}, ${body.new_partner.last_name}, '1900-01-01', ${body.new_partner.department})
			RETURNING id
		`
		const newPlayerId = newPlayer.id as string
		teamId = await findOrCreateDoublesTeam(selfPlayerId, newPlayerId)
	} else {
		teamId = await findOrCreateSoloTeam(selfPlayerId)
	}

	try {
		await sql`
			INSERT INTO tournament_registration (tournament_id, team_id)
			VALUES (${tournamentId}, ${teamId})
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

	const body = DeleteBodySchema.parse(await request.json())
	const tournamentId = body.tournament_id
	const eventId = params.id
	const playerId = locals.player.id

	// Delete registration found via team_member JOIN (handles both solo and doubles)
	await sql`
        DELETE FROM tournament_registration r
        WHERE r.tournament_id = ${tournamentId}
          AND EXISTS (
            SELECT 1 
            FROM team_member tm 
            WHERE tm.team_id = r.team_id 
              AND tm.player_id = ${playerId}
          )
          AND EXISTS (
            SELECT 1
            FROM tournament t
            JOIN event e ON e.id = t.event_id
            WHERE t.id = r.tournament_id
              AND e.status = 'ready'
              AND t.status IN ('ready', 'check-in')
          );
`
	// Idempotent: no error if registration didn't exist
	return json({ ok: true })
}
