import { getUserRoles } from "$lib/server/authz"
import { error } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		error(401, "Non authentifié")
	}
	const userRoles = await getUserRoles(locals.user.id)
	const isAdminFederal = userRoles.some((r) => r.role === "adminFederal")
	if (!isAdminFederal) {
		error(403, "Accès réservé aux administrateurs fédéraux.")
	}
	return {}
}
