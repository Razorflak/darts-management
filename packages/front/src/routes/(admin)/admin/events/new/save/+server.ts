import { error, json } from "@sveltejs/kit"
import type postgres from "postgres"
import { z } from "zod"
import { getUserRoles } from "$lib/server/authz"
import { sql } from "$lib/server/db"
import {
	type DraftEvent,
	DraftEventSchema,
	type DraftTournament,
	type EliminationPhaseSchema,
	type GroupPhaseSchema,
	type Phase,
} from "$lib/server/schemas/event-schemas.js"
import type { RequestHandler } from "./$types"

// postgres.js TransactionSql uses Omit<Sql, ...> which strips call signatures in TypeScript.
// At runtime it IS callable — this cast restores the type for template literal queries.
type TxSql = postgres.Sql

const EventOwnerSchema = z.object({
	organizer_id: z.string(),
})

function isGroupPhase(p: Phase): p is z.infer<typeof GroupPhaseSchema> {
	return p.type === "round_robin" || p.type === "double_loss_groups"
}

async function insertPhases(
	tx: TxSql,
	tournamentId: string,
	phases: Phase[],
): Promise<void> {
	await tx`DELETE FROM phase WHERE tournament_id = ${tournamentId}`
	for (let i = 0; i < phases.length; i++) {
		const p = phases[i]
		if (isGroupPhase(p)) {
			await tx`
				INSERT INTO phase (id, tournament_id, position, type, players_per_group, qualifiers_per_group)
				VALUES (
					${p.id},
					${tournamentId},
					${i},
					${p.type},
					${p.players_per_group},
					${p.qualifiers_per_group}
				)
			`
		} else {
			const ep = p as z.infer<typeof EliminationPhaseSchema>
			await tx`
				INSERT INTO phase (id, tournament_id, position, type, qualifiers_count, tiers)
				VALUES (
					${ep.id},
					${tournamentId},
					${i},
					${ep.type},
					${ep.qualifiers_count},
					${JSON.stringify(ep.tiers)}
				)
			`
		}
	}
}

async function insertTournaments(
	tx: TxSql,
	eventId: string,
	tournaments: DraftTournament[],
): Promise<void> {
	await tx`DELETE FROM tournament WHERE event_id = ${eventId}`
	for (const t of tournaments) {
		await tx`
			INSERT INTO tournament (id, event_id, name, category, start_at, auto_referee, check_in_required)
			VALUES (
				${t.id},
				${eventId},
				${t.name},
				${t.category ?? null},
				${t.start_at ?? null},
				${t.auto_referee ?? false},
				${t.check_in_required ?? false}
			)
		`
		await insertPhases(tx, t.id, t.phases)
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return error(401, "Non authentifié")

	const body = (await request.json()) as { event: DraftEvent }
	const parsed = DraftEventSchema.safeParse(body.event)
	if (!parsed.success)
		return json({ error: "Données invalides." }, { status: 400 })
	const event = parsed.data

	// Authz: user must have an organisable role on the selected entity
	const roles = await getUserRoles(locals.user.id)
	const organisableRoles = [
		"organisateur",
		"adminClub",
		"adminComite",
		"adminLigue",
		"adminFederal",
	]
	// Si pas d'entité selectionnée, pas besoin de check si il a des droits
	const hasRole =
		!event.entity ||
		roles.some(
			(r) =>
				r.entityId === event.entity?.id && organisableRoles.includes(r.role),
		)
	if (!hasRole) {
		return json({ error: "Accès refusé." }, { status: 403 })
	}

	try {
		await sql.begin(async (rawTx) => {
			const tx = rawTx as unknown as TxSql
			const existing = z
				.array(EventOwnerSchema)
				.parse(await tx`SELECT organizer_id FROM event WHERE id = ${event.id}`)
			if (existing.length > 0 && existing[0].organizer_id !== locals.user!.id) {
				throw new Error("Forbidden")
			}
			if (existing.length > 0) {
				await tx`
					UPDATE event SET
						name                  = ${event.name!.trim()},
						entity_id             = ${event.entity!.id},
						starts_at             = ${event.starts_at ?? null},
						ends_at               = ${event.ends_at ?? null},
						location              = ${event.location ?? ""},
						registration_opens_at = ${event.registration_opens_at ?? null},
						updated_at            = now()
					WHERE id = ${event.id}
				`
			} else {
				await tx`
					INSERT INTO event (id, name, entity_id, organizer_id, starts_at, ends_at, location, registration_opens_at, status)
					VALUES (
						${event.id},
						${event.name!.trim()},
						${event.entity!.id},
						${locals.user!.id},
						${event.starts_at ?? null},
						${event.ends_at ?? null},
						${event.location ?? ""},
						${event.registration_opens_at ?? null},
						'draft'
					)
				`
			}
			await insertTournaments(tx, event.id, event.tournaments)
		})

		return json({ ok: true, eventId: event.id })
	} catch (err) {
		if (err instanceof Error && err.message === "Forbidden") {
			return json({ error: "Accès refusé." }, { status: 403 })
		}
		const message =
			err instanceof Error ? err.message : "Erreur base de données."
		return json({ error: message }, { status: 500 })
	}
}
