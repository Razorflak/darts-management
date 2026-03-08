import { error } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import { getUserRoles } from "$lib/server/authz"
import type { PageServerLoad } from "./$types"
import { AdminTournamentSchema, RosterEntrySchema } from "$lib/server/schemas/event-schemas.js"

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) error(401, "Non authentifié")

	const tournamentRows = await sql<Record<string, unknown>[]>`
		SELECT t.id, t.name, t.category, t.check_in_required,
		       e.id AS event_id, e.name AS event_name, t.status, e.entity_id
		FROM tournament t JOIN event e ON e.id = t.event_id
		WHERE t.id = ${params.id}
	`
	if (tournamentRows.length === 0) error(404, "Tournoi introuvable")

	const entityId = tournamentRows[0].entity_id as string
	const roles = await getUserRoles(locals.user.id)
	const hasAccess = roles.some(
		(r) =>
			r.entityId === entityId &&
			["adminTournoi", "adminClub", "adminComite", "adminLigue", "adminFederal"].includes(
				r.role
			)
	)
	if (!hasAccess) error(403, "Accès refusé")

	const tournament = AdminTournamentSchema.parse(tournamentRows[0])

	const rosterRows = await sql<Record<string, unknown>[]>`
		SELECT
			r.id AS registration_id,
			r.team_id,
			r.checked_in,
			r.registered_at,
			json_agg(json_build_object(
				'player_id', p.id,
				'first_name', p.first_name,
				'last_name', p.last_name,
				'department', p.department
			) ORDER BY p.last_name, p.first_name) AS members
		FROM tournament_registration r
		JOIN team_member tm ON tm.team_id = r.team_id
		JOIN player p ON p.id = tm.player_id
		WHERE r.tournament_id = ${params.id}
		GROUP BY r.id, r.team_id, r.checked_in, r.registered_at
		ORDER BY MIN(p.last_name), MIN(p.first_name)
	`
	const roster = z.array(RosterEntrySchema).parse(rosterRows)

	return { tournament, roster }
}
