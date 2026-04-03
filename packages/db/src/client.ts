import { setDefaultResultOrder } from "node:dns"
import postgres from "postgres"

// Résout les soucis de perf vers supaBase
setDefaultResultOrder("ipv6first")

export function createSql(databaseUrl: string): postgres.Sql {
	const isPooler = databaseUrl.includes(":6543")

	return postgres(databaseUrl, {
		max: 5,
		idle_timeout: 20,
		max_lifetime: 1800,
		prepare: !isPooler,
	})
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("[db] DATABASE_URL is not set")

export const sql = createSql(databaseUrl)
