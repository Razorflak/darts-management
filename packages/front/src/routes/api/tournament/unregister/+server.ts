import { tournamentRepository } from "@darts-management/db"
import { json } from "@sveltejs/kit"
import { z } from "zod"
import type { RequestHandler } from "./$types"

const UnregisterRequestSchema = z.object({
	registration_id: z.uuid(),
})

export const DELETE: RequestHandler = async ({ request }) => {
	const body = await request.json()
	const { data, error } = UnregisterRequestSchema.safeParse(body)
	if (error) return json({ ok: false, error: error.message }, { status: 400 })

	await tournamentRepository.unregister(data.registration_id)
	return json({ ok: true })
}
