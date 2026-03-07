import { error } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import { RosterEntrySchema, CategorySchema } from "$lib/server/schemas/event-schemas.js"
import type { PageServerLoad } from "./$types"

const TournamentDetailSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	category: CategorySchema,
	check_in_required: z.boolean(),
	event_id: z.uuid(),
	event_name: z.string(),
	status: z.enum(["draft", "ready", "started", "finished"])
})
type TournamentDetail = z.infer<typeof TournamentDetailSchema>

export const load: PageServerLoad = async ({ params }) => {
	const tournamentRows = await sql<Record<string, unknown>[]>`
		SELECT t.id, t.name, t.category, t.check_in_required,
		       e.id AS event_id, e.name AS event_name, e.status
		FROM tournament t
		JOIN event e ON e.id = t.event_id
		WHERE t.id = ${params.id}
	`

	if (tournamentRows.length === 0) error(404, "Tournoi introuvable")

	const tournament: TournamentDetail = TournamentDetailSchema.parse(tournamentRows[0])

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
