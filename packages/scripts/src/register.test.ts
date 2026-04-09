/**
 * Scripts destructifs — TOURNAMENT_ID ou EVENT_ID requis.
 *
 * Exemples :
 *   TOURNAMENT_ID=<uuid> pnpm test -- reset
 *   EVENT_ID=<uuid>      pnpm test -- reset
 */

import { getOrCreatePlayer } from "@darts-management/application"
import { faker } from "@faker-js/faker"
import { afterAll, describe, it } from "vitest"
import { registerTeam } from "../../application/src/tournament/register-team.js"
import { launchRepo, sql, tournamentRepo } from "./db.js"

afterAll(() => sql.end())

describe("reset tournoi (TOURNAMENT_ID requis)", () => {
	it("Liste des tournois existants", async () => {
		const tournois = await sql<{ id: string; name: string }[]>`
            SELECT tournament.id as tournamentId, tournament.name, event.name AS event_name 
FROM tournament
INNER JOIN event ON tournament.event_id = event.id
        `
		console.table(tournois)
	})

	it("Creation/Inscript de joueur en masse à un tournois", async () => {
		const tournamentId = "030832f9-34a9-4701-a4b7-c7faa12e2ced"
		const players = Array.from({ length: 64 }, () => ({
			first_name: faker.person.firstName(),
			last_name: faker.person.lastName(),
			department: "44",
		}))

		const playerIds = await Promise.all(
			players.map(async (player) => getOrCreatePlayer(player)),
		)
		console.log(playerIds)
		const r = await Promise.all(
			playerIds.map((p) => registerTeam(tournamentId, [p])),
		)
		console.log(r)
	})
})
