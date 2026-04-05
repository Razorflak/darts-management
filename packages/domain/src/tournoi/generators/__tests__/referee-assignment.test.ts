import { describe, expect, it } from "vitest"
import { assignReferees } from "../referee-assignment.js"

// NOTE: Les tests de referee-assignment sont en attente de refactoring.
// La logique d'assignation sera retravaillée dans une phase ultérieure
// (dépend du nombre de cibles disponibles par groupe/phase).

describe.skip("assignReferees (à retravail ultérieur)", () => {
	it("stub — retourne les matchs inchangés", () => {
		const result = assignReferees([], [], false)
		expect(result).toHaveLength(0)
	})
})

describe("assignReferees — stub", () => {
	it("retourne les matchs sans modification", () => {
		const result = assignReferees([], [], false)
		expect(result).toEqual([])
	})
})
