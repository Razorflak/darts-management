/**
 * Scripts destructifs — TOURNAMENT_ID ou EVENT_ID requis.
 *
 * Exemples :
 *   TOURNAMENT_ID=<uuid> pnpm test -- reset
 *   EVENT_ID=<uuid>      pnpm test -- reset
 */
import { afterAll, describe, it } from "vitest"
import { launchRepo, sql, tournamentRepo } from "./db.js"

afterAll(() => sql.end())

const tid = process.env.TOURNAMENT_ID
const eid = process.env.EVENT_ID

describe("reset tournoi (TOURNAMENT_ID requis)", () => {
	it("Liste des tournois existants", async () => {
		const tournois = await sql<{ id: string; name: string }[]>`
            SELECT tournament.id as tournamentId, tournament.name, event.name AS event_name 
FROM tournament
INNER JOIN event ON tournament.event_id = event.id
        `
		console.table(tournois)
	})

	it("vider les matchs et remettre en 'ready'", async () => {
		const id = "7d18f3e2-78db-44fb-aab6-449712510303"
		await launchRepo.deleteMatchesByTournament(id)
		await tournamentRepo.updateStatus(id, "ready")
		console.log(`Tournoi ${id} → matchs supprimés, status 'ready'`)
	})

	it.skipIf(!tid)("vider les inscriptions du tournoi", async () => {
		const id = tid as string
		const deleted = await sql`
			DELETE FROM tournament_registration WHERE tournament_id = ${id}
		`
		console.log(`${deleted.count} inscription(s) supprimée(s)`)

		await sql`UPDATE tournament SET status = 'draft' WHERE id = ${id}`
		console.log(`Tournoi ${id} → status 'draft'`)
	})
})

describe("reset event — TOUS les tournois (EVENT_ID requis)", () => {
	it.skipIf(!eid)("vider tous les matchs de l'event", async () => {
		const id = eid as string

		const tournaments = await sql<{ id: string }[]>`
			SELECT id FROM tournament WHERE event_id = ${id}
		`
		for (const t of tournaments) {
			await launchRepo.deleteMatchesByTournament(t.id)
			await tournamentRepo.updateStatus(t.id, "ready")
		}
		console.log(
			`${tournaments.length} tournoi(s) de l'event ${id} → matchs supprimés, status 'ready'`,
		)
	})
})
