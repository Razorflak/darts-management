import type postgres from "postgres"
import { sql } from "$lib/server/db.js"

// postgres.js TransactionSql uses Omit<Sql, ...> which strips call signatures in TypeScript.
// At runtime it IS callable — this cast restores the type for template literal queries.
type TxSql = postgres.Sql

export async function findOrCreateSoloTeam(playerId: string): Promise<string> {
	return await sql.begin(async (rawTx) => {
		const tx = rawTx as unknown as TxSql
		const existing = await tx<Record<string, unknown>[]>`
			SELECT tm.team_id
			FROM team_member tm
			WHERE tm.player_id = ${playerId}
			  AND (SELECT COUNT(*) FROM team_member WHERE team_id = tm.team_id) = 1
			LIMIT 1
		`
		if (existing.length > 0) return existing[0].team_id as string

		const [team] = await tx<Record<string, unknown>[]>`
			INSERT INTO team DEFAULT VALUES RETURNING id
		`
		const teamId = team.id as string
		await tx`INSERT INTO team_member (team_id, player_id) VALUES (${teamId}, ${playerId})`
		return teamId
	})
}

export async function findOrCreateDoublesTeam(
	playerIdA: string,
	playerIdB: string
): Promise<string> {
	return await sql.begin(async (rawTx) => {
		const tx = rawTx as unknown as TxSql
		const existing = await tx<Record<string, unknown>[]>`
			SELECT tm1.team_id
			FROM team_member tm1
			JOIN team_member tm2
			  ON tm2.team_id = tm1.team_id AND tm2.player_id = ${playerIdB}
			WHERE tm1.player_id = ${playerIdA}
			  AND (SELECT COUNT(*) FROM team_member WHERE team_id = tm1.team_id) = 2
			LIMIT 1
		`
		if (existing.length > 0) return existing[0].team_id as string

		const [team] = await tx<Record<string, unknown>[]>`
			INSERT INTO team DEFAULT VALUES RETURNING id
		`
		const teamId = team.id as string
		await tx`
			INSERT INTO team_member (team_id, player_id) VALUES
			  (${teamId}, ${playerIdA}),
			  (${teamId}, ${playerIdB})
		`
		return teamId
	})
}
