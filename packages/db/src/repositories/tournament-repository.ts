import type {
	DraftTournament,
	EliminationPhase,
	Phase,
} from "@darts-management/domain"
import { isGroupPhase } from "@darts-management/domain"
import { z } from "zod"
import { sql as defaultSql } from "../client.js"
import { createRepository } from "./utils.js"

type Sql = typeof defaultSql

const DuplicatePlayerSchema = z.object({
	first_name: z.string(),
	last_name: z.string(),
})

async function insertPhases(
	sql: Sql,
	tournamentId: string,
	phases: Phase[],
): Promise<void> {
	await sql`DELETE FROM phase WHERE tournament_id = ${tournamentId}`

	for (let i = 0; i < phases.length; i++) {
		const p = phases[i]
		if (isGroupPhase(p)) {
			await sql`
				INSERT INTO phase (id, tournament_id, position, type, players_per_group, qualifiers_per_group, sets_to_win, legs_per_set)
				VALUES (${p.id}, ${tournamentId}, ${i}, ${p.type}, ${p.players_per_group}, ${p.qualifiers_per_group}, ${p.sets_to_win ?? 2}, ${p.legs_per_set ?? 3})
			`
		} else {
			const ep = p as EliminationPhase
			await sql`
				INSERT INTO phase (id, tournament_id, position, type, qualifiers_count, tiers)
				VALUES (${ep.id}, ${tournamentId}, ${i}, ${ep.type}, ${ep.qualifiers_count}, ${JSON.stringify(ep.tiers)})
			`

			for (let j = 0; j < ep.tiers.length; j++) {
				const tier = ep.tiers[j]
				await sql`
					INSERT INTO phase_tier (phase_id, position, sets_to_win, legs_per_set)
					VALUES (${ep.id}, ${j}, 2, ${tier.legs})
				`
			}
		}
	}
}

const internalRepoTournament = {
	upsertTournamentsBatch: async (
		sql: Sql,
		eventId: string,
		tournaments: DraftTournament[],
	): Promise<void> => {
		// 1. Bulk upsert all tournaments via ON CONFLICT (no SELECT needed)
		if (tournaments.length > 0) {
			const tournamentRows = tournaments.map((t) => ({
				id: t.id,
				event_id: eventId,
				name: t.name,
				category: t.category ?? null,
				start_at: t.start_at ?? null,
				auto_referee: t.auto_referee ?? false,
				check_in_required: t.check_in_required ?? false,
			}))
			await sql`
				INSERT INTO tournament ${sql(tournamentRows)}
				ON CONFLICT (id) DO UPDATE SET
					name              = EXCLUDED.name,
					category          = EXCLUDED.category,
					start_at          = EXCLUDED.start_at,
					auto_referee      = EXCLUDED.auto_referee,
					check_in_required = EXCLUDED.check_in_required,
					updated_at        = now()
			`
		}

		// 2. Delete all phases for these tournaments at once, then batch insert
		const tournamentIds = tournaments.map((t) => t.id)
		if (tournamentIds.length > 0) {
			await sql`DELETE FROM phase WHERE tournament_id = ANY(${tournamentIds})`

			const groupPhaseRows: {
				id: string
				tournament_id: string
				position: number
				type: string
				players_per_group: number
				qualifiers_per_group: number
				sets_to_win: number
				legs_per_set: number
			}[] = []

			const eliminationPhaseRows: {
				id: string
				tournament_id: string
				position: number
				type: string
				qualifiers_count: number
				tiers: string
			}[] = []

			const tierRows: {
				phase_id: string
				position: number
				sets_to_win: number
				legs_per_set: number
			}[] = []

			for (const t of tournaments) {
				for (let i = 0; i < t.phases.length; i++) {
					const p = t.phases[i]
					if (isGroupPhase(p)) {
						groupPhaseRows.push({
							id: p.id,
							tournament_id: t.id,
							position: i,
							type: p.type,
							players_per_group: p.players_per_group,
							qualifiers_per_group: p.qualifiers_per_group,
							sets_to_win: p.sets_to_win ?? 2,
							legs_per_set: p.legs_per_set ?? 3,
						})
					} else {
						const ep = p as EliminationPhase
						eliminationPhaseRows.push({
							id: ep.id,
							tournament_id: t.id,
							position: i,
							type: ep.type,
							qualifiers_count: ep.qualifiers_count,
							tiers: JSON.stringify(ep.tiers),
						})
						for (let j = 0; j < ep.tiers.length; j++) {
							tierRows.push({
								phase_id: ep.id,
								position: j,
								sets_to_win: 2,
								legs_per_set: ep.tiers[j].legs,
							})
						}
					}
				}
			}

			if (groupPhaseRows.length > 0) {
				await sql`INSERT INTO phase ${sql(groupPhaseRows)}`
			}
			if (eliminationPhaseRows.length > 0) {
				await sql`INSERT INTO phase ${sql(eliminationPhaseRows)}`
			}
			if (tierRows.length > 0) {
				await sql`INSERT INTO phase_tier ${sql(tierRows)}`
			}
		}

		// 3. Remove tournaments no longer in payload (only if no registrations)
		await sql`
			DELETE FROM tournament
			WHERE event_id = ${eventId}
			  AND id != ALL(${tournamentIds})
			  AND NOT EXISTS (
			      SELECT 1 FROM tournament_registration
			      WHERE tournament_id = tournament.id
			  )
		`
	},

	upsertTournaments: async (
		sql: Sql,
		eventId: string,
		tournaments: DraftTournament[],
	): Promise<void> => {
		const existingRows = await sql<
			{ id: string }[]
		>`SELECT id FROM tournament WHERE event_id = ${eventId}`

		const existingIds = new Set(existingRows.map((r) => r.id))
		const payloadIds = new Set(tournaments.map((t) => t.id))

		const promises = tournaments.map(async (t) => {
			if (existingIds.has(t.id)) {
				await sql`
					UPDATE tournament SET
						name              = ${t.name},
						category          = ${t.category ?? null},
						start_at          = ${t.start_at ?? null},
						auto_referee      = ${t.auto_referee ?? false},
						check_in_required = ${t.check_in_required ?? false},
						updated_at        = now()
					WHERE id = ${t.id}
				`
			} else {
				await sql`
					INSERT INTO tournament (id, event_id, name, category, start_at, auto_referee, check_in_required)
					VALUES (${t.id}, ${eventId}, ${t.name}, ${t.category ?? null}, ${t.start_at ?? null}, ${t.auto_referee ?? false}, ${t.check_in_required ?? false})
				`
			}
			return insertPhases(sql, t.id, t.phases)
		})
		await Promise.all(promises)

		for (const existingId of existingIds) {
			if (!payloadIds.has(existingId)) {
				const [{ count }] = await sql<{ count: number }[]>`
					SELECT COUNT(*)::int AS count FROM tournament_registration WHERE tournament_id = ${existingId}
				`
				if (count === 0)
					await sql`DELETE FROM tournament WHERE id = ${existingId}`
			}
		}
	},

	findRegisteredPlayer: async (
		sql: Sql,
		tournamentId: string,
		playerIds: string[],
	): Promise<{ first_name: string; last_name: string } | null> => {
		const rows = z.array(DuplicatePlayerSchema).parse(
			await sql<Record<string, unknown>[]>`
				SELECT p.first_name, p.last_name
				FROM player p
				JOIN team_member tm ON tm.player_id = p.id
				JOIN tournament_registration r ON r.team_id = tm.team_id
				WHERE r.tournament_id = ${tournamentId}
				  AND p.id = ANY(${playerIds})
				LIMIT 1
			`,
		)
		return rows[0] ?? null
	},

	register: async (
		sql: Sql,
		tournamentId: string,
		teamId: string,
	): Promise<string> => {
		try {
			const [reg] = await sql<{ id: string }[]>`
				INSERT INTO tournament_registration (tournament_id, team_id)
				VALUES (${tournamentId}, ${teamId})
				RETURNING id
			`
			return reg.id
		} catch (err) {
			const pgErr = err as { code?: string }
			if (pgErr.code === "23505") throw new Error("TeamAlreadyRegistered")
			throw err
		}
	},

	updateCheckin: async (
		sql: Sql,
		registrationIds: string[],
		checkedIn: boolean,
	): Promise<void> => {
		await sql`
			UPDATE tournament_registration
			SET checked_in = ${checkedIn}
			WHERE id = ANY(${registrationIds}::uuid[])
		`
	},

	checkinAll: async (sql: Sql, tournamentId: string): Promise<void> => {
		await sql`UPDATE tournament_registration SET checked_in = true WHERE tournament_id = ${tournamentId}`
	},

	unregister: async (sql: Sql, registrationId: string): Promise<void> => {
		await sql`DELETE FROM tournament_registration WHERE id = ${registrationId}`
	},

	updateStatus: async (
		sql: Sql,
		tournamentId: string,
		status: "ready" | "check-in" | "started" | "finished",
	): Promise<void> => {
		await sql`UPDATE tournament SET status = ${status}, updated_at = now() WHERE id = ${tournamentId}`
	},
}

export const tournamentRepository = createRepository(
	defaultSql,
	internalRepoTournament,
)
export const getTournamentRepositoryWithSql = (sql: Sql) =>
	createRepository(sql, internalRepoTournament)
