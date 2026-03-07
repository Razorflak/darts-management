import { redirect } from "@sveltejs/kit"
import { sql } from "$lib/server/db"
import { getUserRoles } from "$lib/server/authz"
import type { PageServerLoad } from "./$types"
import {
	DraftEventSchema,
	EntitySchema,
	type DraftEvent
} from "$lib/server/schemas/event-schemas"
import { z } from "zod"

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, "/login")

	const eventId = params.id

	// Load event + entity in one query
	const [eventRow] = await sql<Record<string, unknown>[]>`
		SELECT
			e.id, e.name, e.status,
			e.starts_at::text, e.ends_at::text,
			e.location, e.registration_opens_at::text,
			en.id AS entity_id, en.name AS entity_name, en.type AS entity_type
		FROM event e
		JOIN entity en ON en.id = e.entity_id
		WHERE e.id = ${eventId}
		  AND e.organizer_id = ${locals.user.id}
		  AND e.status IN ('draft', 'ready', 'started')
	`
	if (!eventRow) redirect(302, "/events")

	// Load tournaments
	const tournamentRows = await sql<Record<string, unknown>[]>`
		SELECT id, name, category, start_at::text, auto_referee
		FROM tournament
		WHERE event_id = ${eventId}
		ORDER BY created_at
	`

	// Load phases for all tournaments
	const tournamentIds = tournamentRows.map((t) => t.id as string)
	const phaseRows =
		tournamentIds.length > 0
			? await sql<Record<string, unknown>[]>`
				SELECT id, tournament_id, position, type,
				       players_per_group, qualifiers_per_group,
				       qualifiers_count, tiers
				FROM phase
				WHERE tournament_id = ANY(${tournamentIds})
				ORDER BY tournament_id, position
			`
			: []

	// Load selectable entities for the form
	const roles = await getUserRoles(locals.user.id)
	const organisableRoles = ["organisateur", "adminClub", "adminComite", "adminLigue", "adminFederal"]
	const entityIds = roles.filter((r) => organisableRoles.includes(r.role)).map((r) => r.entityId)
	const entityRows =
		entityIds.length > 0
			? await sql<Record<string, unknown>[]>`
				SELECT id, name, type FROM entity
				WHERE id = ANY(${entityIds})
				ORDER BY name
			`
			: []
	const entities = z.array(EntitySchema).parse(entityRows)

	// Group phases by tournament_id
	const phasesByTournament: Record<string, unknown[]> = {}
	for (const p of phaseRows) {
		const tid = p.tournament_id as string
		if (!phasesByTournament[tid]) phasesByTournament[tid] = []
		phasesByTournament[tid].push({
			id: p.id,
			tournament_id: p.tournament_id,
			position: p.position,
			type: p.type,
			players_per_group: p.players_per_group ?? undefined,
			qualifiers_per_group: p.qualifiers_per_group ?? undefined,
			qualifiers_count: p.qualifiers_count ?? undefined,
			tiers: typeof p.tiers === "string" ? JSON.parse(p.tiers) : (p.tiers ?? [])
		})
	}

	// Assemble the full event object and validate with DraftEventSchema
	const raw = {
		id: eventRow.id,
		status: "draft",
		name: eventRow.name,
		starts_at: eventRow.starts_at ?? undefined,
		ends_at: eventRow.ends_at ?? undefined,
		location: eventRow.location ?? "",
		registration_opens_at: eventRow.registration_opens_at ?? undefined,
		entity: {
			id: eventRow.entity_id,
			name: eventRow.entity_name,
			type: eventRow.entity_type
		},
		tournaments: tournamentRows.map((t) => ({
			id: t.id,
			name: t.name,
			category: t.category ?? undefined,
			start_at: t.start_at ?? null,
			auto_referee: t.auto_referee,
			phases: phasesByTournament[t.id as string] ?? []
		}))
	}

	const event: DraftEvent = DraftEventSchema.parse(raw)

	return { event, entities, eventStatus: eventRow.status as "draft" | "ready" | "started" }
}
