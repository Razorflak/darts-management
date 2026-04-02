import { createPlayerProfile } from "@darts-management/application"
import { errors, getJsonStringError } from "@darts-management/domain"
import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import type { RequestHandler } from "./$types"

const CreateProfileSchema = z.object({
	user_id: z.string(),
	first_name: z.string().min(1, "Le prénom est requis"),
	last_name: z.string().min(1, "Le nom est requis"),
	department: z.string().min(1, "Le département est requis"),
	birth_date: z.coerce.date().nullable(),
	licence_no: z.string().trim().nullable(),
})

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json()
	const { data, error: parseError } = CreateProfileSchema.safeParse(body)
	if (parseError) {
		return error(400, getJsonStringError(errors.ERR_0002, parseError.message))
	}

	const result = await createPlayerProfile(data)

	if ("conflict" in result) {
		const code =
			result.conflict === "licence" ? errors.ERR_0004 : errors.ERR_0003
		return error(409, getJsonStringError(code))
	}

	return json({ success: true, ...result })
}
