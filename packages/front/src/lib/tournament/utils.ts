import type { BracketTier, DraftTournament } from "$lib/server/schemas/event-schemas.js"
import type { GroupPhase, EliminationPhase, PhaseType } from "$lib/server/schemas/event-schemas.js"
import { gendUuidv7 } from "$lib/utils/uuid.js"

export function genId(): string {
	return Math.random().toString(36).slice(2, 10)
}

/**
 * Convert a Date to a local-timezone YYYY-MM-DD string.
 * Uses getFullYear/getMonth/getDate to avoid UTC conversion from toISOString().
 * This prevents the 1-day offset bug in UTC+ timezones.
 */
export function toLocalDateISO(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, "0")
	const day = String(d.getDate()).padStart(2, "0")
	return `${y}-${m}-${day}`
}

export function createBlankTournament(): DraftTournament {
	return {
		id: gendUuidv7(),
		name: "",
		phases: [],
		auto_referee: true
	}
}

export function createGroupPhase(
	type: GroupPhase["type"],
	tournament_id: string,
	position: number
): GroupPhase {
	return {
		id: gendUuidv7(),
		type,
		players_per_group: 4,
		tournament_id,
		position,
		qualifiers_per_group: 2
	}
}

export function createEliminationPhase(
	type: EliminationPhase["type"],
	tournament_id: string,
	position: number
): EliminationPhase {
	return {
		id: gendUuidv7(),
		type,
		tiers: [],
		tournament_id,
		position,
		qualifiers_count: 1
	}
}

export function createBracketTier(round: BracketTier["round"]): BracketTier {
	return { round, legs: 3 }
}

export const extractTimeFromDate = (date?: Date) => {
	if (!date) return "00:00"
	const hours = String(date.getHours()).padStart(2, "0")
	const minutes = String(date.getMinutes()).padStart(2, "0")
	return `${hours}:${minutes}`
}
