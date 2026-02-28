import { auth } from "$lib/server/auth"
import { redirect, fail } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
	// Already logged in — go to dashboard
	if (locals.user) redirect(302, "/")
	return {}
}

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData()
		const email = String(data.get("email") ?? "")
		const password = String(data.get("password") ?? "")

		if (!email || !password) {
			return fail(400, { error: "Email et mot de passe requis.", email })
		}

		try {
			await auth.api.signInEmail({
				body: { email, password },
				headers: request.headers,
			})
		} catch (err: unknown) {
			// Better Auth throws APIError on invalid credentials
			const message =
				err instanceof Error ? err.message : "Identifiants incorrects."
			return fail(401, { error: message, email })
		}

		redirect(302, "/")
	},
}
