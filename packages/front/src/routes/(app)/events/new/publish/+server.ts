import { json, error } from '@sveltejs/kit'
import type postgres from 'postgres'
import { sql } from '$lib/server/db'
import { getUserRoles } from '$lib/server/authz'
import type { RequestHandler } from './$types'
import type { EventData, Tournament } from '$lib/tournament/types'

type RequestBody = {
	eventId?: string
	event: EventData
	tournaments: Tournament[]
}

// postgres.js TransactionSql uses Omit<Sql, ...> which strips call signatures in TypeScript.
// At runtime it IS callable — this cast restores the type for template literal queries.
type TxSql = postgres.Sql

function validateForPublish(body: { event: EventData; tournaments: Tournament[] }): string | null {
	if (!body.event.name?.trim()) return "Le nom de l'événement est requis."
	if (!body.event.entity) return "L'entité organisatrice est requise."
	if (!body.event.startDate) return 'La date de début est requise.'
	if (!body.event.endDate) return 'La date de fin est requise.'
	if (body.tournaments.length === 0) return 'Au moins un tournoi est requis pour publier.'
	for (const t of body.tournaments) {
		if (!t.name?.trim()) return 'Chaque tournoi doit avoir un nom.'
		if (!t.category) return `Le tournoi "${t.name || 'sans nom'}" n'a pas de catégorie.`
	}
	return null
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return error(401, 'Non authentifié')

	const body: RequestBody = await request.json()

	// Full validation before any DB write
	const validationError = validateForPublish(body)
	if (validationError) {
		return json({ error: validationError }, { status: 400 })
	}

	// Authz: user must have an organisable role on the selected entity
	const roles = await getUserRoles(locals.user.id)
	const organisableRoles = ['organisateur', 'adminClub', 'adminComite', 'adminLigue', 'adminFederal']
	const hasRole = roles.some(
		(r) => r.entityId === body.event.entity && organisableRoles.includes(r.role),
	)
	if (!hasRole) {
		return json(
			{ error: "Vous n'avez pas les droits organisateur sur l'entité sélectionnée." },
			{ status: 403 },
		)
	}

	let savedEventId: string | undefined

	try {
		if (body.eventId) {
			const eventId = body.eventId
			// UPDATE path
			await sql.begin(async (rawTx) => {
				const tx = rawTx as unknown as TxSql
				// Verify ownership — user must be organizer of this draft event
				const [existing] = await tx`
					SELECT organizer_id FROM event WHERE id = ${eventId} AND status = 'draft'
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
				// Replace tournaments
				await tx`DELETE FROM tournament WHERE event_id = ${eventId}`
				for (const t of body.tournaments) {
					await tx`
						INSERT INTO tournament (event_id, name, club, category, quota, start_time, start_date, auto_referee, phases)
						VALUES (
							${eventId}, ${t.name}, ${t.club || null}, ${t.category || null},
							${t.quota}, ${t.startTime || ''}, ${t.startDate || null},
							${t.autoReferee ?? false}, ${JSON.stringify(t.phases)}
						)
					`
				}
				// Transition status to ready atomically within the transaction
				await tx`UPDATE event SET status = 'ready', updated_at = now() WHERE id = ${eventId}`
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
					await tx`
						INSERT INTO tournament (event_id, name, club, category, quota, start_time, start_date, auto_referee, phases)
						VALUES (
							${newEventId}, ${t.name}, ${t.club || null}, ${t.category || null},
							${t.quota}, ${t.startTime || ''}, ${t.startDate || null},
							${t.autoReferee ?? false}, ${JSON.stringify(t.phases)}
						)
					`
				}
				// Transition status to ready atomically within the transaction
				await tx`UPDATE event SET status = 'ready', updated_at = now() WHERE id = ${newEventId}`
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
