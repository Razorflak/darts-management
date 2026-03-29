import type postgres from "postgres"
import { sql } from "$lib/server/db.js"

type TxSql = postgres.Sql

export async function findOrCreateTeam(playerIds: string[]): Promise<string> {
	if (playerIds.length === 0) {
		throw new Error("At least one player is required to create a team")
	}

	return await sql.begin(async (rawTx) => {
		const tx = rawTx as unknown as TxSql

		// Find existing team with exactly these players
		const existing = await tx<Record<string, unknown>[]>`
			SELECT tm.team_id
			FROM team_member tm
			WHERE tm.player_id = ANY(${playerIds})
			GROUP BY tm.team_id
			HAVING COUNT(DISTINCT tm.player_id) = ${playerIds.length}
			   AND (SELECT COUNT(*) FROM team_member WHERE team_id = tm.team_id) = ${playerIds.length}
			LIMIT 1
		`
		if (existing.length > 0) return existing[0].team_id as string

		// Create new team
		const [team] = await tx<Record<string, unknown>[]>`
			INSERT INTO team DEFAULT VALUES RETURNING id
		`
		const teamId = team.id as string

		// Insert all team members
		const values = playerIds.map((playerId) => ({
			team_id: teamId,
			player_id: playerId,
		}))
		await tx`INSERT INTO team_member ${tx(values)}`

		return teamId
	})
}
