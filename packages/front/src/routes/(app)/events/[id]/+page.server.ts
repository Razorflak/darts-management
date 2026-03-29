import { error } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import {
	CategorySchema,
	EventSchema,
} from "$lib/server/schemas/event-schemas.js"
import type { PageServerLoad } from "./$types"

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
			type: eventRow.entity_type,
		},
	})

	// Used by public event page: tournament info + registration state for current visitor
	const TournamentWithRegistrationSchema = z.object({
		id: z.uuid(),
		name: z.string(),
		category: CategorySchema,
		check_in_required: z.boolean(),
		registration_count: z.number().int(),
		is_registered: z.boolean(),
		start_at: z.coerce.date(),
		partner: z.string().nullable(),
		registration_id: z.uuid().nullable(),
	})
	type TournamentWithRegistration = z.infer<
		typeof TournamentWithRegistrationSchema
	>

	// Current player id (null when user has no player profile yet)
	const currentPlayerId = locals.player?.id ?? null

	// Fetch tournaments with registration state for current player
	const tournamentRows = await sql<Record<string, unknown>[]>`
select t.id, t.name, t.category, t.check_in_required,
		COUNT(r.id)::int AS registration_count,t.start_at,
		COALESCE(rg.is_registered, false)  as is_registered,
		rg.registration_id ,
		rg.partner 
	FROM tournament t
	LEFT JOIN tournament_registration r ON r.tournament_id = t.id
	left join (select r.id as registration_id, tournament_id, true as is_registered, CONCAT(p2.first_name::text , ' ' , p2.last_name::text) as partner
	from tournament_registration r
	left join team  on team.id = r.team_id
	left join team_member tm on tm.team_id = team.id and tm.player_id = ${currentPlayerId}
	left join team_member tm2 on tm.team_id = tm2.team_id and tm2.player_id != ${currentPlayerId}
	left join player p2 on p2.id = tm2.player_id
	where tm.player_id = ${currentPlayerId}) as rg on t.id = rg.tournament_id
	where t.event_id = ${eventId}
	GROUP BY t.id,rg.tournament_id, rg.is_registered, rg.partner , rg.registration_id  
	order by t.id
    `

	const tournaments: TournamentWithRegistration[] = z
		.array(TournamentWithRegistrationSchema)
		.parse(tournamentRows)

	return {
		event,
		tournaments,
		canRegister: event.status === "ready",
	}
}
