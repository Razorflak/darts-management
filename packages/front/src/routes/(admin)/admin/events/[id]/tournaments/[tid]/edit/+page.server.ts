import { redirect } from "@sveltejs/kit"
import { sql } from "$lib/server/db"
import { DraftTournamentSchema } from "$lib/server/schemas/event-schemas"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, "/login")

	const eventId = params.id
	const tournamentId = params.tid

	const [eventRow] = await sql<Record<string, unknown>[]>`
		SELECT e.id, e.name
		FROM event e
		WHERE e.id = ${eventId}
		  AND e.organizer_id = ${locals.user.id}
	`
	if (!eventRow) redirect(302, "/admin/events")

	const [tournamentRow] = await sql<Record<string, unknown>[]>`
		SELECT id, name, category, start_at::text, auto_referee, check_in_required, status
		FROM tournament
		WHERE id = ${tournamentId}
		  AND event_id = ${eventId}
	`
	if (!tournamentRow) redirect(302, `/admin/events/${eventId}`)

	const phaseRows = await sql<Record<string, unknown>[]>`
		SELECT id, tournament_id, position, type,
		       players_per_group, qualifiers_per_group,
		       qualifiers_count, tiers
		FROM phase
		WHERE tournament_id = ${tournamentId}
		ORDER BY position
	`

	const raw = {
		id: tournamentRow.id,
		name: tournamentRow.name,
		category: tournamentRow.category ?? undefined,
		start_at: tournamentRow.start_at ?? null,
		auto_referee: tournamentRow.auto_referee,
		check_in_required: tournamentRow.check_in_required ?? false,
		status: tournamentRow.status ?? undefined,
		phases: phaseRows.map((p) => ({
			id: p.id,
			tournament_id: p.tournament_id,
			position: p.position,
			type: p.type,
			players_per_group: p.players_per_group ?? undefined,
			qualifiers_per_group: p.qualifiers_per_group ?? undefined,
			qualifiers_count: p.qualifiers_count ?? undefined,
			tiers:
				typeof p.tiers === "string" ? JSON.parse(p.tiers) : (p.tiers ?? []),
		})),
	}

	const tournament = DraftTournamentSchema.parse(raw)

	return {
		tournament,
		eventId,
		eventName: eventRow.name as string,
	}
}
