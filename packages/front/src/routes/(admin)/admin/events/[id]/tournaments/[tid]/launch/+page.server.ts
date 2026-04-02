import { error } from "@sveltejs/kit"
import { z } from "zod"
import { getUserRoles } from "$lib/server/authz"
import { sql } from "$lib/server/db"
import {
	LaunchPhasePreviewSchema,
	RosterEntrySchema,
} from "$lib/server/schemas/event-schemas.js"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals, params }) => {
	const [tRow] = await sql<Record<string, unknown>[]>`
		SELECT t.id, t.name, t.category, t.check_in_required,
		       e.id AS event_id, e.name AS event_name, t.status,
		       t.auto_referee, e.entity_id
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

	const rosterRows = await sql<Record<string, unknown>[]>`
		SELECT r.id AS registration_id, r.team_id, r.checked_in, r.registered_at,
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
	`
	const roster = z.array(RosterEntrySchema).parse(rosterRows)
	const checkedInCount = roster.filter((r) => r.checked_in).length
	const totalCount = roster.length

	const phaseRows = await sql<Record<string, unknown>[]>`
		SELECT id, position, type, players_per_group, qualifiers_per_group,
		       qualifiers_count, sets_to_win, legs_per_set
		FROM phase WHERE tournament_id = ${params.tid}
		ORDER BY position
	`
	const phases = z.array(LaunchPhasePreviewSchema).parse(phaseRows)

	const warnings: string[] = []
	if (totalCount < 3) {
		warnings.push(
			`Attention : seulement ${totalCount} équipe(s) inscrite(s). La génération continuera mais certains groupes seront incomplets.`,
		)
	}
	if ((tRow.check_in_required as boolean) && checkedInCount < totalCount) {
		warnings.push(
			"Des joueurs n'ont pas encore été checkés. Seuls les joueurs présents seront inclus.",
		)
	}

	return {
		tournament: {
			id: tRow.id as string,
			name: tRow.name as string,
			event_id: tRow.event_id as string,
			event_name: tRow.event_name as string,
			status: tRow.status as string,
			auto_referee: tRow.auto_referee as boolean,
			check_in_required: tRow.check_in_required as boolean,
		},
		totalCount,
		checkedInCount,
		phases,
		warnings,
	}
}
