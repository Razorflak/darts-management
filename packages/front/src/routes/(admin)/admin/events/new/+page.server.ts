import { redirect } from "@sveltejs/kit"
import { z } from "zod"
import { getUserRoles } from "$lib/server/authz"
import { sql } from "$lib/server/db"
import { EntitySchema } from "$lib/server/schemas/event-schemas.js"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, "/login")

	const roles = await getUserRoles(locals.user.id)
	const organisableRoles = [
		"organisateur",
		"adminClub",
		"adminComite",
		"adminLigue",
		"adminFederal",
	]
	const entityIds = roles
		.filter((r) => organisableRoles.includes(r.role))
		.map((r) => r.entityId)

	if (entityIds.length === 0) return { entities: [] }

	const entities = z.array(EntitySchema).parse(
		await sql<Record<string, unknown>[]>`
			SELECT id, name, type FROM entity
			WHERE id = ANY(${entityIds})
			ORDER BY name
		`,
	)
	return { entities }
}
