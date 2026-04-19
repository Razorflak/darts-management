import type { MatchForGroupStandings } from "@darts-management/domain"
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
	group_number: z.number().int().nullable(),
	round_number: z.number().int(),
	position: z.number().int(),
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
	phase_id: z.string(),
	phase_type: z.string(),
	phase_position: z.number().int(),
	bracket: z.enum(["W", "L", "GF"]).nullable(),
	loser_goes_to_event_match_id: z.number().int().nullable(),
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
	 * If the loser's destination match (loser_goes_to) is a bye, automatically advance
	 * the loser through it to the bye match's own winner_goes_to slot.
	 *
	 * This handles the double-elimination case where a loser drops into a bye match in
	 * the loser bracket — they should be treated as having won that bye automatically.
	 *
	 * Returns number of rows updated (0 if the destination match is not a bye, or if
	 * there is no loser_goes_to at all).
	 */
	advanceLoserThroughByeInBracket: async (
		sql: Sql,
		matchId: string,
		loserTeamId: string,
	): Promise<number> => {
		const result = await sql<{ count: number }[]>`
			WITH
			-- Step 1: find the bye match the loser was just placed into
			loser_dest AS (
				SELECT bi.loser_goes_to_info_id
				FROM match m
				JOIN bracket_match_info bi ON bi.id = m.bracket_info_id
				WHERE m.id = ${matchId}
				  AND bi.loser_goes_to_info_id IS NOT NULL
			),
			-- Step 2: confirm that destination match is a bye and get its winner_goes_to wiring
			bye_wiring AS (
				SELECT bye_bi.winner_goes_to_info_id, bye_bi.winner_goes_to_slot
				FROM loser_dest ld
				JOIN match bye_m ON bye_m.bracket_info_id = ld.loser_goes_to_info_id
				JOIN bracket_match_info bye_bi ON bye_bi.id = bye_m.bracket_info_id
				WHERE bye_m.status = 'bye'
				  AND bye_bi.winner_goes_to_info_id IS NOT NULL
			)
			UPDATE match
			SET team_a_id = CASE WHEN bye_wiring.winner_goes_to_slot = 'a' THEN ${loserTeamId} ELSE match.team_a_id END,
			    team_b_id = CASE WHEN bye_wiring.winner_goes_to_slot = 'b' THEN ${loserTeamId} ELSE match.team_b_id END
			FROM bye_wiring
			WHERE match.bracket_info_id = bye_wiring.winner_goes_to_info_id
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
	 * Récupère les matches d'une phase avec leur numéro de groupe.
	 * La logique de calcul des qualifiants est dans domain (computePhaseQualifiers).
	 */
	getPhaseMatchesForQualifiers: async (
		sql: Sql,
		phaseId: string,
	): Promise<MatchForGroupStandings[]> => {
		const RowSchema = z.object({
			team_a_id: z.string().nullable(),
			team_b_id: z.string().nullable(),
			score_a: z.number().int().nullable(),
			score_b: z.number().int().nullable(),
			status: z.string(),
			group_number: z.number().int(),
		})
		return z.array(RowSchema).parse(
			await sql<Record<string, unknown>[]>`
				SELECT m.team_a_id, m.team_b_id, m.score_a, m.score_b, m.status,
				       COALESCE(rri.group_number, bi.group_number) AS group_number
				FROM match m
				LEFT JOIN round_robin_match_info rri ON rri.id = m.round_robin_info_id
				LEFT JOIN bracket_match_info bi ON bi.id = m.bracket_info_id
				WHERE m.phase_id = ${phaseId}
			`,
		)
	},

	/**
	 * Get bracket metadata for a match.
	 * Returns null if the match is not a bracket match.
	 */
	getMatchBracketInfo: async (
		sql: Sql,
		matchId: string,
	): Promise<{
		bracket: string
		info_id: string
		winner_goes_to_info_id: string | null
	} | null> => {
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
			{
				phase_id: string
				bracket_info_id: string
				event_match_id: number
				tournament_id: string
			}[]
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
		const [gfRow] = await sql<
			{ team_a_id: string | null; team_b_id: string | null }[]
		>`
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
				       COALESCE(rri.group_number, bi.group_number) AS group_number,
				       COALESCE(rri.round_number, bi.round_number) AS round_number,
				       COALESCE(rri.position,     bi.position)     AS position,
				       p.id       AS phase_id,
				       p.type     AS phase_type,
				       p.position AS phase_position,
				       bi.bracket,
				       lm.event_match_id AS loser_goes_to_event_match_id,
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
				LEFT JOIN round_robin_match_info rri ON rri.id = m.round_robin_info_id
				LEFT JOIN bracket_match_info bi ON bi.id = m.bracket_info_id
				LEFT JOIN match lm ON lm.bracket_info_id = bi.loser_goes_to_info_id
				WHERE m.event_match_id = ${eventMatchId}
				  AND t.event_id = ${eventId}
			`,
		)
		return rows[0] ?? null
	},

	getByPhaseId: async (sql: Sql, phaseId: string) => {
		const rows = await sql`
		SELECT
			m.id,
			m.event_match_id,
			m.bracket_info_id,
			bi.tournament_id AS bi_tournament_id,
			bi.seed_a, bi.seed_b,
			bi.winner_goes_to_info_id,
			bi.winner_goes_to_slot,
			m.round_robin_info_id,
			rri.slot_a, rri.slot_b
		FROM match m
		LEFT JOIN bracket_match_info bi ON bi.id = m.bracket_info_id
		LEFT JOIN round_robin_match_info rri ON rri.id = m.round_robin_info_id
		WHERE m.phase_id = ${phaseId}
		ORDER BY m.event_match_id
	`

		const PhaseMatchRawSchema = z.object({
			id: z.string(),
			event_match_id: z.number().int(),
			bracket_info_id: z.string().nullable(),
			bi_tournament_id: z.string().nullable(),
			seed_a: z.number().int().nullable(),
			seed_b: z.number().int().nullable(),
			winner_goes_to_info_id: z.string().nullable(),
			winner_goes_to_slot: z.enum(["a", "b"]).nullable(),
			round_robin_info_id: z.string().nullable(),
			slot_a: z.number().int().nullable(),
			slot_b: z.number().int().nullable(),
		})

		const validated = z.array(PhaseMatchRawSchema).parse(rows)

		return validated.map((row) => ({
			id: row.id,
			event_match_id: row.event_match_id,
			bracketInfo:
				row.bracket_info_id !== null
					? {
							id: row.bracket_info_id,
							// biome-ignore lint/style/noNonNullAssertion: guaranteed non-null when bracket_info_id is set
							tournament_id: row.bi_tournament_id!,
							seed_a: row.seed_a,
							seed_b: row.seed_b,
							winner_goes_to_info_id: row.winner_goes_to_info_id,
							winner_goes_to_slot: row.winner_goes_to_slot,
						}
					: null,
			roundRobinInfo:
				row.round_robin_info_id !== null
					? {
							id: row.round_robin_info_id,
							// biome-ignore lint/style/noNonNullAssertion: guaranteed non-null when round_robin_info_id is set
							slot_a: row.slot_a!,
							// biome-ignore lint/style/noNonNullAssertion: guaranteed non-null when round_robin_info_id is set
							slot_b: row.slot_b!,
						}
					: null,
		}))
	},

	bulkUpdateTeams: async (
		sql: Sql,
		updates: Array<{
			matchId: string
			teamAId: string | null
			teamBId: string | null
			status?: string
		}>,
	): Promise<void> => {
		if (updates.length === 0) return

		const validUpdates = updates.filter((u) => u.matchId !== undefined)
		if (validUpdates.length === 0) return

		const matchIds = validUpdates.map((u) => u.matchId)
		const teamAIds = validUpdates.map((u) => u.teamAId ?? null)
		const teamBIds = validUpdates.map((u) => u.teamBId ?? null)

		await sql`
		UPDATE match
		SET team_a_id = updates.team_a_id,
		    team_b_id = updates.team_b_id
		FROM unnest(
			${sql.array(matchIds)}::uuid[],
			${sql.array(teamAIds)}::uuid[],
			${sql.array(teamBIds)}::uuid[]
		) AS updates(match_id, team_a_id, team_b_id)
		WHERE match.id = updates.match_id
	`

		const statusUpdates = validUpdates.filter((u) => u.status !== undefined)
		if (statusUpdates.length === 0) return

		const statusMatchIds = statusUpdates.map((u) => u.matchId)
		const statuses = statusUpdates.map((u) => u.status!)

		await sql`
		UPDATE match
		SET status = updates.status
		FROM unnest(
			${sql.array(statusMatchIds)}::uuid[],
			${sql.array(statuses)}::text[]
		) AS updates(match_id, status)
		WHERE match.id = updates.match_id
	`
	},
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const matchRepository = createRepository(defaultSql, internalMatchRepo)
export const getMatchRepositoryWithSql = (sql: Sql) =>
	createRepository(sql, internalMatchRepo)
