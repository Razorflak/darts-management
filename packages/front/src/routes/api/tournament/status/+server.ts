import { tournamentRepository } from "@darts-management/db"
import { json } from "@sveltejs/kit"
import { z } from "zod"
import type { RequestHandler } from "./$types"

const StatusUpdateSchema = z.object({
	status: z.enum(["ready", "check-in", "started", "finished"]),
	tournament_id: z.uuid(),
})

export const PATCH: RequestHandler = async ({ request }) => {
	const body = await request.json()
	const { data, error } = StatusUpdateSchema.safeParse(body)
	if (error) return json({ ok: false, error: error.message }, { status: 400 })

	await tournamentRepository.updateStatus(data.tournament_id, data.status)
	return json({ ok: true, status: data.status })
}
