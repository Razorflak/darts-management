export type Qualifier = { teamId: string; groupId: number }

/**
 * Réordonne les qualifiés d'une phase de poule pour maximiser la séparation
 * des joueurs de la même poule dans les premiers tours d'un bracket.
 *
 * Pour chaque tier de rang r (0-indexed), applique une permutation Gray-code
 * sur les indices de groupe : position g reçoit le groupe (g XOR grayCode(r)),
 * avec grayCode(r) = r ^ (r >> 1).
 *
 * Garantie : pour G groupes avec G = puissance de 2, les joueurs de la même
 * poule se retrouvent dans des moitiés (et quarts, …) opposées du bracket,
 * et ne peuvent se rencontrer qu'en finale.
 * Pour G non-puissance-de-2 : meilleure séparation possible en best-effort.
 *
 * Prérequis : `qualifiers` est dans l'ordre interleacé produit par
 * getPhaseQualifiers — [G0R1, G1R1, …, G0R2, G1R2, …].
 */
export function separateGroupsForBracket(qualifiers: Qualifier[]): string[] {
	const G = new Set(qualifiers.map((q) => q.groupId)).size
	if (G <= 1) return qualifiers.map((q) => q.teamId)

	const Q = Math.round(qualifiers.length / G)
	const result: string[] = []

	for (let r = 0; r < Q; r++) {
		const tier = qualifiers.slice(r * G, (r + 1) * G)
		const xorMask = r ^ (r >> 1) // code de Gray

		for (let g = 0; g < G; g++) {
			const src = g ^ xorMask
			// Fallback si src hors limites (G non-puissance-de-2)
			result.push(tier[src < G ? src : g].teamId)
		}
	}

	return result
}
