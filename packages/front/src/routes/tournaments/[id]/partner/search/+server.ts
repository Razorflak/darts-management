import { json, error } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db.js"
import { PartnerSearchResultSchema } from "$lib/server/schemas/event-schemas.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user || !locals.player) error(401, "Non authentifié")

	const q = url.searchParams.get("q") ?? ""
	if (q.length < 3) return json([])

	const results = z.array(PartnerSearchResultSchema).parse(
		await sql<Record<string, unknown>[]>`
			SELECT id, first_name, last_name, department
			FROM player
			WHERE id != ${locals.player.id}
			  AND (
			    first_name ILIKE ${"%" + q + "%"}
			    OR last_name  ILIKE ${"%" + q + "%"}
			    OR department ILIKE ${"%" + q + "%"}
			  )
			ORDER BY last_name, first_name
			LIMIT 10
		`
	)
	return json(results)
}
