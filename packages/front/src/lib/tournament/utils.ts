import type { Tournament, GroupPhase, EliminationPhase, BracketTier } from './types.js'

export function genId(): string {
	return Math.random().toString(36).slice(2, 10)
}

export function createTournament(): Tournament {
	return {
		id: genId(),
		name: '',
		club: '',
		quota: 32,
		category: null,
		startTime: '',
		phases: [],
		autoReferee: false,
	}
}

export function createGroupPhase(type: GroupPhase['type']): GroupPhase {
	return {
		id: genId(),
		type,
		entrants: 32,
		qualifiers: 2,
		playersPerGroup: 4,
	}
}

export function createEliminationPhase(type: EliminationPhase['type']): EliminationPhase {
	return {
		id: genId(),
		type,
		entrants: 16,
		tiers: [createBracketTier(2)],
	}
}

export function createBracketTier(round: BracketTier['round']): BracketTier {
	return { id: genId(), round, legs: 3 }
}
