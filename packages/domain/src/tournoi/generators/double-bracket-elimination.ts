// =============================================================================
// Double Elimination Bracket Generator — rematch-safe
//
// Guarantees: two players who met in the WB cannot meet again in the LB
// before the LB Semi-Final, thanks to the splitAndReverse drop ordering.
//
// splitAndReverse is ported from Gerry Sumner Hayes' algorithm (GPL v2, 2005).
// =============================================================================

function randomUUID(): string {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0
		return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
	})
}

export type Bracket = "W" | "L" | "GF"
export type Slot = "a" | "b"

export interface BracketMatch {
	id: string
	bracket: Bracket
	round: number
	/** Slot a seed — only set for WB Round 1 matches (null = bye) */
	seedA: number | null
	/** Slot b seed — only set for WB Round 1 matches (null = bye) */
	seedB: number | null
	/** Id of the match the winner advances to (null = champion) */
	winnerGoesToMatchId: string | null
	winnerGoesToSlot: Slot | null
	/** Id of the match the loser drops to (null = eliminated) */
	loserGoesToMatchId: string | null
	loserGoesToSlot: Slot | null
}

export function generateDoubleEliminationBracket(
	numberOfParticipants: number,
): BracketMatch[] {
	const n = numberOfParticipants
	if (n < 2) return []

	const rounds = Math.ceil(Math.log2(n))

	// ── Helpers ────────────────────────────────────────────────────────────────

	function changeIntoBye(seed: number, count: number): number | null {
		return seed <= count ? seed : null
	}

	// Original seeding algorithm (unchanged from your code)
	function getWBRound1Matchups(
		count: number,
	): [number | null, number | null][] {
		const r = Math.ceil(Math.log2(count))
		if (count < 2) return []
		let matches: [number | null, number | null][] = [[1, 2]]
		for (let round = 1; round < r; round++) {
			const next: [number | null, number | null][] = []
			const sum = 2 ** (round + 1) + 1
			for (const match of matches) {
				next.push([
					changeIntoBye(match[0]!, count),
					changeIntoBye(sum - match[0]!, count),
				])
				next.push([
					changeIntoBye(sum - match[1]!, count),
					changeIntoBye(match[1]!, count),
				])
			}
			matches = next
		}
		return matches
	}

	// splitAndReverse — computes the rematch-safe drop order for LB drop-in rounds.
	// Given a list of WB match indices, returns a permutation such that
	// the loser of WB match permutation[i] drops into LB slot i.
	// This guarantees that two players who met in the WB end up in opposite
	// halves of the LB and cannot meet again before the LB Semi-Final.
	function splitAndReverse(
		list: number[],
		splitFactor: number,
		reverse: boolean,
	): number[] {
		if (splitFactor === 1) return list
		const mid = Math.floor(list.length / 2)
		const left = list.slice(0, mid)
		const right = list.slice(mid)
		if (reverse) {
			return [
				...splitAndReverse(right, Math.floor(splitFactor / 2), !reverse),
				...splitAndReverse(left, Math.floor(splitFactor / 2), !reverse),
			]
		}
		return [
			...splitAndReverse(left, Math.floor(splitFactor / 2), !reverse),
			...splitAndReverse(right, Math.floor(splitFactor / 2), !reverse),
		]
	}

	// For a given WB round (1-based), return the permuted order of WB match indices.
	function getDropOrder(matchCount: number, wbRound: number): number[] {
		const indices = Array.from({ length: matchCount }, (_, i) => i)
		let splitFactor = 1
		let reverse = false
		for (let r = 1; r < wbRound; r++) {
			splitFactor = Math.min(splitFactor * 2, matchCount)
			reverse = !reverse
		}
		return splitAndReverse(indices, splitFactor, reverse)
	}

	function makeMatch(
		_hint: string,
		bracket: Bracket,
		round: number,
	): BracketMatch {
		return {
			id: randomUUID(),
			bracket,
			round,
			seedA: null,
			seedB: null,
			winnerGoesToMatchId: null,
			winnerGoesToSlot: null,
			loserGoesToMatchId: null,
			loserGoesToSlot: null,
		}
	}

	// ── 1. Build Winners Bracket ───────────────────────────────────────────────

	const allMatches: BracketMatch[] = []
	const wbRounds: BracketMatch[][] = []

	const r1Matchups = getWBRound1Matchups(n)
	const wbR1: BracketMatch[] = r1Matchups.map((mu, i) => {
		const m = makeMatch(`W1-${i + 1}`, "W", 1)
		m.seedA = mu[0]
		m.seedB = mu[1]
		allMatches.push(m)
		return m
	})
	wbRounds.push(wbR1)

	let prevWB = wbR1
	for (let r = 2; r <= rounds; r++) {
		const cur: BracketMatch[] = []
		for (let i = 0; i < prevWB.length; i += 2) {
			const m = makeMatch(`W${r}-${cur.length + 1}`, "W", r)
			allMatches.push(m)
			prevWB[i].winnerGoesToMatchId = m.id
			prevWB[i].winnerGoesToSlot = "a"
			prevWB[i + 1].winnerGoesToMatchId = m.id
			prevWB[i + 1].winnerGoesToSlot = "b"
			cur.push(m)
		}
		wbRounds.push(cur)
		prevWB = cur
	}

	const wbFinal = wbRounds[wbRounds.length - 1][0]

	// ── 2. Build Losers Bracket ────────────────────────────────────────────────
	//
	// LB Round 1 : WB R1 losers play each other (no LB survivors yet)
	// Then for each WB round R (2..rounds):
	//   Drop-in round  : WB R losers (reordered via splitAndReverse) vs LB survivors
	//   Reshuffle round: LB survivors play each other (skipped when only 1 match left)

	// round reflects when the match can actually be played:
	//   LB R1 (losers from WB R1) can only start after WB R1 → round 2
	//   Drop-in from WB Rx → round x+1
	//   Reshuffle after a drop-in at round r → round r+1

	let lbRoundIndex = 1 // sequential LB index used for the match id only
	let lbSurvivors: BracketMatch[] = []

	// LB Round 1 — fed by WB R1 losers → playable at round 2
	const wbR1Real = wbR1.filter((m) => m.seedA !== null && m.seedB !== null)
	const lbR1: BracketMatch[] = []

	for (let i = 0; i < wbR1Real.length; i += 2) {
		const mA = wbR1Real[i]
		const mB = wbR1Real[i + 1] as BracketMatch | undefined
		const playRound = 2 // WB R1 + 1
		const lbM = makeMatch(`L${lbRoundIndex}-${lbR1.length + 1}`, "L", playRound)
		allMatches.push(lbM)
		mA.loserGoesToMatchId = lbM.id
		mA.loserGoesToSlot = "a"
		if (mB) {
			mB.loserGoesToMatchId = lbM.id
			mB.loserGoesToSlot = "b"
		}
		lbR1.push(lbM)
	}

	if (lbR1.length > 0) {
		lbRoundIndex++
	}
	lbSurvivors = [...lbR1]

	for (let wbR = 2; wbR <= rounds; wbR++) {
		const wbRoundMatches = wbRounds[wbR - 1]
		const dropCount = wbRoundMatches.length
		const dropOrder = getDropOrder(dropCount, wbR)

		// Drop-in round — fed by WB Rx losers → playable at round wbR+1
		const dropInPlayRound = wbR + 1
		const dropInRound: BracketMatch[] = []
		for (let i = 0; i < dropCount; i++) {
			const wbMatch = wbRoundMatches[dropOrder[i]]
			const lbSurvivor = lbSurvivors[i]
			const lbM = makeMatch(
				`L${lbRoundIndex}-${dropInRound.length + 1}`,
				"L",
				dropInPlayRound,
			)
			allMatches.push(lbM)
			wbMatch.loserGoesToMatchId = lbM.id
			wbMatch.loserGoesToSlot = "a"
			lbSurvivor.winnerGoesToMatchId = lbM.id
			lbSurvivor.winnerGoesToSlot = "b"
			dropInRound.push(lbM)
		}
		lbRoundIndex++

		// Reshuffle round — follows immediately after the drop-in → round dropInPlayRound+1
		if (dropInRound.length > 1) {
			const reshuffleRound: BracketMatch[] = []
			for (let i = 0; i < dropInRound.length; i += 2) {
				const lbM = makeMatch(
					`L${lbRoundIndex}-${reshuffleRound.length + 1}`,
					"L",
					dropInPlayRound + 1,
				)
				allMatches.push(lbM)
				dropInRound[i].winnerGoesToMatchId = lbM.id
				dropInRound[i].winnerGoesToSlot = "a"
				dropInRound[i + 1].winnerGoesToMatchId = lbM.id
				dropInRound[i + 1].winnerGoesToSlot = "b"
				reshuffleRound.push(lbM)
			}
			lbRoundIndex++
			lbSurvivors = reshuffleRound
		} else {
			lbSurvivors = dropInRound
		}
	}

	const lbFinal = lbSurvivors[0]
	const gfRound = Math.max(wbFinal.round, lbFinal.round) + 1
	const grandFinal = makeMatch("GF", "GF", gfRound)
	allMatches.push(grandFinal)

	wbFinal.winnerGoesToMatchId = grandFinal.id
	wbFinal.winnerGoesToSlot = "a"

	lbFinal.winnerGoesToMatchId = grandFinal.id
	lbFinal.winnerGoesToSlot = "b"

	return allMatches
}
