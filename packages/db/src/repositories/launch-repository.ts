import {
	type MatchInsertRow,
	MatchInsertRowSchema,
} from "@darts-management/domain"
import { z } from "zod"
import { sql as defaultSql } from "../client.js"
import { createRepository } from "./utils.js"

type Sql = typeof defaultSql

const TournamentForLaunchSchema = z.object({
	id: z.string(),
	event_id: z.string(),
	entity_id: z.string(),
	status: z.string(),
	auto_referee: z.boolean(),
	is_seeded: z.boolean(),
	seed_order: z.preprocess(
		(val) => (typeof val === "string" ? JSON.parse(val) : val),
		z.array(z.string()),
	),
	check_in_required: z.boolean(),
})

const PhaseForLaunchSchema = z.object({
	id: z.string(),
	position: z.number().int(),
	type: z.string(),
	players_per_group: z.number().int().nullable(),
	qualifiers_per_group: z.number().int().nullable(),
	qualifiers_count: z.number().int().nullable(),
	tiers: z.preprocess(
		(val) => (typeof val === "string" ? JSON.parse(val) : val),
		z.unknown(),
	),
	sets_to_win: z.number().int().nullable(),
	legs_per_set: z.number().int().nullable(),
})

type TournamentForLaunch = z.infer<typeof TournamentForLaunchSchema> & {
	phases: z.infer<typeof PhaseForLaunchSchema>[]
}

const internalLaunchRepo = {
	loadActiveRoster: async (
		sql: Sql,
		tournamentId: string,
		checkInRequired: boolean,
	): Promise<string[]> => {
		const rows = await sql<{ team_id: string }[]>`
			SELECT r.team_id
			FROM tournament_registration r
			WHERE r.tournament_id = ${tournamentId}
			  AND (${checkInRequired} = false OR r.checked_in = true)
			ORDER BY r.registered_at
		`
		return rows.map((r) => r.team_id)
	},

	loadTournamentForLaunch: async (
		sql: Sql,
		tournamentId: string,
	): Promise<TournamentForLaunch> => {
		const [row] = z.array(TournamentForLaunchSchema).parse(
			await sql<Record<string, unknown>[]>`
				SELECT t.id, t.event_id, e.entity_id, t.status, t.auto_referee,
				       t.is_seeded, t.seed_order, t.check_in_required
				FROM tournament t
				JOIN event e ON e.id = t.event_id
				WHERE t.id = ${tournamentId}
				FOR UPDATE OF t
			`,
		)
		if (!row) throw new Error("NotFound")

		const phases = z.array(PhaseForLaunchSchema).parse(
			await sql<Record<string, unknown>[]>`
				SELECT p.id, p.position, p.type, p.players_per_group, p.qualifiers_per_group,
				       p.qualifiers_count, p.tiers, p.sets_to_win, p.legs_per_set
				FROM phase p
				WHERE p.tournament_id = ${tournamentId}
				ORDER BY p.position
			`,
		)

		return { ...row, phases }
	},

	countEventMatches: async (sql: Sql, eventId: string): Promise<number> => {
		const [row] = await sql<{ max_id: number }[]>`
			SELECT COALESCE(MAX(m.event_match_id), 0)::int AS max_id
			FROM match m
			JOIN phase p ON p.id = m.phase_id
			JOIN tournament t ON t.id = p.tournament_id
			WHERE t.event_id = ${eventId}
		`
		return row.max_id
	},

	insertMatches: async (sql: Sql, matches: MatchInsertRow[]): Promise<void> => {
		if (matches.length === 0) return

		// Validate all matches
		const validated = z.array(MatchInsertRowSchema).parse(matches)

		// Sort by round_number descending — finals (round 0) first so FK advances_to_match_id is satisfied
		const sorted = [...validated].sort(
			(a, b) => a.round_number - b.round_number,
		)

		for (const m of sorted) {
			await sql`
				INSERT INTO match (
					id, phase_id, event_match_id, group_number, round_number, position,
					team_a_id, team_b_id, referee_team_id,
					advances_to_match_id, advances_to_slot,
					status, sets_to_win, legs_per_set
				) VALUES (
					${m.id}, ${m.phase_id}, ${m.event_match_id}, ${m.group_number},
					${m.round_number}, ${m.position},
					${m.team_a_id}, ${m.team_b_id}, ${m.referee_team_id},
					${m.advances_to_match_id}, ${m.advances_to_slot},
					${m.status}, ${m.sets_to_win}, ${m.legs_per_set}
				)
			`
		}
	},

	deleteMatchesByTournament: async (
		sql: Sql,
		tournamentId: string,
	): Promise<void> => {
		await sql`
			DELETE FROM match
			WHERE phase_id IN (
				SELECT id FROM phase WHERE tournament_id = ${tournamentId}
			)
		`
	},
}

export const launchRepository = createRepository(defaultSql, internalLaunchRepo)
export const getLaunchRepositoryWithSql = (sql: Sql) =>
	createRepository(sql, internalLaunchRepo)
