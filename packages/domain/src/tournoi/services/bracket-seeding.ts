export type Qualifier = {
	teamId: string
	groupNumber: number | null
	seed: number // 1 = meilleur de la poule, 2 = deuxième, etc.
}

function nextPowerOfTwo(n: number): number {
	let p = 1
	while (p < n) p *= 2
	return p
}

// Ordre standard des seeds dans un bracket
// ex:
// 2  -> [1,2]
// 4  -> [1,4,2,3]
// 8  -> [1,8,4,5,2,7,3,6]
function generateSeedOrder(size: number): number[] {
	let order = [1, 2]
	while (order.length < size) {
		const nextSize = order.length * 2
		const nextOrder: number[] = []
		for (const seed of order) {
			nextOrder.push(seed)
			nextOrder.push(nextSize + 1 - seed)
		}
		order = nextOrder
	}
	return order
}

export function separateGroupsForBracket(qualifiers: Qualifier[]) {
	// 1. Grouper par poule
	const groups: Record<string, Qualifier[]> = {}
	for (const q of qualifiers) {
		if (!q.groupNumber) q.groupNumber = 0 // si pas de group number d'origine, on les met tous dans le même groupe
		if (!groups[q.groupNumber]) groups[q.groupNumber] = []
		groups[q.groupNumber].push(q)
	}

	// 2. Trier chaque poule par classement interne
	for (const groupId in groups) {
		groups[groupId].sort((a, b) => a.seed - b.seed)
	}

	// 3. Construire un ordre "croisé" : A1, B1, C1, D1, A2, B2, ...
	const ordered: Qualifier[] = []
	const maxSeed = Math.max(...Object.values(groups).map((g) => g.length))
	const groupIds = Object.keys(groups).sort()

	for (let rank = 0; rank < maxSeed; rank++) {
		for (const groupId of groupIds) {
			const q = groups[groupId][rank]
			if (q) ordered.push(q)
		}
	}

	// 4. Taille du bracket (avec byes éventuels)
	const bracketSize = nextPowerOfTwo(ordered.length)

	// 5. Ordre standard des seeds dans le bracket
	const seedOrder = generateSeedOrder(bracketSize)

	// seedOrder donne, pour chaque position du bracket, quel seed théorique s’y trouve.
	// On inverse pour obtenir position par seed.
	const seedToPosition: Record<number, number> = {}
	seedOrder.forEach((seed, pos) => {
		seedToPosition[seed] = pos
	})

	// 6. Affecter les joueurs dans cet ordre

	return ordered.map((q, i) => {
		const virtualSeed = i + 1
		const pos = seedToPosition[virtualSeed]
		return { teamId: q.teamId, seed: pos + 1 }
	})
}
