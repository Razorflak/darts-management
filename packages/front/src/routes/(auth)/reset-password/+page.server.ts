import { fail } from "@sveltejs/kit"
import { auth } from "$lib/server/auth"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async () => {
	return { sent: false }
}

export const actions: Actions = {
	default: async ({ request, url }) => {
		const data = await request.formData()
		const email = String(data.get("email") ?? "").trim()

		if (!email) {
			return fail(400, { error: "L'email est requis.", sent: false })
		}

		// Always void — do not reveal whether email exists (anti-enumeration)
		void auth.api.requestPasswordReset({
			body: {
				email,
				redirectTo: `${url.origin}/reset-password/new`,
			},
			headers: request.headers,
		})

		// Always return success message — do not await the email send
		return { sent: true, email }
	},
}
