import { error, json } from "@sveltejs/kit"
import type postgres from "postgres"
import { sql } from "$lib/server/db"
import { z } from "zod"
import type { RequestHandler } from "./$types"

// postgres.js TransactionSql uses Omit<Sql, ...> which strips call signatures.
// At runtime it IS callable — this cast restores the type for template literal queries.
type TxSql = postgres.Sql

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
		// Create a solo team for this player, then register the team
		await sql.begin(async (rawTx) => {
			const tx = rawTx as unknown as TxSql
			const [team] = await tx<Record<string, unknown>[]>`
				INSERT INTO team DEFAULT VALUES RETURNING id
			`
			const teamId = team.id as string
			await tx`
				INSERT INTO team_member (team_id, player_id)
				VALUES (${teamId}, ${playerId})
			`
			await tx`
				INSERT INTO tournament_registration (tournament_id, team_id)
				VALUES (${tournamentId}, ${teamId})
			`
		})
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
	// Find the team that contains only this player and is registered in this tournament
	await sql`
		DELETE FROM tournament_registration
		WHERE tournament_id = ${tournamentId}
		  AND team_id IN (
		    SELECT tm.team_id
		    FROM team_member tm
		    WHERE tm.player_id = ${playerId}
		      AND NOT EXISTS (
		        SELECT 1 FROM team_member tm2
		        WHERE tm2.team_id = tm.team_id AND tm2.player_id != ${playerId}
		      )
		  )
		  AND EXISTS (
		    SELECT 1 FROM tournament t
		    JOIN event e ON e.id = t.event_id
		    WHERE t.id = ${tournamentId}
		      AND e.id = ${eventId}
		      AND e.status = 'ready'
		  )
	`

	// Idempotent: no error if registration didn't exist
	return json({ ok: true })
}
