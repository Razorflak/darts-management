import { tournamentRepository } from "@darts-management/db"
import { errors, getJsonStringError } from "@darts-management/domain"
import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import type { RequestHandler } from "./$types"

const CheckinRequestSchema = z.object({
	registration_ids: z.array(z.string().uuid()).min(1),
	checked_in: z.boolean(),
})

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json()
	const { data, error: parseError } = CheckinRequestSchema.safeParse(body)
	if (parseError)
		return error(400, getJsonStringError(errors.ERR_0002, parseError.message))

	await tournamentRepository.updateCheckin(
		data.registration_ids,
		data.checked_in,
	)
	return json({ ok: true })
}
