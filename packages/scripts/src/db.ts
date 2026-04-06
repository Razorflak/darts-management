import { setDefaultResultOrder } from "node:dns"
import {
	createSql,
	getLaunchRepositoryWithSql,
	getTournamentRepositoryWithSql,
} from "@darts-management/db"

setDefaultResultOrder("ipv6first")

const url = process.env.DATABASE_URL
if (!url) {
	throw new Error("DATABASE_URL manquant — vérifier packages/scripts/.env")
}

export const sql = createSql(url)
export const launchRepo = getLaunchRepositoryWithSql(sql)
export const tournamentRepo = getTournamentRepositoryWithSql(sql)
