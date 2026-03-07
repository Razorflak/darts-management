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
		       e.id AS event_id, e.name AS event_name, e.status, e.entity_id
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
		SELECT r.id AS registration_id, r.player_id, p.first_name, p.last_name,
		       p.licence_no, r.checked_in, r.registered_at
		FROM tournament_registration r
		JOIN player p ON p.id = r.player_id
		WHERE r.tournament_id = ${params.id}
		ORDER BY p.last_name, p.first_name
	`
	const roster = z.array(RosterEntrySchema).parse(rosterRows)

	return { tournament, roster }
}
