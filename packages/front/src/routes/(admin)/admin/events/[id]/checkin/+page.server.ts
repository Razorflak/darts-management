import { error } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import { getUserRoles } from "$lib/server/authz"
import {
	AdminEventDetailSchema,
	CheckinPlayerSchema,
} from "$lib/server/schemas/event-schemas.js"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) error(401, "Non authentifié")

	// Load event and verify access (same pattern as /admin/events/[id])
	const [eventRow] = await sql<Record<string, unknown>[]>`
		SELECT e.id, e.name, e.status, e.starts_at, e.ends_at, e.location,
		       e.organizer_id, en.id AS entity_id, en.name AS entity_name
		FROM event e JOIN entity en ON en.id = e.entity_id
		WHERE e.id = ${params.id}
	`
	if (!eventRow) error(404, "Événement introuvable")
	const event = AdminEventDetailSchema.parse(eventRow)

	const roles = await getUserRoles(locals.user.id)
	const hasAccess = roles.some(
		(r) =>
			r.entityId === event.entity_id &&
			[
				"adminTournoi",
				"adminClub",
				"adminComite",
				"adminLigue",
				"adminFederal",
				"organisateur",
			].includes(r.role),
	)
	const isOrganizer = event.organizer_id === locals.user.id
	if (!hasAccess && !isOrganizer) error(403, "Accès refusé")

	const date = url.searchParams.get("date")
	if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
		error(400, "Paramètre date manquant ou invalide")

	// Fetch all players registered to at least one check-in tournament on this date
	// A player may appear in multiple registrations (simples + doubles)
	// team_member gives us the player rows; tournament_registration is keyed by team_id
	const rows = await sql<Record<string, unknown>[]>`
		SELECT
			p.id AS player_id,
			p.first_name,
			p.last_name,
			r.id AS registration_id,
			r.team_id,
			r.tournament_id,
			t.name AS tournament_name,
			r.checked_in
		FROM tournament t
		JOIN tournament_registration r ON r.tournament_id = t.id
		JOIN team_member tm ON tm.team_id = r.team_id
		JOIN player p ON p.id = tm.player_id
		WHERE t.event_id = ${params.id}
			AND t.start_at::date::text = ${date}
			AND t.status = 'check-in'
		ORDER BY p.last_name, p.first_name, t.name
	`

	// Group flat rows by player_id
	type Row = {
		player_id: string
		first_name: string
		last_name: string
		registration_id: string
		team_id: string
		tournament_id: string
		tournament_name: string
		checked_in: boolean
	}
	const playerMap = new Map<
		string,
		{
			player_id: string
			first_name: string
			last_name: string
			registrations: Row[]
		}
	>()
	for (const row of rows as unknown as Row[]) {
		if (!playerMap.has(row.player_id)) {
			playerMap.set(row.player_id, {
				player_id: row.player_id,
				first_name: row.first_name,
				last_name: row.last_name,
				registrations: [],
			})
		}
		const entry = playerMap.get(row.player_id)!
		// Deduplicate: a player may appear twice per registration (solo team has 1 member;
		// doubles team has 2 members each seeing the same registration)
		if (
			!entry.registrations.find(
				(r) => r.registration_id === row.registration_id,
			)
		) {
			entry.registrations.push(row)
		}
	}

	const players = z
		.array(CheckinPlayerSchema)
		.parse(Array.from(playerMap.values()))

	// Tournaments of the day (check-in status) — passed to CheckinRegistrationModal
	const tournamentRows = await sql<Record<string, unknown>[]>`
		SELECT id, name, category FROM tournament
		WHERE event_id = ${params.id}
			AND start_at::date::text = ${date}
			AND status = 'check-in'
		ORDER BY name
	`
	const tournaments = z
		.array(z.object({ id: z.uuid(), name: z.string(), category: z.string() }))
		.parse(tournamentRows)

	return { event, players, date, tournaments }
}
