import {
	BracketInfoInsertRowSchema,
	type GeneratorResult,
	MatchInsertRowSchema,
	RoundRobinInfoInsertRowSchema,
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

	lockTournamentStatus: async (
		sql: Sql,
		tournamentId: string,
	): Promise<string> => {
		const [row] = await sql<{ status: string }[]>`
			SELECT status FROM tournament WHERE id = ${tournamentId} FOR UPDATE
		`
		if (!row) throw new Error("NotFound")
		return row.status
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

	insertMatches: async (sql: Sql, result: GeneratorResult): Promise<void> => {
		const { matches, roundRobinInfos, bracketInfos } = result

		// PostgreSQL vérifie les FK après l'insertion de toutes les lignes du
		// statement — le tri topologique n'est plus nécessaire pour les FK
		// auto-référentielles de bracket_match_info.
		if (bracketInfos.length > 0) {
			const rows = z.array(BracketInfoInsertRowSchema).parse(bracketInfos)
			await sql`
				INSERT INTO bracket_match_info ${sql(
					rows,
					"id",
					"tournament_id",
					"bracket",
					"round_number",
					"position",
					"group_number",
					"seed_a",
					"seed_b",
					"winner_goes_to_info_id",
					"winner_goes_to_slot",
					"loser_goes_to_info_id",
					"loser_goes_to_slot",
				)}
			`
		}

		if (roundRobinInfos.length > 0) {
			const rows = z.array(RoundRobinInfoInsertRowSchema).parse(roundRobinInfos)
			await sql`
				INSERT INTO round_robin_match_info ${sql(
					rows,
					"id",
					"tournament_id",
					"group_number",
					"round_number",
					"position",
					"slot_a",
					"slot_b",
				)}
			`
		}

		if (matches.length === 0) return
		const rows = z.array(MatchInsertRowSchema).parse(matches)
		await sql`
			INSERT INTO match ${sql(
				rows,
				"id",
				"phase_id",
				"event_match_id",
				"team_a_id",
				"team_b_id",
				"referee_team_id",
				"status",
				"sets_to_win",
				"legs_per_set",
				"round_robin_info_id",
				"bracket_info_id",
			)}
		`
	},

	deleteMatchesByTournament: async (
		sql: Sql,
		tournamentId: string,
	): Promise<void> => {
		// Les matchs sont supprimés par CASCADE depuis phase → tournament.
		// Les infos sont supprimées par CASCADE depuis tournament_id.
		await sql`
			DELETE FROM round_robin_match_info WHERE tournament_id = ${tournamentId}
		`
		await sql`
			DELETE FROM bracket_match_info WHERE tournament_id = ${tournamentId}
		`
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
