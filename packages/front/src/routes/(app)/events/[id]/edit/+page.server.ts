import { redirect } from '@sveltejs/kit'
import { sql } from '$lib/server/db'
import { getUserRoles } from '$lib/server/authz'
import type { PageServerLoad } from './$types'
import type { EventData, Tournament, GroupPhase, EliminationPhase, BracketTier } from '$lib/tournament/types'

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login')

	const eventId = params.id

	// Load the event — draft, ready or started, owned by this user
	const [row] = await sql<
		{
			id: string
			name: string
			entity_id: string
			starts_at: string | null
			ends_at: string | null
			location: string
			registration_opens_at: string | null
			status: string
		}[]
	>`
		SELECT id, name, entity_id,
		       starts_at::text, ends_at::text, location,
		       registration_opens_at::text, status
		FROM event
		WHERE id = ${eventId}
		  AND organizer_id = ${locals.user.id}
		  AND status IN ('draft', 'ready', 'started')
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
		}[]
	>`
		SELECT id, name, club, category, quota, start_time,
		       start_date::text, auto_referee
		FROM tournament
		WHERE event_id = ${eventId}
		ORDER BY created_at
	`

	const tournamentIds = tournamentRows.map((t) => t.id)

	// Load all phases for all tournaments in one query
	type PhaseRow = {
		id: string
		tournament_id: string
		position: number
		type: string
		entrants: number
		players_per_group: number | null
		qualifiers_per_group: number | null
		qualifiers: number | null
		tiers: unknown
	}

	const phaseRows: PhaseRow[] =
		tournamentIds.length > 0
			? await sql<PhaseRow[]>`
				SELECT id, tournament_id, position, type, entrants,
				       players_per_group, qualifiers_per_group, qualifiers, tiers
				FROM phase
				WHERE tournament_id = ANY(${tournamentIds})
				ORDER BY tournament_id, position
			`
			: []

	// Group phases by tournament_id and map to Phase[]
	const phasesByTournamentId: Record<string, Tournament['phases']> = {}
	for (const p of phaseRows) {
		if (!phasesByTournamentId[p.tournament_id]) {
			phasesByTournamentId[p.tournament_id] = []
		}
		if (p.type === 'round_robin' || p.type === 'double_loss_groups') {
			const phase: GroupPhase = {
				id: p.id,
				type: p.type as GroupPhase['type'],
				entrants: p.entrants,
				qualifiers: p.qualifiers_per_group!,
				playersPerGroup: p.players_per_group!,
			}
			phasesByTournamentId[p.tournament_id].push(phase)
		} else {
			const phase: EliminationPhase = {
				id: p.id,
				type: p.type as EliminationPhase['type'],
				entrants: p.entrants,
				qualifiers: p.qualifiers ?? undefined,
				tiers: p.tiers as BracketTier[],
			}
			phasesByTournamentId[p.tournament_id].push(phase)
		}
	}

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
		startTime: '',
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
		phases: phasesByTournamentId[t.id] ?? [],
		autoReferee: t.auto_referee,
	}))

	const eventStatus = row.status as 'draft' | 'ready' | 'started'

	return { event, tournaments, entities, eventId, eventStatus }
}
