import postgres from "postgres"

export function createSql(databaseUrl: string): postgres.Sql {
	return postgres(databaseUrl, {
		max: 5,
		idle_timeout: 20,   // ferme les connexions idle après 20s (avant que Supabase les coupe)
		max_lifetime: 1800, // recycle les connexions toutes les 30min max
	})
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("[db] DATABASE_URL is not set")

export const sql = createSql(databaseUrl)
