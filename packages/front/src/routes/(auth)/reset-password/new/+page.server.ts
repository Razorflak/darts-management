import { auth } from "$lib/server/auth"
import { redirect, fail, error } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get("token")
	if (!token) {
		error(400, "Lien de réinitialisation invalide ou expiré.")
	}
	return { token }
}

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData()
		const newPassword = String(data.get("newPassword") ?? "")
		const token = String(data.get("token") ?? "")

		if (!newPassword || newPassword.length < 8) {
			return fail(400, {
				error: "Le mot de passe doit contenir au moins 8 caractères.",
				token,
			})
		}

		try {
			await auth.api.resetPassword({
				body: { newPassword, token },
				headers: request.headers,
			})
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Le lien est invalide ou expiré."
			return fail(400, { error: message, token })
		}

		redirect(302, "/login?reset=success")
	},
}
