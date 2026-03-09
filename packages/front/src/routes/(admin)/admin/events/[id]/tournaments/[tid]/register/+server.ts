import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import { getUserRoles } from "$lib/server/authz"
import { sql } from "$lib/server/db"
import { findOrCreateDoublesTeam, findOrCreateSoloTeam } from "$lib/server/teams.js"
import type { RequestHandler } from "./$types"

const PlayerSlotSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("existing"), id: z.string().uuid() }),
	z.object({
		type: z.literal("new"),
		first_name: z.string().min(1),
		last_name: z.string().min(1),
		department: z.string()
	})
])

const AdminRegisterSchema = z.discriminatedUnion("mode", [
	z.object({ mode: z.literal("existing"), player_id: z.string().uuid() }),
	z.object({
		mode: z.literal("new"),
		first_name: z.string().min(1),
		last_name: z.string().min(1),
		department: z.string()
	}),
	z.object({
		mode: z.literal("doubles"),
		player1: PlayerSlotSchema,
		player2: PlayerSlotSchema
	})
])

async function resolvePlayerId(slot: z.infer<typeof PlayerSlotSchema>): Promise<string> {
	if (slot.type === "existing") return slot.id

	const [newPlayer] = await sql<Record<string, unknown>[]>`
		INSERT INTO player (first_name, last_name, department)
		VALUES (
			${slot.first_name},
			${slot.last_name},
			${slot.department}
		)
		RETURNING id
	`
	return newPlayer.id as string
}

async function checkNoDuplicatePlayers(playerIds: string[], tournamentId: string): Promise<void> {
	const duplicates = await sql<Record<string, unknown>[]>`
		SELECT p.id, p.first_name, p.last_name
		FROM player p
		JOIN team_member tm ON tm.player_id = p.id
		JOIN tournament_registration r ON r.team_id = tm.team_id
		WHERE r.tournament_id = ${tournamentId}
		AND p.id = ANY(${playerIds})
	`
	if (duplicates.length > 0) {
		const first = duplicates[0]
		const name = `${first.first_name as string} ${first.last_name as string}`
		error(409, `Ce joueur est déjà inscrit à ce tournoi : ${name}`)
	}
}

export const POST: RequestHandler = async ({ request, locals, params }) => {
	const [tRow] = await sql<Record<string, unknown>[]>`
		SELECT t.id, e.entity_id FROM tournament t JOIN event e ON e.id = t.event_id
		WHERE t.id = ${params.tid} AND e.id = ${params.id}
	`
	if (!tRow) error(404)
	const roles = await getUserRoles(locals.user!.id)
	if (
		!roles.some(
			(r) =>
				r.entityId === (tRow.entity_id as string) &&
				["adminTournoi", "adminClub", "adminComite", "adminLigue", "adminFederal"].includes(
					r.role
				)
		)
	)
		error(403)

	const body = AdminRegisterSchema.parse(await request.json())
	let teamId: string

	if (body.mode === "existing") {
		const playerId = body.player_id
		await checkNoDuplicatePlayers([playerId], params.tid)
		teamId = await findOrCreateSoloTeam(playerId)
	} else if (body.mode === "new") {
		const [newPlayer] = await sql<Record<string, unknown>[]>`
			INSERT INTO player (first_name, last_name, department)
			VALUES (
				${body.first_name},
				${body.last_name},
				${body.department}
			)
			RETURNING id
		`
		await checkNoDuplicatePlayers([newPlayer.id as string], params.tid)
		teamId = await findOrCreateSoloTeam(newPlayer.id as string)
	} else {
		// mode === "doubles"
		const player1Id = await resolvePlayerId(body.player1)
		const player2Id = await resolvePlayerId(body.player2)
		if (player1Id === player2Id) {
			error(400, "Un joueur ne peut pas être inscrit deux fois dans la même équipe")
		}
		await checkNoDuplicatePlayers([player1Id, player2Id], params.tid)
		teamId = await findOrCreateDoublesTeam(player1Id, player2Id)
	}

	try {
		await sql`
			INSERT INTO tournament_registration (tournament_id, team_id)
			VALUES (${params.tid}, ${teamId})
		`
	} catch (err) {
		const pgErr = err as { code?: string }
		if (pgErr.code === "23505") error(409, "Équipe déjà inscrite")
		throw err
	}

	return json({ ok: true })
}
