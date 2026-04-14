/**
 * Scripts destructifs — TOURNAMENT_ID ou EVENT_ID requis.
 *
 * Exemples :
 *   TOURNAMENT_ID=<uuid> pnpm test -- reset
 *   EVENT_ID=<uuid>      pnpm test -- reset
 */

import { submitMatchResult } from "@darts-management/application"
import { afterAll, describe, it } from "vitest"
import { sql } from "./db.js"

afterAll(() => sql.end())

describe("Manipulation match", () => {
	it("Liste des tournois existants", async () => {
		const tournois = await sql<{ id: string; name: string }[]>`
            SELECT tournament.id as tournamentId, tournament.name, event.name AS event_name , phase.position AS phase_postiontion, phase.type as phase_type, phase.id AS phase_id
FROM tournament
INNER JOIN event ON tournament.event_id = event.id
INNER JOIN phase ON phase.tournament_id = tournament.id
        `
		console.table(tournois)
	})

	it("Remplir tous les match d'un phase", async () => {
		// get all matches of a phase
		const phaseId = "b2a8088f-c981-4d36-930a-07be004c6c8c"
		const matches = await sql`
            SELECT id, event_match_id
            FROM match
            WHERE phase_id = ${phaseId} and status = 'pending'
            ORDER by event_match_id DESC
        `
		console.log(matches)
		console.log("toto", matches[0].id)
		for (const match of matches) {
			await submitMatchResult(match.id, { score_a: 3, score_b: 0 }, [
				{
					entityId: "019cc00e-792d-7648-ba79-56f8d0eda2a8",
					role: "adminTournoi",
				},
			])
		}
		/* await Promise.all(
				matches.map((match) =>
					submitMatchResult(match.id, { score_a: 2, score_b: 0 }, [
						{
							entityId: "00000000-0000-4000-8000-000000000001",
							role: "adminTournoi",
						},
					]),
				),
			) */
	}, 60000)
})
