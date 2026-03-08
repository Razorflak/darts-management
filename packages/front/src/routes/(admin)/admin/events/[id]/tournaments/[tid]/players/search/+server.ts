import { json, error } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import { PlayerSearchResultSchema } from "$lib/server/schemas/event-schemas.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) error(401)
	const q = url.searchParams.get("q") ?? ""
	if (q.length < 2) return json([])

	const results = z.array(PlayerSearchResultSchema).parse(
		await sql<Record<string, unknown>[]>`
			SELECT id, first_name, last_name, birth_date::text, licence_no, department
			FROM player
			WHERE first_name ILIKE ${"%" + q + "%"}
			   OR last_name  ILIKE ${"%" + q + "%"}
			   OR licence_no ILIKE ${"%" + q + "%"}
			ORDER BY last_name, first_name
			LIMIT 10
		`
	)
	return json(results)
}
