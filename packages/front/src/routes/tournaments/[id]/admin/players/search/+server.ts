import { json, error } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import type { RequestHandler } from "./$types"
import { PlayerSearchResultSchema } from "$lib/server/schemas/event-schemas.js"

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) error(401, "Non authentifié")

	const q = url.searchParams.get("q") ?? ""
	if (q.length < 2) return json([])

	const rows = await sql<Record<string, unknown>[]>`
		SELECT id, first_name, last_name, birth_date::text, licence_no, department
		FROM player
		WHERE last_name  ILIKE ${"%" + q + "%"}
		   OR first_name ILIKE ${"%" + q + "%"}
		   OR licence_no ILIKE ${"%" + q + "%"}
		ORDER BY last_name, first_name
		LIMIT 10
	`

	const results = z.array(PlayerSearchResultSchema).parse(rows)
	return json(results)
}
