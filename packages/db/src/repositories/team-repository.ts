import { sql as defaultSql } from "../client.js"
import { createRepository } from "./utils.js"

type Sql = typeof defaultSql

const internalTeamRepository = {
	findOrCreate: async (sql: Sql, playerIds: string[]): Promise<string> => {
		if (playerIds.length === 0) {
			throw new Error("At least one player is required to create a team")
		}

		const existing = await sql<{ team_id: string }[]>`
		SELECT tm.team_id
		FROM team_member tm
		WHERE tm.player_id = ANY(${playerIds})
		GROUP BY tm.team_id
		HAVING COUNT(DISTINCT tm.player_id) = ${playerIds.length}
		   AND (SELECT COUNT(*) FROM team_member WHERE team_id = tm.team_id) = ${playerIds.length}
		LIMIT 1
	`
		if (existing.length > 0) return existing[0].team_id

		const [team] = await sql<
			{ id: string }[]
		>`INSERT INTO team DEFAULT VALUES RETURNING id`
		const values = playerIds.map((playerId) => ({
			team_id: team.id,
			player_id: playerId,
		}))
		await sql`INSERT INTO team_member ${sql(values)}`
		return team.id
	},
}

export const teamRepository = createRepository(
	defaultSql,
	internalTeamRepository,
)
export const getTeamRepositoryWithSql = (sql: Sql) =>
	createRepository(sql, internalTeamRepository)
