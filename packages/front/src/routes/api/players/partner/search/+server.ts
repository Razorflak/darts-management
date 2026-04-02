import { json, error } from "@sveltejs/kit"
import { playerRepository } from "@darts-management/db"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user || !locals.player) error(401, "Non authentifié")
	const q = url.searchParams.get("q") ?? ""
	if (q.length < 3) return json([])
	return json(await playerRepository.searchPartners(locals.player.id, q))
}
