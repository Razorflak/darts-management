import { json } from "@sveltejs/kit"
import { z } from "zod"
import { tournamentRepository } from "@darts-management/db"
import type { RequestHandler } from "./$types"

const CheckinAllRequestSchema = z.object({
	tournament_id: z.string().uuid(),
})

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json()
	const { data, error } = CheckinAllRequestSchema.safeParse(body)
	if (error) return json({ ok: false, error: error.message }, { status: 400 })

	await tournamentRepository.checkinAll(data.tournament_id)
	return json({ ok: true })
}
