import { computeStandings } from "@darts-management/domain"
import { z } from "zod"
import { sql as defaultSql } from "../client.js"
import { createRepository } from "./utils.js"

type Sql = typeof defaultSql

// ─── Schemas ──────────────────────────────────────────────────────────────────

const MatchForUpdateSchema = z.object({
	id: z.string(),
	phase_id: z.string(),
	team_a_id: z.string().nullable(),
	team_b_id: z.string().nullable(),
	status: z.string(),
	sets_to_win: z.number().int(),
	legs_per_set: z.number().int(),
	score_a: z.number().int().nullable(),
	score_b: z.number().int().nullable(),
	bracket_info_id: z.string().nullable(),
	round_robin_info_id: z.string().nullable(),
	event_match_id: z.number().int(),
})

type MatchForUpdate = z.infer<typeof MatchForUpdateSchema>

const PhaseCountSchema = z.object({
	total: z.number().int(),
	finished: z.number().int(),
})

const BracketInfoSchema = z.object({
	bracket: z.string(),
	info_id: z.string(),
	winner_goes_to_info_id: z.string().nullable(),
})

const MatchLookupSchema = z.object({
	id: z.string(),
	event_match_id: z.number().int(),
	status: z.string(),
	sets_to_win: z.number().int(),
	legs_per_set: z.number().int(),
	team_a_id: z.string().nullable(),
	team_b_id: z.string().nullable(),
	score_a: z.number().int().nullable(),
	score_b: z.number().int().nullable(),
	team_a_name: z.string().nullable(),
	team_b_name: z.string().nullable(),
	referee_name: z.string().nullable(),
})

// ─── Internal repository ───────────────────────────────────────────────────────

const internalMatchRepo = {
	/**
	 * Lock the match row with FOR UPDATE to prevent double-submission.
	 * Throws Error("NotFound") if match doesn't exist.
	 * Throws Error("MatchAlreadyDone") if match is not pending.
	 */
	lockMatchForUpdate: async (
		sql: Sql,
		matchId: string,
	): Promise<MatchForUpdate> => {
		const rows = z.array(MatchForUpdateSchema).parse(
			await sql<Record<string, unknown>[]>`
				SELECT id, phase_id, team_a_id, team_b_id, status,
				       sets_to_win, legs_per_set, score_a, score_b,
				       bracket_info_id, round_robin_info_id, event_match_id
				FROM match
				WHERE id = ${matchId}
				FOR UPDATE
			`,
		)
		const row = rows[0]
		if (!row) throw new Error("NotFound")
		if (row.status !== "pending") throw new Error("MatchAlreadyDone")
		return row
	},

	/**
	 * Update match result: score and status.
	 */
	updateMatchResult: async (
		sql: Sql,
		matchId: string,
		scoreA: number,
		scoreB: number,
		status: "done" | "walkover",
	): Promise<void> => {
		await sql`
			UPDATE match
			SET score_a = ${scoreA}, score_b = ${scoreB}, status = ${status}
			WHERE id = ${matchId}
		`
	},

	/**
	 * Advance winner into next bracket slot using bracket_match_info wiring.
	 * Returns number of rows updated (0 if this is the final — no winner_goes_to).
	 */
	advanceWinnerInBracket: async (
		sql: Sql,
		matchId: string,
		winnerTeamId: string,
	): Promise<number> => {
		const result = await sql<{ count: number }[]>`
			WITH src AS (
				SELECT bi.winner_goes_to_info_id, bi.winner_goes_to_slot
				FROM match m
				JOIN bracket_match_info bi ON bi.id = m.bracket_info_id
				WHERE m.id = ${matchId}
			)
			UPDATE match
			SET team_a_id = CASE WHEN src.winner_goes_to_slot = 'a' THEN ${winnerTeamId} ELSE match.team_a_id END,
			    team_b_id = CASE WHEN src.winner_goes_to_slot = 'b' THEN ${winnerTeamId} ELSE match.team_b_id END
			FROM src
			WHERE match.bracket_info_id = src.winner_goes_to_info_id
			  AND src.winner_goes_to_info_id IS NOT NULL
			RETURNING 1 AS count
		`
		return result.length
	},

	/**
	 * Advance loser into loser bracket slot (double elimination).
	 * Returns number of rows updated (0 if no loser_goes_to).
	 */
	advanceLoserInBracket: async (
		sql: Sql,
		matchId: string,
		loserTeamId: string,
	): Promise<number> => {
		const result = await sql<{ count: number }[]>`
			WITH src AS (
				SELECT bi.loser_goes_to_info_id, bi.loser_goes_to_slot
				FROM match m
				JOIN bracket_match_info bi ON bi.id = m.bracket_info_id
				WHERE m.id = ${matchId}
			)
			UPDATE match
			SET team_a_id = CASE WHEN src.loser_goes_to_slot = 'a' THEN ${loserTeamId} ELSE match.team_a_id END,
			    team_b_id = CASE WHEN src.loser_goes_to_slot = 'b' THEN ${loserTeamId} ELSE match.team_b_id END
			FROM src
			WHERE match.bracket_info_id = src.loser_goes_to_info_id
			  AND src.loser_goes_to_info_id IS NOT NULL
			RETURNING 1 AS count
		`
		return result.length
	},

	/**
	 * Check if all matches in a phase are done/walkover/bye.
	 */
	checkPhaseComplete: async (
		sql: Sql,
		phaseId: string,
	): Promise<{ total: number; finished: number }> => {
		const [row] = z.array(PhaseCountSchema).parse(
			await sql<Record<string, unknown>[]>`
				SELECT COUNT(*)::int AS total,
				       COUNT(CASE WHEN status IN ('done', 'walkover', 'bye') THEN 1 END)::int AS finished
				FROM match
				WHERE phase_id = ${phaseId}
			`,
		)
		if (!row) throw new Error("NotFound")
		return row
	},

	/**
	 * Get qualified teams from a round-robin phase.
	 * Groups matches by group_number, computes standings, returns top N per group.
	 * Teams are interleaved: group0-rank1, group1-rank1, group0-rank2, etc.
	 */
	getPhaseQualifiers: async (
		sql: Sql,
		phaseId: string,
		qualifiersPerGroup: number,
	): Promise<string[]> => {
		const rows = await sql<
			{
				team_a_id: string | null
				team_b_id: string | null
				score_a: number | null
				score_b: number | null
				status: string
				group_number: number
			}[]
		>`
			SELECT m.team_a_id, m.team_b_id, m.score_a, m.score_b, m.status,
			       rri.group_number
			FROM match m
			JOIN round_robin_match_info rri ON rri.id = m.round_robin_info_id
			WHERE m.phase_id = ${phaseId}
		`

		// Group by group_number
		const byGroup = new Map<number, typeof rows>()
		for (const row of rows) {
			const group = byGroup.get(row.group_number) ?? []
			group.push(row)
			byGroup.set(row.group_number, group)
		}

		const sortedGroupNums = Array.from(byGroup.keys()).sort((a, b) => a - b)

		// Compute standings per group
		const standingsPerGroup = sortedGroupNums.map((gNum) => {
			const groupMatches = byGroup.get(gNum) ?? []
			return computeStandings(groupMatches)
		})

		// Interleave: group0-rank1, group1-rank1, group0-rank2, ...
		const result: string[] = []
		for (let rank = 0; rank < qualifiersPerGroup; rank++) {
			for (const standings of standingsPerGroup) {
				const entry = standings[rank]
				if (entry) {
					result.push(entry.team_id)
				}
			}
		}

		return result
	},

	/**
	 * Seed qualified teams into the next phase's first-round matches.
	 * For bracket phases: matches seed_a/seed_b in bracket_match_info.
	 * For round-robin phases: matches slot_a/slot_b in round_robin_match_info.
	 */
	seedNextPhase: async (
		sql: Sql,
		phaseId: string,
		teamIds: string[],
	): Promise<void> => {
		// Find next phase by position
		const nextPhaseRows = await sql<{ id: string; type: string }[]>`
			SELECT p2.id, p2.type
			FROM phase p1
			JOIN phase p2 ON p2.tournament_id = p1.tournament_id
			  AND p2.position = p1.position + 1
			WHERE p1.id = ${phaseId}
		`

		if (nextPhaseRows.length === 0) {
			// No next phase — this is the final phase
			return
		}

		const nextPhase = nextPhaseRows[0]

		// Check if next phase is bracket or round-robin
		const bracketMatches = await sql<
			{ match_id: string; seed_a: number | null; seed_b: number | null }[]
		>`
			SELECT m.id AS match_id, bi.seed_a, bi.seed_b
			FROM match m
			JOIN bracket_match_info bi ON bi.id = m.bracket_info_id
			WHERE m.phase_id = ${nextPhase.id}
			  AND (bi.seed_a IS NOT NULL OR bi.seed_b IS NOT NULL)
		`

		if (bracketMatches.length > 0) {
			// Bracket phase — assign by seed number (1-based)
			for (const bm of bracketMatches) {
				if (bm.seed_a !== null) {
					const teamId = teamIds[bm.seed_a - 1]
					if (teamId) {
						await sql`
							UPDATE match SET team_a_id = ${teamId}
							WHERE id = ${bm.match_id}
						`
					}
				}
				if (bm.seed_b !== null) {
					const teamId = teamIds[bm.seed_b - 1]
					if (teamId) {
						await sql`
							UPDATE match SET team_b_id = ${teamId}
							WHERE id = ${bm.match_id}
						`
					}
				}
			}
			return
		}

		// Round-robin phase — assign by slot_a/slot_b (1-based)
		const rrMatches = await sql<
			{ match_id: string; slot_a: number; slot_b: number }[]
		>`
			SELECT m.id AS match_id, rri.slot_a, rri.slot_b
			FROM match m
			JOIN round_robin_match_info rri ON rri.id = m.round_robin_info_id
			WHERE m.phase_id = ${nextPhase.id}
		`

		for (const rm of rrMatches) {
			const teamA = teamIds[rm.slot_a - 1]
			const teamB = teamIds[rm.slot_b - 1]
			if (teamA !== undefined || teamB !== undefined) {
				await sql`
					UPDATE match
					SET team_a_id = COALESCE(${teamA ?? null}, team_a_id),
					    team_b_id = COALESCE(${teamB ?? null}, team_b_id)
					WHERE id = ${rm.match_id}
				`
			}
		}
	},

	/**
	 * Get bracket metadata for a match.
	 * Returns null if the match is not a bracket match.
	 */
	getMatchBracketInfo: async (
		sql: Sql,
		matchId: string,
	): Promise<{ bracket: string; info_id: string; winner_goes_to_info_id: string | null } | null> => {
		const rows = z.array(BracketInfoSchema).parse(
			await sql<Record<string, unknown>[]>`
				SELECT bi.bracket, bi.id AS info_id, bi.winner_goes_to_info_id
				FROM match m
				JOIN bracket_match_info bi ON bi.id = m.bracket_info_id
				WHERE m.id = ${matchId}
			`,
		)
		return rows[0] ?? null
	},

	/**
	 * Create a Grand Final reset match dynamically when the LB winner wins the GF.
	 * Uses pg_advisory_xact_lock on event_id to prevent concurrent event_match_id conflicts.
	 */
	createResetMatch: async (
		sql: Sql,
		gfMatchId: string,
		eventId: string,
	): Promise<void> => {
		// Advisory lock on event to ensure unique event_match_id
		await sql`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`

		// Read phase_id and current GF bracket_info for wiring
		const [gfMatch] = await sql<
			{ phase_id: string; bracket_info_id: string; event_match_id: number; tournament_id: string }[]
		>`
			SELECT m.phase_id, m.bracket_info_id, m.event_match_id,
			       t.id AS tournament_id
			FROM match m
			JOIN phase p ON p.id = m.phase_id
			JOIN tournament t ON t.id = p.tournament_id
			WHERE m.id = ${gfMatchId}
		`
		if (!gfMatch) throw new Error("NotFound")

		// Get max event_match_id for this event
		const [maxRow] = await sql<{ max_id: number }[]>`
			SELECT COALESCE(MAX(m.event_match_id), 0)::int AS max_id
			FROM match m
			JOIN phase p ON p.id = m.phase_id
			JOIN tournament t ON t.id = p.tournament_id
			WHERE t.event_id = ${eventId}
		`
		const nextEventMatchId = (maxRow?.max_id ?? 0) + 1

		// Create new bracket_match_info for the reset match (GF bracket, no winner_goes_to)
		const [newInfo] = await sql<{ id: string }[]>`
			INSERT INTO bracket_match_info (tournament_id, bracket, round_number, position,
			                                winner_goes_to_info_id, winner_goes_to_slot,
			                                loser_goes_to_info_id, loser_goes_to_slot)
			VALUES (${gfMatch.tournament_id}, 'GF', -1, 0, NULL, NULL, NULL, NULL)
			RETURNING id
		`
		if (!newInfo) throw new Error("Failed to create reset bracket info")

		// Create the reset match row
		await sql`
			INSERT INTO match (phase_id, event_match_id, sets_to_win, legs_per_set, status, bracket_info_id)
			SELECT m.phase_id, ${nextEventMatchId}, m.sets_to_win, m.legs_per_set, 'pending', ${newInfo.id}
			FROM match m
			WHERE m.id = ${gfMatchId}
		`

		// Wire the GF match's bracket_info winner_goes_to to point to the new reset match info
		await sql`
			UPDATE bracket_match_info
			SET winner_goes_to_info_id = ${newInfo.id}, winner_goes_to_slot = 'a'
			WHERE id = ${gfMatch.bracket_info_id}
		`

		// The LB winner (who won GF) will be in team_a of the reset match
		// The WB winner (who lost GF) will be in team_b of the reset match
		// Advance the WB winner (loser of GF) to the reset match as team_b
		const [gfRow] = await sql<{ team_a_id: string | null; team_b_id: string | null }[]>`
			SELECT team_a_id, team_b_id FROM match WHERE id = ${gfMatchId}
		`
		if (gfRow) {
			// In GF, team_b is the LB winner (who just won), team_a is WB winner (who just lost)
			// Reset: team_a = LB winner (WB now must win), team_b = WB winner
			const [newMatch] = await sql<{ id: string }[]>`
				SELECT id FROM match WHERE bracket_info_id = ${newInfo.id}
			`
			if (newMatch) {
				await sql`
					UPDATE match
					SET team_a_id = ${gfRow.team_b_id}, team_b_id = ${gfRow.team_a_id}
					WHERE id = ${newMatch.id}
				`
			}
		}
	},

	/**
	 * Look up a match by event_match_id within an event.
	 * Returns null if not found.
	 */
	lookupMatchByEventMatchId: async (
		sql: Sql,
		eventId: string,
		eventMatchId: number,
	): Promise<z.infer<typeof MatchLookupSchema> | null> => {
		const rows = z.array(MatchLookupSchema).parse(
			await sql<Record<string, unknown>[]>`
				SELECT m.id, m.event_match_id, m.status, m.sets_to_win, m.legs_per_set,
				       m.team_a_id, m.team_b_id, m.score_a, m.score_b,
				       (SELECT string_agg(pl.first_name || ' ' || pl.last_name, ' / ' ORDER BY pl.last_name)
				        FROM team_member tm JOIN player pl ON pl.id = tm.player_id
				        WHERE tm.team_id = m.team_a_id) AS team_a_name,
				       (SELECT string_agg(pl.first_name || ' ' || pl.last_name, ' / ' ORDER BY pl.last_name)
				        FROM team_member tm JOIN player pl ON pl.id = tm.player_id
				        WHERE tm.team_id = m.team_b_id) AS team_b_name,
				       (SELECT string_agg(pl.first_name || ' ' || pl.last_name, ' / ' ORDER BY pl.last_name)
				        FROM team_member tm JOIN player pl ON pl.id = tm.player_id
				        WHERE tm.team_id = m.referee_team_id) AS referee_name
				FROM match m
				JOIN phase p ON p.id = m.phase_id
				JOIN tournament t ON t.id = p.tournament_id
				WHERE m.event_match_id = ${eventMatchId}
				  AND t.event_id = ${eventId}
			`,
		)
		return rows[0] ?? null
	},
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const matchRepository = createRepository(defaultSql, internalMatchRepo)
export const getMatchRepositoryWithSql = (sql: Sql) =>
	createRepository(sql, internalMatchRepo)
