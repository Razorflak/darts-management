import { eventRepository } from "@darts-management/db"
import { json } from "@sveltejs/kit"
import { z } from "zod"
import type { RequestHandler } from "./$types"

const StatusUpdateSchema = z.object({
	status: z.enum(["ready"]),
	event_id: z.uuid(),
})

export const PATCH: RequestHandler = async ({ request }) => {
	const body = await request.json()
	const { data, error } = StatusUpdateSchema.safeParse(body)
	if (error) return json({ ok: false, error: error.message }, { status: 400 })

	await eventRepository.updateStatus(data.event_id, data.status)
	return json({ ok: true, status: data.status })
}
