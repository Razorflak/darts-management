import postgres from "postgres"

export function createSql(databaseUrl: string): postgres.Sql {
	return postgres(databaseUrl)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("[db] DATABASE_URL is not set")

export const sql = createSql(databaseUrl)
