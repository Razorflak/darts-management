import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import { findOrCreateTeam } from "$lib/server/teams.js"
import { createNewPlayer, isNewPlayerAlreadyExist } from "../../players/+server"
import type { RequestHandler } from "./$types"

const MinimalPlayerSchema = z.object({
	first_name: z.string().min(1),
	last_name: z.string().min(1),
	department: z.string(),
})

const ExistingPlayerSchema = z.object({
	id: z.uuid(),
})

const PlayerRegistrationSchema = z.union([
	ExistingPlayerSchema,
	MinimalPlayerSchema,
])

const RegistrationRequestSchema = z.object({
	tournament_id: z.uuid(),
	team: z.array(PlayerRegistrationSchema).min(1).max(2),
})

const isPlayersAlreadyRegistredForTournament = async (
	playerIds: string[],
	tournamentId: string,
) => {
	const duplicates = await sql<Record<string, unknown>[]>`
		SELECT p.id, p.first_name, p.last_name, p.department
		FROM player p
		JOIN team_member tm ON tm.player_id = p.id
		JOIN tournament_registration r ON r.team_id = tm.team_id
		WHERE r.tournament_id = ${tournamentId}
		AND p.id = ANY(${playerIds})
	`
	if (duplicates.length > 0) {
		return duplicates
	}
	return null
}

export const POST: RequestHandler = async ({ request, locals, params }) => {
	//TODO: Mw de gestion des roles et permission
	// const [tRow] = await sql<Record<string, unknown>[]>`
	// 	SELECT t.id, e.entity_id FROM tournament t JOIN event e ON e.id = t.event_id
	// 	WHERE t.id = ${params.tid} AND e.id = ${params.id}
	// `
	// if (!tRow) error(404)
	// const roles = await getUserRoles(locals.user!.id)
	// if (
	// 	!roles.some(
	// 		(r) =>
	// 			r.entityId === (tRow.entity_id as string) &&
	// 			["adminTournoi", "adminClub", "adminComite", "adminLigue", "adminFederal"].includes(
	// 				r.role
	// 			)
	// 	)
	// )
	// 	error(403)

	const body = await request.json()
	const { data, error: parseError } = RegistrationRequestSchema.safeParse(body)

	if (parseError) {
		console.log("JTA", parseError, body)
		return error(400, "Requête invalide: " + parseError.message)
	}
	const { tournament_id, team } = data

	const createPlayersIfNeededPromise = team.map(async (player) => {
		if ("id" in player) {
			return player.id
		} else {
			if (await isNewPlayerAlreadyExist(player)) {
				error(
					409,
					`Le joueur ${player.first_name} ${player.last_name} existe déjà`,
				)
			}
			return await createNewPlayer(player)
		}
	})
	const playerIds = await Promise.all(createPlayersIfNeededPromise)
	const duplucates = await isPlayersAlreadyRegistredForTournament(
		playerIds,
		body.tournament_id,
	)
	if (duplucates) {
		const first = duplucates[0]
		const name = `${first.first_name as string} ${first.last_name as string}`
		error(409, `Le joueur ${name} est déjà inscrit à ce tournoi`)
	}

	const teamId = await findOrCreateTeam(playerIds)

	try {
		await sql`
			INSERT INTO tournament_registration (tournament_id, team_id)
			VALUES (${tournament_id}, ${teamId})
		`
	} catch (err) {
		const pgErr = err as { code?: string }
		if (pgErr.code === "23505") error(409, "Équipe déjà inscrite")
		throw err
	}

	return json({ ok: true })
}
