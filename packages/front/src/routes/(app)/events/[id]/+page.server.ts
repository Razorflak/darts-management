import { error } from "@sveltejs/kit"
import { sql } from "$lib/server/db"
import type { PageServerLoad } from "./$types"
import { z } from "zod"
import {
	EntitySchema,
	EventSchema,
	TournamentWithRegistrationSchema,
	type TournamentWithRegistration
} from "$lib/server/schemas/event-schemas.js"

// Event detail without the wizard tournaments array
const EventDetailSchema = EventSchema.omit({ tournaments: true })
type EventDetail = z.infer<typeof EventDetailSchema>

export const load: PageServerLoad = async ({ locals, params }) => {
	// locals.user is guaranteed by +layout.server.ts redirect for anonymous visitors
	const eventId = params.id

	// Fetch event (non-draft only)
	const [eventRow] = await sql<Record<string, unknown>[]>`
		SELECT
			e.id, e.name, e.status,
			e.starts_at::text AS starts_at,
			e.ends_at::text AS ends_at,
			e.location,
			e.registration_opens_at::text AS registration_opens_at,
			ent.id AS entity_id, ent.name AS entity_name, ent.type AS entity_type
		FROM event e
		JOIN entity ent ON ent.id = e.entity_id
		WHERE e.id = ${eventId}
		  AND e.status != 'draft'
	`

	if (!eventRow) {
		error(404, "Événement introuvable")
	}

	const event: EventDetail = EventDetailSchema.parse({
		id: eventRow.id,
		name: eventRow.name,
		status: eventRow.status,
		starts_at: eventRow.starts_at,
		ends_at: eventRow.ends_at,
		location: eventRow.location,
		registration_opens_at: eventRow.registration_opens_at,
		entity: {
			id: eventRow.entity_id,
			name: eventRow.entity_name,
			type: eventRow.entity_type
		}
	})

	// Current player id (null when user has no player profile yet)
	const currentPlayerId = locals.player?.id ?? null

	// Fetch tournaments with registration state for current player
	const tournamentRows = await sql<Record<string, unknown>[]>`
		SELECT
			t.id, t.name, t.category, t.check_in_required,
			COUNT(r.id)::int AS registration_count,
			EXISTS (
				SELECT 1 FROM tournament_registration r_me
				JOIN team_member tm ON tm.team_id = r_me.team_id
				WHERE r_me.tournament_id = t.id AND tm.player_id = ${currentPlayerId}
			) AS is_registered
		FROM tournament t
		LEFT JOIN tournament_registration r ON r.tournament_id = t.id
		WHERE t.event_id = ${eventId}
		GROUP BY t.id
		ORDER BY t.name
	`

	const tournaments: TournamentWithRegistration[] = z
		.array(TournamentWithRegistrationSchema)
		.parse(tournamentRows)

	return {
		event,
		tournaments,
		canRegister: event.status === "ready"
	}
}
