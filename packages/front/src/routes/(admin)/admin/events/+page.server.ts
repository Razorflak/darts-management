import { redirect } from "@sveltejs/kit"
import { z } from "zod"
import { getUserRoles } from "$lib/server/authz"
import { sql } from "$lib/server/db"
import {
	type EventListItem,
	EventListItemSchema,
} from "$lib/server/schemas/event-schemas.js"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, "/login")
	const roles = await getUserRoles(locals.user.id)
	const entityIds = roles.map((r) => r.entityId)

	const rawEvents =
		entityIds.length > 0
			? await sql<Record<string, unknown>[]>`
          SELECT e.id, e.name, e.status,
            e.starts_at::text AS starts_at,
            e.ends_at::text AS ends_at,
            e.location,
            e.registration_opens_at::text AS registration_opens_at,
            en.name AS entity_name,
            COUNT(t.id)::int AS tournament_count
          FROM event e
          JOIN entity en ON en.id = e.entity_id
          LEFT JOIN tournament t ON t.event_id = e.id
          WHERE e.organizer_id = ${locals.user.id}
            OR (e.entity_id = ANY(${entityIds}) AND e.status != 'draft')
          GROUP BY e.id, en.name
          ORDER BY e.starts_at DESC`
			: await sql<Record<string, unknown>[]>`
          SELECT e.id, e.name, e.status,
            e.starts_at::text AS starts_at,
            e.ends_at::text AS ends_at,
            e.location,
            e.registration_opens_at::text AS registration_opens_at,
            en.name AS entity_name,
            COUNT(t.id)::int AS tournament_count
          FROM event e
          JOIN entity en ON en.id = e.entity_id
          LEFT JOIN tournament t ON t.event_id = e.id
          WHERE e.organizer_id = ${locals.user.id}
          GROUP BY e.id, en.name
          ORDER BY e.starts_at DESC`

	const events: EventListItem[] = z.array(EventListItemSchema).parse(rawEvents)
	return { events }
}
