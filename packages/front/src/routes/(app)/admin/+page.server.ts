import { getUserRoles } from "$lib/server/authz"
import { sql } from "$lib/server/db"
import { error } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"
import { z } from "zod"
import { EntityWithParentSchema, type EntityWithParent } from "$lib/server/schemas/entity-schemas.js"

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    // (app) layout already handles redirect — this is a belt-and-suspenders check
    error(401, "Non authentifié")
  }

  const userRoles = await getUserRoles(locals.user.id)
  const isAdminFederal = userRoles.some((r) => r.role === "adminFederal")
  if (!isAdminFederal) {
    error(403, "Accès réservé aux administrateurs fédéraux.")
  }

  const rawEntities = await sql<Record<string, unknown>[]>`
    SELECT
      e.id,
      e.name,
      e.type,
      e.parent_id,
      p.name AS parent_name
    FROM entity e
    LEFT JOIN entity p ON p.id = e.parent_id
    ORDER BY e.type, p.name NULLS FIRST, e.name
  `

  const entities: EntityWithParent[] = z.array(EntityWithParentSchema).parse(rawEntities)

  // Group by type for display
  const grouped = {
    federation: entities.filter((e) => e.type === "federation"),
    ligue: entities.filter((e) => e.type === "ligue"),
    comite: entities.filter((e) => e.type === "comite"),
    club: entities.filter((e) => e.type === "club"),
  }

  return { grouped }
}
