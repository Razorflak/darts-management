import { playerRepository } from "@darts-management/db"
import { error, json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) error(401)
	const q = url.searchParams.get("q") ?? ""
	if (q.length < 2) return json([])

	return json(await playerRepository.search(q))
}
