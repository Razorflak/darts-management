/**
 * Scripts de lecture — aucun effet de bord.
 * Lancer avec : pnpm test (dans packages/scripts)
 * Pour cibler un tournoi : TOURNAMENT_ID=<uuid> pnpm test
 */
import { afterAll, describe, it } from "vitest"
import { sql } from "./db.js"

afterAll(() => sql.end())

describe("events + tournois", () => {
	it("lister tous les events et leurs tournois", async () => {
		const rows = await sql`
			SELECT
				e.name            AS event,
				t.name            AS tournoi,
				t.status,
				t.start_at::text  AS debut,
				t.id              AS tournament_id
			FROM event e
			JOIN tournament t ON t.event_id = e.id
			ORDER BY e.name, t.name
		`
		console.table(rows)
	})

	it("compter les matchs et inscriptions par tournoi", async () => {
		const rows = await sql`
			SELECT
				t.name                                                       AS tournoi,
				t.status,
				COUNT(DISTINCT r.id)::int                                    AS inscrits,
				COUNT(DISTINCT m.id)::int                                    AS nb_matchs,
				COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'done')::int  AS matchs_joues
			FROM tournament t
			LEFT JOIN tournament_registration r ON r.tournament_id = t.id
			LEFT JOIN phase p                   ON p.tournament_id = t.id
			LEFT JOIN match m                   ON m.phase_id = p.id
			GROUP BY t.id, t.name, t.status
			ORDER BY t.name
		`
		console.table(rows)
	})
})

describe("phases (TOURNAMENT_ID requis)", () => {
	const tid = process.env.TOURNAMENT_ID

	it.skipIf(!tid)("phases du tournoi", async () => {
		const rows = await sql`
			SELECT
				p.position,
				p.type,
				p.players_per_group,
				p.qualifiers_per_group,
				p.qualifiers_count,
				p.sets_to_win,
				p.legs_per_set,
				p.id
			FROM phase p
			WHERE p.tournament_id = ${tid as string}
			ORDER BY p.position
		`
		console.table(rows)
	})

	it.skipIf(!tid)("matchs du tournoi (50 premiers)", async () => {
		const rows = await sql`
			SELECT
				m.event_match_id   AS num,
				p.type             AS phase,
				m.status,
				m.team_a_id,
				m.team_b_id,
				m.referee_team_id,
				m.id
			FROM match m
			JOIN phase p ON p.id = m.phase_id
			WHERE p.tournament_id = ${tid as string}
			ORDER BY m.event_match_id
			LIMIT 50
		`
		console.table(rows)
	})

	it.skipIf(!tid)("inscriptions du tournoi", async () => {
		const rows = await sql`
			SELECT
				r.team_id,
				r.checked_in,
				r.registered_at::text AS inscrit_le
			FROM tournament_registration r
			WHERE r.tournament_id = ${tid as string}
			ORDER BY r.registered_at
		`
		console.table(rows)
	})
})
