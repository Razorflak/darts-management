export type WizardStep = 1 | 2 | 3

export type Category =
	| 'male'
	| 'female'
	| 'junior'
	| 'veteran'
	| 'open'
	| 'mix'
	| 'double'
	| 'double_female'
	| 'double_mix'

export type PhaseType =
	| 'round_robin' //         Poules Classique
	| 'double_loss_groups' //  Poules Double KO
	| 'single_elim' //         Arbre Direct
	| 'double_elim' //         Double Élimination

/** Power-of-2 bracket sizes — covers up to 4096 players (> 2056 max) */
export type BracketRound = 4096 | 2048 | 1024 | 512 | 256 | 128 | 64 | 32 | 16 | 8 | 4 | 2

export const BRACKET_ROUNDS: BracketRound[] = [
	4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2,
]

export interface EventData {
	name: string
	entity: string
	startDate: string
	startTime: string
	endDate: string
	location: string
	registrationOpensAt?: string // ISO date string 'YYYY-MM-DD', maps to registration_opens_at SQL column
}

export interface BracketTier {
	id: string
	round: BracketRound
	legs: number
}

export interface GroupPhase {
	id: string
	type: 'round_robin' | 'double_loss_groups'
	entrants: number
	/** Qualifiers advancing to the next phase, per group */
	qualifiers: number
	/** Players per group */
	playersPerGroup: number
}

export interface EliminationPhase {
	id: string
	type: 'single_elim' | 'double_elim'
	entrants: number
	tiers: BracketTier[]
	/** Number of players advancing to the next phase. Undefined for the final phase. */
	qualifiers?: number
}

export type Phase = GroupPhase | EliminationPhase

export interface Tournament {
	id: string
	name: string
	club: string
	quota: number
	category: Category | null
	startTime: string
	/** Optional: set when the tournament takes place on a different day than the event start. */
	startDate?: string
	phases: Phase[]
	autoReferee: boolean // maps to auto_referee SQL column; EVENT-06
}

