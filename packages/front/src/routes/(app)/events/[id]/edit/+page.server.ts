import { redirect } from '@sveltejs/kit'
import { sql } from '$lib/server/db'
import { getUserRoles } from '$lib/server/authz'
import type { PageServerLoad } from './$types'
import type { EventData, Tournament } from '$lib/tournament/types'

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login')

	const eventId = params.id

	// Load the draft event — only if owned by this user
	const [row] = await sql<
		{
			id: string
			name: string
			entity_id: string
			starts_at: string | null
			ends_at: string | null
			location: string
			registration_opens_at: string | null
			start_time: string
		}[]
	>`
		SELECT id, name, entity_id,
		       starts_at::text, ends_at::text, location,
		       registration_opens_at::text, start_time
		FROM event
		WHERE id = ${eventId}
		  AND organizer_id = ${locals.user.id}
		  AND status = 'draft'
	`

	// If not found (wrong owner, wrong status, wrong id) → back to list
	if (!row) redirect(302, '/events')

	// Load associated tournaments
	const tournamentRows = await sql<
		{
			id: string
			name: string
			club: string | null
			category: string | null
			quota: number
			start_time: string
			start_date: string | null
			auto_referee: boolean
			phases: unknown
		}[]
	>`
		SELECT id, name, club, category, quota, start_time,
		       start_date::text, auto_referee, phases
		FROM tournament
		WHERE event_id = ${eventId}
		ORDER BY created_at
	`

	// Load entities for the entity selector (same as events/new)
	const roles = await getUserRoles(locals.user.id)
	const organisableRoles = ['organisateur', 'adminClub', 'adminComite', 'adminLigue', 'adminFederal']
	const entityIds = roles
		.filter((r) => organisableRoles.includes(r.role))
		.map((r) => r.entityId)

	const entities =
		entityIds.length > 0
			? await sql<{ id: string; name: string; type: string }[]>`
				SELECT id, name, type FROM entity
				WHERE id = ANY(${entityIds})
				ORDER BY name
			`
			: []

	// Map DB row → EventData
	const event: EventData = {
		name: row.name,
		entity: row.entity_id,
		startDate: row.starts_at ?? '',
		startTime: row.start_time ?? '',
		endDate: row.ends_at ?? '',
		location: row.location ?? '',
		registrationOpensAt: row.registration_opens_at ?? undefined,
	}

	// Map DB rows → Tournament[]
	const tournaments: Tournament[] = tournamentRows.map((t) => ({
		id: t.id,
		name: t.name,
		club: t.club ?? '',
		quota: t.quota,
		category: (t.category as Tournament['category']) ?? null,
		startTime: t.start_time ?? '',
		startDate: t.start_date ?? undefined,
		phases: t.phases as Tournament['phases'],
		autoReferee: t.auto_referee,
	}))

	return { event, tournaments, entities, eventId }
}
