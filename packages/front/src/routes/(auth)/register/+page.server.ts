import { auth } from "$lib/server/auth"
import { redirect, fail } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, "/")
	return {}
}

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData()
		const name = String(data.get("name") ?? "").trim()
		const email = String(data.get("email") ?? "").trim()
		const password = String(data.get("password") ?? "")

		if (!name || !email || !password) {
			return fail(400, { error: "Tous les champs sont requis.", name, email })
		}
		if (password.length < 8) {
			return fail(400, {
				error: "Le mot de passe doit contenir au moins 8 caractères.",
				name,
				email,
			})
		}

		try {
			await auth.api.signUpEmail({
				body: { name, email, password },
				headers: request.headers,
			})
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Erreur lors de l'inscription."
			return fail(400, { error: message, name, email })
		}

		redirect(302, "/")
	},
}
