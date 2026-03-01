import { redirect } from '@sveltejs/kit'
import { sql } from '$lib/server/db'
import { getUserRoles } from '$lib/server/authz'
import type { PageServerLoad } from './$types'

type EventRow = {
	id: string
	name: string
	status: 'draft' | 'ready' | 'started' | 'finished'
	starts_at: string
	ends_at: string
	location: string
	registration_opens_at: string | null
	entity_name: string
	tournament_count: number
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login')

	const roles = await getUserRoles(locals.user.id)
	const entityIds = roles.map((r) => r.entityId)

	// If user has no entity roles, they can only see their own events
	const events =
		entityIds.length > 0
			? await sql<EventRow[]>`
				SELECT
					e.id, e.name, e.status, e.starts_at, e.ends_at, e.location,
					e.registration_opens_at,
					en.name AS entity_name,
					COUNT(t.id)::int AS tournament_count
				FROM event e
				JOIN entity en ON en.id = e.entity_id
				LEFT JOIN tournament t ON t.event_id = e.id
				WHERE
					e.organizer_id = ${locals.user.id}
					OR (e.entity_id = ANY(${entityIds}) AND e.status != 'draft')
				GROUP BY e.id, en.name
				ORDER BY e.starts_at DESC
			`
			: await sql<EventRow[]>`
				SELECT
					e.id, e.name, e.status, e.starts_at, e.ends_at, e.location,
					e.registration_opens_at,
					en.name AS entity_name,
					COUNT(t.id)::int AS tournament_count
				FROM event e
				JOIN entity en ON en.id = e.entity_id
				LEFT JOIN tournament t ON t.event_id = e.id
				WHERE e.organizer_id = ${locals.user.id}
				GROUP BY e.id, en.name
				ORDER BY e.starts_at DESC
			`

	return { events }
}
