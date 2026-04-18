// =============================================================================
// Unified Bracket Generator — single elimination and double elimination
//
// Round number convention (0-based, counts backward from the end):
//   - SE: Final = 0, R1 = numWbRounds - 1
//   - DE: LB Final = 0, WB Final = 1, WB R1 = numWbRounds
//   - GF (DE): round = -1 (special, after all bracket rounds)
//
// Multiple matches can share the same round number (alignment indicator).
// Position is 0-based within each (bracket, round) pair.
//
// LB anti-rematch ordering uses splitAndReverse (Gerry Sumner Hayes, GPL v2, 2005).
// =============================================================================

import { v4 as uuidv4 } from "uuid"
import type {
	BracketInfoInsertRow,
	GeneratorResult,
	MatchInsertRow,
} from "../match-schemas.js"

// ─── Internal types ───────────────────────────────────────────────────────────

export type BracketSide = "W" | "L" | "GF"
type Slot = "a" | "b"
export type SlotRef = { nodeId: string; slot: Slot }

export type BracketNode = {
	id: string
	bracket: BracketSide
	round: number
	position: number
	seedA: number | null
	seedB: number | null
	winnerTo: SlotRef | null
	loserTo: SlotRef | null
}

// ─── Seeding helpers ──────────────────────────────────────────────────────────

/**
 * Returns standard first-round seed pairings for n participants.
 * Null indicates a BYE (seed > n).
 */
function getWBR1Matchups(n: number): [number | null, number | null][] {
	const rounds = Math.ceil(Math.log2(Math.max(n, 2)))
	let matches: [number, number][] = [[1, 2]]
	for (let round = 1; round < rounds; round++) {
		const next: [number, number][] = []
		const sum = 2 ** (round + 1) + 1
		for (const [a, b] of matches) {
			next.push([a, sum - a])
			next.push([sum - b, b])
		}
		matches = next
	}
	return matches.map(([a, b]) => [a <= n ? a : null, b <= n ? b : null])
}

// ─── Anti-rematch ordering (splitAndReverse) ──────────────────────────────────

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

// ─── Core bracket builder ─────────────────────────────────────────────────────

export type BracketMode = "single" | "double"

export function buildBracket(
	teamCount: number,
	mode: BracketMode,
): BracketNode[] {
	const numWbRounds = Math.ceil(Math.log2(Math.max(teamCount, 2)))
	const power2Sup = 2 ** Math.ceil(Math.log2(teamCount))
	// baseRound: WB Final round number (0 for SE, 1 for DE so LB Final can be 0)
	const baseRound = mode === "double" ? 1 : 0

	const nodes: BracketNode[] = []

	// Position counter: 0-based per (bracket, round)
	const posCounter = new Map<string, number>()
	function nextPos(bracket: BracketSide, round: number): number {
		const key = `${bracket}:${round}`
		const pos = posCounter.get(key) ?? 0
		posCounter.set(key, pos + 1)
		return pos
	}

	let nodeCount = 0
	function makeNode(bracket: BracketSide, round: number): BracketNode {
		const position = nextPos(bracket, round)
		return {
			id: `n${nodeCount++}`,
			bracket,
			round,
			position,
			seedA: null,
			seedB: null,
			winnerTo: null,
			loserTo: null,
		}
	}

	// ── 1. Winner Bracket ──────────────────────────────────────────────────────
	// Build from Final (level 0) outward to R1 (level numWbRounds-1).
	// round = baseRound + level

	// wbRounds[0] = [WB Final], wbRounds[1] = [WB semi, ...], wbRounds[numWbRounds-1] = WB R1 matches
	const wbRounds: BracketNode[][] = []

	const wbFinal = makeNode("W", baseRound)
	wbRounds.push([wbFinal])
	nodes.push(wbFinal)

	for (let level = 1; level < numWbRounds; level++) {
		const round = baseRound + level
		const prev = wbRounds[level - 1]
		const cur: BracketNode[] = []
		for (let i = 0; i < prev.length; i++) {
			for (const slot of ["a", "b"] as const) {
				const node = makeNode("W", round)
				node.winnerTo = { nodeId: prev[i].id, slot }
				cur.push(node)
				nodes.push(node)
			}
		}
		wbRounds.push(cur)
	}

	// Assign seeds to WB R1
	const wbR1 = wbRounds[numWbRounds - 1]
	const matchups = getWBR1Matchups(power2Sup)
	for (let i = 0; i < wbR1.length; i++) {
		wbR1[i].seedA = matchups[i][0]
		wbR1[i].seedB = matchups[i][1]
	}

	if (mode === "single") return nodes

	// ── 2. Loser Bracket ───────────────────────────────────────────────────────
	// Numérotation LB indépendante du WB, comptée à rebours depuis 0 = LB Final :
	//   LB R1           = 2*(numWbRounds-1) - 1
	//   Drop-in niveau L = 2 * levelFromFinal      (L = 0 → LB Final)
	//   Reshuffle        = 2 * levelFromFinal - 1   (round suivant le drop-in)
	// Drop-in et reshuffle ont des round numbers distincts (pas de mélange visuel).

	const lbR1Round = 2 * (numWbRounds - 1) - 1

	// wbR1.length = 2^(numWbRounds-1) — toujours pair, pas besoin de filtrer les BYEs.
	// Un match WB R1 BYE obtient quand même un loserTo : le slot LB correspondant
	// sera vide en pratique (BYE propagé), géré lors de l'assignation des équipes.
	let lbSurvivors: BracketNode[] = []

	for (let i = 0; i < wbR1.length; i += 2) {
		const mA = wbR1[i]
		const mB = wbR1[i + 1]
		const lbM = makeNode("L", lbR1Round)
		mA.loserTo = { nodeId: lbM.id, slot: "a" }
		mB.loserTo = { nodeId: lbM.id, slot: "b" }
		lbSurvivors.push(lbM)
		nodes.push(lbM)
	}

	// Process WB rounds R2 → Final (chronologically, i.e. levelFromFinal decreasing)
	// wbRounds[levelFromFinal] corresponds to wbRoundIdx = numWbRounds - levelFromFinal (1-based)
	for (
		let levelFromFinal = numWbRounds - 2;
		levelFromFinal >= 0;
		levelFromFinal--
	) {
		const wbRoundNodes = wbRounds[levelFromFinal]
		const wbRoundIdx = numWbRounds - levelFromFinal // 1-based WB round for getDropOrder
		const lbDiRound = 2 * levelFromFinal // drop-in round (0 = LB Final)
		const lbRsRound = lbDiRound - 1 // reshuffle round (un cran plus bas)

		const dropCount = wbRoundNodes.length
		const dropOrder = getDropOrder(dropCount, wbRoundIdx)

		// Drop-in : perdants WB (réordonnés) rencontrent les survivants LB
		const dropInNodes: BracketNode[] = []
		for (let i = 0; i < dropCount; i++) {
			const wbMatch = wbRoundNodes[dropOrder[i]]
			const lbSurvivor = lbSurvivors[i]
			const lbM = makeNode("L", lbDiRound)
			wbMatch.loserTo = { nodeId: lbM.id, slot: "a" }
			lbSurvivor.winnerTo = { nodeId: lbM.id, slot: "b" }
			dropInNodes.push(lbM)
			nodes.push(lbM)
		}

		// Reshuffle : les vainqueurs du drop-in s'affrontent (round distinct du drop-in)
		if (dropInNodes.length > 1) {
			const reshuffleNodes: BracketNode[] = []
			for (let i = 0; i < dropInNodes.length; i += 2) {
				const lbM = makeNode("L", lbRsRound)
				dropInNodes[i].winnerTo = { nodeId: lbM.id, slot: "a" }
				dropInNodes[i + 1].winnerTo = { nodeId: lbM.id, slot: "b" }
				reshuffleNodes.push(lbM)
				nodes.push(lbM)
			}
			lbSurvivors = reshuffleNodes
		} else {
			lbSurvivors = dropInNodes
		}
	}

	// ── 3. Grand Final ─────────────────────────────────────────────────────────
	const lbFinal = lbSurvivors[0]
	const gf = makeNode("GF", -1)
	wbFinal.winnerTo = { nodeId: gf.id, slot: "a" }
	lbFinal.winnerTo = { nodeId: gf.id, slot: "b" }
	nodes.push(gf)

	return nodes
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type BracketTierConfig = {
	/** round_number value (e.g. 0 = Final for SE, 1 = WB Final for DE) */
	round: number
	setsToWin: number
	legsPerSet: number
}

export type BracketConfig = {
	mode: BracketMode
	participantCount: number
	phaseId: string
	tournamentId: string
	startEventMatchId: number
	tiers: BracketTierConfig[]
	defaultFormat: { setsToWin: number; legsPerSet: number }
}

export function generateBracket(config: BracketConfig): GeneratorResult {
	const {
		mode,
		participantCount,
		phaseId,
		tournamentId,
		startEventMatchId,
		tiers,
		defaultFormat,
	} = config

	const nodes = buildBracket(participantCount, mode)
	const numWbRounds = Math.ceil(Math.log2(Math.max(participantCount, 2)))
	const baseRound = mode === "double" ? 1 : 0
	const wbR1Round = baseRound + numWbRounds - 1
	const lbR1Round = 2 * (numWbRounds - 1) - 1

	// IDs des matchs LB R1 dont au moins un feeder WB R1 est un BYE.
	// Ces matchs sont eux-mêmes des BYEs (le perdant du BYE WB n'existe pas → slot vide).
	const byeLbR1Ids = new Set(
		nodes
			.filter(
				(n) =>
					n.bracket === "W" &&
					n.round === wbR1Round &&
					(n.seedA === null || n.seedB === null) &&
					n.loserTo !== null,
			)
			.map((n) => n.loserTo?.nodeId)
			.filter((id): id is string => id !== undefined),
	)

	// Assign a UUID to each node
	const idMap = new Map<string, string>()
	for (const node of nodes) {
		idMap.set(node.id, uuidv4())
	}

	function resolveId(nodeId: string): string {
		const id = idMap.get(nodeId)
		if (!id) throw new Error(`Unknown node id: ${nodeId}`)
		return id
	}

	function getFormat(round: number): { setsToWin: number; legsPerSet: number } {
		const tier = tiers.find((t) => t.round === round)
		return tier ?? defaultFormat
	}

	const bracketInfos: BracketInfoInsertRow[] = []
	const matches: MatchInsertRow[] = []
	let nextEventMatchId = startEventMatchId

	for (const node of nodes) {
		const uuid = resolveId(node.id)

		bracketInfos.push({
			id: uuid,
			tournament_id: tournamentId,
			bracket: node.bracket,
			round_number: node.round,
			position: node.position,
			group_number: null,
			seed_a: node.seedA,
			seed_b: node.seedB,
			winner_goes_to_info_id: node.winnerTo
				? resolveId(node.winnerTo.nodeId)
				: null,
			winner_goes_to_slot: node.winnerTo?.slot ?? null,
			loser_goes_to_info_id: node.loserTo
				? resolveId(node.loserTo.nodeId)
				: null,
			loser_goes_to_slot: node.loserTo?.slot ?? null,
		})

		// BYE detection: WB R1 avec un slot null, ou LB R1 alimenté par un WB R1 BYE
		const isWBR1 = node.bracket === "W" && node.round === wbR1Round
		const isLbR1 = node.bracket === "L" && node.round === lbR1Round
		const isBye =
			(isWBR1 && (node.seedA === null || node.seedB === null)) ||
			(isLbR1 && byeLbR1Ids.has(node.id))

		const fmt = getFormat(node.round)
		matches.push({
			id: uuidv4(),
			phase_id: phaseId,
			event_match_id: nextEventMatchId++,
			team_a_id: null,
			team_b_id: null,
			referee_team_id: null,
			status: isBye ? "bye" : "pending",
			sets_to_win: fmt.setsToWin,
			legs_per_set: fmt.legsPerSet,
			round_robin_info_id: null,
			bracket_info_id: uuid,
		})
	}

	return { matches, roundRobinInfos: [], bracketInfos }
}
