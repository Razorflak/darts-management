import { error } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import { getUserRoles } from "$lib/server/authz"
import {
	AdminTournamentSchema,
	MatchDisplaySchema,
	RosterEntrySchema,
} from "$lib/server/schemas/event-schemas.js"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals, params }) => {
	const [tRow] = await sql<Record<string, unknown>[]>`
		SELECT t.id, t.name, t.category, t.check_in_required,
		       e.id AS event_id, e.name AS event_name, t.status, e.entity_id
		FROM tournament t JOIN event e ON e.id = t.event_id
		WHERE t.id = ${params.tid} AND e.id = ${params.id}
	`
	if (!tRow) error(404, "Tournoi introuvable")

	const entityId = tRow.entity_id as string
	const roles = await getUserRoles(locals.user!.id)
	const hasAccess = roles.some(
		(r) =>
			r.entityId === entityId &&
			[
				"adminTournoi",
				"adminClub",
				"adminComite",
				"adminLigue",
				"adminFederal",
			].includes(r.role),
	)
	if (!hasAccess) error(403, "Accès refusé")

	const tournament = AdminTournamentSchema.parse(tRow)

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
		WHERE r.tournament_id = ${params.tid}
		GROUP BY r.id, r.team_id, r.checked_in, r.registered_at
		ORDER BY MIN(p.last_name), MIN(p.first_name)
	`
	const roster = z.array(RosterEntrySchema).parse(rosterRows)

	let matches: z.infer<typeof MatchDisplaySchema>[] = []
	if (tournament.status === "started" || tournament.status === "finished") {
		const matchRows = await sql<Record<string, unknown>[]>`
			SELECT m.id, m.event_match_id, m.group_number, m.round_number, m.position,
			       m.status, m.phase_id, p.type AS phase_type, p.position AS phase_position,
			       (SELECT string_agg(pl.first_name || ' ' || pl.last_name, ' / ' ORDER BY pl.last_name)
			        FROM team_member tm2 JOIN player pl ON pl.id = tm2.player_id
			        WHERE tm2.team_id = m.team_a_id) AS team_a_name,
			       (SELECT string_agg(pl.first_name || ' ' || pl.last_name, ' / ' ORDER BY pl.last_name)
			        FROM team_member tm2 JOIN player pl ON pl.id = tm2.player_id
			        WHERE tm2.team_id = m.team_b_id) AS team_b_name,
			       (SELECT string_agg(pl.first_name || ' ' || pl.last_name, ' / ' ORDER BY pl.last_name)
			        FROM team_member tm2 JOIN player pl ON pl.id = tm2.player_id
			        WHERE tm2.team_id = m.referee_team_id) AS referee_name
			FROM match m
			JOIN phase p ON p.id = m.phase_id
			WHERE p.tournament_id = ${params.tid}
			ORDER BY p.position, m.group_number NULLS LAST, m.round_number, m.position
		`
		matches = z.array(MatchDisplaySchema).parse(matchRows)
	}

	return { tournament, roster, matches }
}
