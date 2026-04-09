import type { MatchDisplay } from "$lib/server/schemas/event-schemas.js"

// ─── Constantes ───────────────────────────────────────────────────────────────

export const CARD_HEIGHT = 96 // px
export const BASE_GAP = 8 // px
export const HEADER_HEIGHT = 24 // px — hauteur fixe du header de colonne

// ─── Types ────────────────────────────────────────────────────────────────────

export type BracketColumn = {
	roundNumber: number
	label: string
	roundIndex: number // 0 = R1 (colonne la plus à gauche), augmente vers la droite
	wbMatches: MatchDisplay[] // bracket="W"|null, triés par position
	lbMatches: MatchDisplay[] // bracket="L"|"GF", triés par position
	allDone: boolean
}

export type BracketLayout = {
	isSE: boolean
	columns: BracketColumn[]
	totalMatches: number
	finishedMatches: number
}

// ─── Détection du mode ────────────────────────────────────────────────────────

export function detectBracketMode(matches: MatchDisplay[]): "SE" | "DE" {
	return matches.some((m) => m.bracket === "L" || m.bracket === "GF")
		? "DE"
		: "SE"
}

// ─── Labels ───────────────────────────────────────────────────────────────────

function roundLabelSE(round: number, maxRound: number): string {
	if (round === 0) return "Finale"
	if (round === 1) return "Demi-finale"
	if (round === 2) return "Quart de finale"
	if (round === 3) return "Huitième de finale"
	return `Tour ${maxRound - round + 1}`
}

function roundLabelDE(
	round: number,
	bracket: "W" | "L" | "GF",
	numWbRounds: number,
): string {
	if (bracket === "GF") return "Grande Finale"
	if (bracket === "W") {
		if (round === 1) return "WB Finale"
		if (round === 2) return "WB Demi-finale"
		if (round === 3) return "WB Quart"
		const tourNum = numWbRounds - round + 1
		return `WB Tour ${tourNum}`
	}
	// bracket === "L"
	if (round === 0) return "LB Finale"
	return `LB Tour ${round}`
}

// ─── Gap entre cartes ─────────────────────────────────────────────────────────

export function columnGap(roundIndex: number): number {
	if (roundIndex === 0) return BASE_GAP
	return (CARD_HEIGHT + BASE_GAP) * 2 ** roundIndex - CARD_HEIGHT
}

// ─── Construction du layout ───────────────────────────────────────────────────

const DONE_STATUSES = new Set(["done", "walkover", "bye"])

export function buildBracketLayout(matches: MatchDisplay[]): BracketLayout {
	const isSE = detectBracketMode(matches) === "SE"

	const wbMatches = matches.filter(
		(m) => m.bracket === "W" || m.bracket === null,
	)
	const lbMatches = matches.filter(
		(m) => m.bracket === "L" || m.bracket === "GF",
	)

	const numWbRounds = wbMatches.reduce(
		(max, m) => Math.max(max, m.round_number),
		0,
	)

	// Union de tous les round_number, triés DESC
	const allRoundNumbers = [...new Set(matches.map((m) => m.round_number))].sort(
		(a, b) => b - a,
	)

	const columns: BracketColumn[] = allRoundNumbers.map((rn) => {
		const wbForRound = wbMatches
			.filter((m) => m.round_number === rn)
			.sort((a, b) => a.position - b.position)
		const lbForRound = lbMatches
			.filter((m) => m.round_number === rn)
			.sort((a, b) => a.position - b.position)

		// roundIndex : 0 = R1 (round le plus élevé), augmente vers la finale
		const roundIndex = numWbRounds - rn

		// Label : déterminé par le bracket dominant de cette colonne
		let label: string
		if (isSE) {
			label = roundLabelSE(rn, numWbRounds)
		} else {
			// Bracket dominant : GF > WB > LB
			const dominantBracket = lbForRound.some((m) => m.bracket === "GF")
				? "GF"
				: wbForRound.length > 0
					? "W"
					: "L"
			label = roundLabelDE(rn, dominantBracket, numWbRounds)
		}

		const allForRound = [...wbForRound, ...lbForRound]
		const playable = allForRound.filter((m) => m.status !== "bye")
		const allDone =
			playable.length > 0 && playable.every((m) => DONE_STATUSES.has(m.status))

		return {
			roundNumber: rn,
			label,
			roundIndex,
			wbMatches: wbForRound,
			lbMatches: lbForRound,
			allDone,
		}
	})

	const playableAll = matches.filter((m) => m.status !== "bye")
	return {
		isSE,
		columns,
		totalMatches: playableAll.length,
		finishedMatches: playableAll.filter((m) => DONE_STATUSES.has(m.status))
			.length,
	}
}

export function isMatchHighlighted(m: MatchDisplay, query: string): boolean {
	if (!query.trim()) return false
	const q = query.toLowerCase()
	return (
		(m.team_a_name?.toLowerCase().includes(q) ?? false) ||
		(m.team_b_name?.toLowerCase().includes(q) ?? false)
	)
}
