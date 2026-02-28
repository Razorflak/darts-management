import { auth } from "$lib/server/auth"
import { sql } from "@darts-management/db"
import { error } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"

type EntityRow = {
  id: string
  name: string
  type: "federation" | "ligue" | "comite" | "club"
  parent_id: string | null
  parent_name: string | null
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    // (app) layout already handles redirect — this is a belt-and-suspenders check
    error(401, "Non authentifié")
  }

  const canManage = await auth.api.userHasPermission({
    body: {
      userId: locals.user.id,
      permissions: { entity: ["create"] },
    },
  })
  if (!canManage.success) {
    error(403, "Accès réservé aux administrateurs fédéraux.")
  }

  const entities = await sql<EntityRow[]>`
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

  // Group by type for display
  const grouped = {
    federation: entities.filter((e) => e.type === "federation"),
    ligue: entities.filter((e) => e.type === "ligue"),
    comite: entities.filter((e) => e.type === "comite"),
    club: entities.filter((e) => e.type === "club"),
  }

  return { grouped }
}
