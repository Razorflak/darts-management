import { fail, redirect } from "@sveltejs/kit"
import { sql } from "$lib/server/db"
import { CreateProfileSchema } from "$lib/server/schemas/event-schemas.js"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(302, "/login")
	if (locals.player) redirect(302, "/profile") // already has profile
	const redirectTo = url.searchParams.get("redirectTo") ?? "/"
	const safeRedirectTo = redirectTo.startsWith("/") ? redirectTo : "/"
	return { redirectTo: safeRedirectTo }
}

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		if (!locals.user) redirect(302, "/login")

		const data = await request.formData()
		const raw = {
			first_name: String(data.get("first_name") ?? "").trim(),
			last_name: String(data.get("last_name") ?? "").trim(),
			department: String(data.get("department") ?? "").trim(),
			birth_date: String(data.get("birth_date") ?? "").trim() || null,
			licence_no: String(data.get("licence_no") ?? "").trim() || null,
		}

		const result = CreateProfileSchema.safeParse(raw)
		if (!result.success) {
			return fail(400, { error: result.error.issues[0].message, values: raw })
		}
		const { first_name, last_name, department, birth_date, licence_no } = result.data

		await sql`
			INSERT INTO player (user_id, first_name, last_name, department, birth_date, licence_no)
			VALUES (${locals.user.id}, ${first_name}, ${last_name}, ${department},
			        ${birth_date ?? null}, ${licence_no ?? null})
			ON CONFLICT DO NOTHING
		`

		const redirectTo = url.searchParams.get("redirectTo") ?? "/"
		const safeRedirectTo = redirectTo.startsWith("/") ? redirectTo : "/"
		redirect(303, safeRedirectTo)
	},
}
