import { json, error } from '@sveltejs/kit'
import type postgres from 'postgres'
import { sql } from '$lib/server/db'
import { getUserRoles } from '$lib/server/authz'
import type { RequestHandler } from './$types'
import type { EventData, Tournament, Phase, GroupPhase } from '$lib/tournament/types'

type RequestBody = {
	eventId?: string
	event: EventData
	tournaments: Tournament[]
}

// postgres.js TransactionSql uses Omit<Sql, ...> which strips call signatures in TypeScript.
// At runtime it IS callable — this cast restores the type for template literal queries.
type TxSql = postgres.Sql

function isGroupPhase(p: Phase): p is GroupPhase {
	return p.type === 'round_robin' || p.type === 'double_loss_groups'
}

async function insertPhases(tx: TxSql, tournamentId: string, phases: Phase[]): Promise<void> {
	await tx`DELETE FROM phase WHERE tournament_id = ${tournamentId}`
	for (let i = 0; i < phases.length; i++) {
		const p = phases[i]
		const group = isGroupPhase(p)
		await tx`
			INSERT INTO phase (tournament_id, position, type, entrants,
			                   players_per_group, qualifiers_per_group, qualifiers, tiers)
			VALUES (
				${tournamentId},
				${i},
				${p.type},
				${p.entrants},
				${group ? (p as GroupPhase).playersPerGroup : null},
				${group ? (p as GroupPhase).qualifiers : null},
				${!group ? ((p as { qualifiers?: number }).qualifiers ?? null) : null},
				${!group ? JSON.stringify((p as { tiers: unknown }).tiers) : null}
			)
		`
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return error(401, 'Non authentifié')

	const body: RequestBody = await request.json()

	// Validate: name required
	if (!body.event.name?.trim()) {
		return json({ error: "Le nom de l'événement est requis." }, { status: 400 })
	}

	// Authz: user must have an organisable role on the selected entity
	const roles = await getUserRoles(locals.user.id)
	const organisableRoles = ['organisateur', 'adminClub', 'adminComite', 'adminLigue', 'adminFederal']
	const hasRole = roles.some(
		(r) => r.entityId === body.event.entity && organisableRoles.includes(r.role),
	)
	if (!hasRole) {
		return json({ error: 'Accès refusé.' }, { status: 403 })
	}

	let savedEventId: string | undefined

	try {
		if (body.eventId) {
			const eventId = body.eventId
			// UPDATE path
			await sql.begin(async (rawTx) => {
				const tx = rawTx as unknown as TxSql
				// Verify ownership — organizer of draft, ready, or started event
				const [existing] = await tx`
					SELECT organizer_id FROM event WHERE id = ${eventId} AND status IN ('draft', 'ready', 'started')
				`
				if (!existing || existing.organizer_id !== locals.user!.id) {
					throw new Error('Forbidden')
				}
				await tx`
					UPDATE event SET
						name = ${body.event.name.trim()},
						entity_id = ${body.event.entity},
						starts_at = ${body.event.startDate || null},
						ends_at = ${body.event.endDate || null},
						location = ${body.event.location || ''},
						registration_opens_at = ${body.event.registrationOpensAt || null},
						updated_at = now()
					WHERE id = ${eventId}
				`
				// Replace tournaments (ON DELETE CASCADE removes phase rows automatically)
				await tx`DELETE FROM tournament WHERE event_id = ${eventId}`
				for (const t of body.tournaments) {
					const [{ id: newTournamentId }] = await tx`
						INSERT INTO tournament (event_id, name, club, category, quota, start_time, start_date, auto_referee)
						VALUES (
							${eventId}, ${t.name}, ${t.club || null}, ${t.category || null},
							${t.quota}, ${t.startTime || ''}, ${t.startDate || null},
							${t.autoReferee ?? false}
						)
						RETURNING id
					`
					await insertPhases(tx, newTournamentId, t.phases)
				}
				savedEventId = eventId
			})
		} else {
			// INSERT path
			await sql.begin(async (rawTx) => {
				const tx = rawTx as unknown as TxSql
				const [{ id: newEventId }] = await tx`
					INSERT INTO event (name, entity_id, organizer_id, starts_at, ends_at, location, registration_opens_at, status)
					VALUES (
						${body.event.name.trim()},
						${body.event.entity},
						${locals.user!.id},
						${body.event.startDate || null},
						${body.event.endDate || null},
						${body.event.location || ''},
						${body.event.registrationOpensAt || null},
						'draft'
					)
					RETURNING id
				`
				for (const t of body.tournaments) {
					const [{ id: newTournamentId }] = await tx`
						INSERT INTO tournament (event_id, name, club, category, quota, start_time, start_date, auto_referee)
						VALUES (
							${newEventId}, ${t.name}, ${t.club || null}, ${t.category || null},
							${t.quota}, ${t.startTime || ''}, ${t.startDate || null},
							${t.autoReferee ?? false}
						)
						RETURNING id
					`
					await insertPhases(tx, newTournamentId, t.phases)
				}
				savedEventId = newEventId
			})
		}

		return json({ ok: true, eventId: savedEventId })
	} catch (err) {
		if (err instanceof Error && err.message === 'Forbidden') {
			return json({ error: 'Accès refusé.' }, { status: 403 })
		}
		const message = err instanceof Error ? err.message : 'Erreur base de données.'
		return json({ error: message }, { status: 500 })
	}
}
