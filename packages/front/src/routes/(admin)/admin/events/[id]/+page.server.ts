import { error } from "@sveltejs/kit"
import { z } from "zod"
import { getUserRoles } from "$lib/server/authz"
import { sql } from "$lib/server/db"
import { AdminEventDetailSchema, AdminTournamentSchema } from "$lib/server/schemas/event-schemas.js"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals, params }) => {
	// (admin) layout already checks auth + admin role globally
	// Still verify access to this specific event's entity
	const eventRows = await sql<Record<string, unknown>[]>`
		SELECT e.id, e.name, e.status,
		       e.starts_at, e.ends_at, e.location,
		       e.organizer_id,
		       en.id AS entity_id, en.name AS entity_name
		FROM event e
		JOIN entity en ON en.id = e.entity_id
		WHERE e.id = ${params.id}
	`
	if (eventRows.length === 0) error(404, "Événement introuvable")
	console.log("JTA", "eventRows", eventRows)

	const event = AdminEventDetailSchema.parse(eventRows[0])

	// Check access: must be organizer or have an admin role on the entity
	const roles = await getUserRoles(locals.user!.id)
	const hasAccess = roles.some(
		(r) =>
			r.entityId === event.entity_id &&
			[
				"adminTournoi",
				"adminClub",
				"adminComite",
				"adminLigue",
				"adminFederal",
				"organisateur"
			].includes(r.role)
	)
	const isOrganizer = event.organizer_id === locals.user!.id
	if (!hasAccess && !isOrganizer) error(403, "Accès refusé")

	const tournamentRows = await sql<Record<string, unknown>[]>`
		SELECT t.id, t.name, t.category, t.check_in_required,
		       e.id AS event_id, e.name AS event_name, t.status, e.entity_id,
		       COUNT(r.id)::int AS registration_count
		FROM tournament t
		JOIN event e ON e.id = t.event_id
		LEFT JOIN tournament_registration r ON r.tournament_id = t.id
		WHERE t.event_id = ${params.id}
		GROUP BY t.id, e.id
		ORDER BY t.name
	`

	const TournamentListSchema = AdminTournamentSchema.extend({
		registration_count: z.number().int()
	})
	const tournaments = z.array(TournamentListSchema).parse(tournamentRows)

	return { event, tournaments }
}
