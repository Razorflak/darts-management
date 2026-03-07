import { sql } from "$lib/server/db"
import { TournamentWithRegistrationSchema } from "$lib/server/schemas/event-schemas.js"
import type { TournamentWithRegistration } from "$lib/server/schemas/event-schemas.js"
import type { PageServerLoad } from "./$types"
import { z } from "zod"

const OpenEventRowSchema = z.object({
	event_id: z.uuid(),
	event_name: z.string(),
	starts_at: z.coerce.date(),
	ends_at: z.coerce.date(),
	location: z.string(),
	entity_name: z.string(),
	tournament_id: z.uuid(),
	tournament_name: z.string(),
	category: TournamentWithRegistrationSchema.shape.category,
	check_in_required: z.boolean(),
	registration_count: z.number().int(),
	is_registered: z.boolean()
})
type OpenEventRow = z.infer<typeof OpenEventRowSchema>

type OpenEvent = {
	event: {
		id: string
		name: string
		starts_at: Date
		ends_at: Date
		location: string
		entity_name: string
	}
	tournaments: TournamentWithRegistration[]
}

export const load: PageServerLoad = async ({ locals }) => {
	const currentPlayerId = locals.player?.id ?? null

	const rawRows = await sql<Record<string, unknown>[]>`
		SELECT
			e.id AS event_id, e.name AS event_name,
			e.starts_at, e.ends_at,
			e.location, ent.name AS entity_name,
			t.id AS tournament_id, t.name AS tournament_name,
			t.category, t.check_in_required,
			COUNT(r.id)::int AS registration_count,
			(r_me.id IS NOT NULL) AS is_registered
		FROM event e
		JOIN entity ent ON ent.id = e.entity_id
		JOIN tournament t ON t.event_id = e.id
		LEFT JOIN tournament_registration r ON r.tournament_id = t.id
		LEFT JOIN tournament_registration r_me
			ON r_me.tournament_id = t.id AND r_me.player_id = ${currentPlayerId}
		WHERE e.status = 'ready'
		GROUP BY e.id, ent.name, t.id, r_me.id
		ORDER BY e.starts_at, e.name, t.name
	`

	const rows: OpenEventRow[] = z.array(OpenEventRowSchema).parse(rawRows)

	// Group flat rows by event_id
	const eventMap = new Map<string, OpenEvent>()
	for (const row of rows) {
		if (!eventMap.has(row.event_id)) {
			eventMap.set(row.event_id, {
				event: {
					id: row.event_id,
					name: row.event_name,
					starts_at: row.starts_at,
					ends_at: row.ends_at,
					location: row.location,
					entity_name: row.entity_name
				},
				tournaments: []
			})
		}
		eventMap.get(row.event_id)!.tournaments.push(
			TournamentWithRegistrationSchema.parse({
				id: row.tournament_id,
				name: row.tournament_name,
				category: row.category,
				check_in_required: row.check_in_required,
				registration_count: row.registration_count,
				is_registered: row.is_registered
			})
		)
	}

	const openEvents: OpenEvent[] = Array.from(eventMap.values())

	return { openEvents }
}
