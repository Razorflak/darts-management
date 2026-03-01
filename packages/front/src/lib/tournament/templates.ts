import type { Category, BracketRound } from './types.js'

// ── Template-specific types (no IDs — generated on apply) ──────────────────

type GroupPhaseTemplate = {
	type: 'round_robin' | 'double_loss_groups'
	entrants: number
	qualifiers: number
	playersPerGroup: number
}

type EliminationPhaseTemplate = {
	type: 'single_elim' | 'double_elim'
	entrants: number
	tiers: { round: BracketRound; legs: number }[]
}

export type PhaseTemplate = GroupPhaseTemplate | EliminationPhaseTemplate

export type TournamentTemplate = {
	name: string
	category: Category
	startTime: string
	quota: number
	/** 0 = event start date, 1 = start date + 1 day, etc. */
	dayOffset?: number
	phases: PhaseTemplate[]
}

export type EventTemplate = {
	id: string
	title: string
	entity: string
	location: string
	durationDays: number
	summary: string
	tournaments: TournamentTemplate[]
}

// ── Shared phase blocks ────────────────────────────────────────────────────

const doubleKOPhase: GroupPhaseTemplate = {
	type: 'double_loss_groups',
	entrants: 32,
	qualifiers: 4,
	playersPerGroup: 8,
}

const classicPoolPhase: GroupPhaseTemplate = {
	type: 'round_robin',
	entrants: 32,
	qualifiers: 2,
	playersPerGroup: 4,
}

/** Arbre direct : 1/4 (3m) · 1/2 (4m) · Finale (5m) */
const elim3Tiers: EliminationPhaseTemplate = {
	type: 'single_elim',
	entrants: 16,
	tiers: [
		{ round: 8, legs: 3 },
		{ round: 4, legs: 4 },
		{ round: 2, legs: 5 },
	],
}

/** Arbre direct : 1/4 (3m) · Finale (4m) */
const elim2Tiers: EliminationPhaseTemplate = {
	type: 'single_elim',
	entrants: 8,
	tiers: [
		{ round: 8, legs: 3 },
		{ round: 2, legs: 4 },
	],
}

// ── Templates ──────────────────────────────────────────────────────────────

export const EVENT_TEMPLATES: EventTemplate[] = [
	{
		id: 'comite',
		title: 'Tournoi de Comité',
		entity: 'Comité',
		location: '',
		durationDays: 1,
		summary: '5 tournois · Double, Masculin, Féminin, Vétéran, Junior',
		tournaments: [
			{
				name: 'Double',
				category: 'double',
				startTime: '15:00',
				quota: 32,
				phases: [doubleKOPhase, elim3Tiers],
			},
			{
				name: 'Simple Masculin',
				category: 'male',
				startTime: '15:00',
				quota: 32,
				phases: [doubleKOPhase, elim3Tiers],
			},
			{
				name: 'Simple Féminin',
				category: 'female',
				startTime: '15:00',
				quota: 16,
				phases: [classicPoolPhase, elim2Tiers],
			},
			{
				name: 'Simple Vétéran',
				category: 'veteran',
				startTime: '15:00',
				quota: 16,
				phases: [classicPoolPhase, elim2Tiers],
			},
			{
				name: 'Simple Junior',
				category: 'junior',
				startTime: '15:00',
				quota: 16,
				phases: [classicPoolPhase, elim2Tiers],
			},
		],
	},
	{
		id: 'coupe_nationale',
		title: 'Coupe Nationale',
		entity: 'FFD',
		location: '',
		durationDays: 2,
		summary: '6 tournois · 2 jours · Double, Double Féminin, Masculin, Féminin, Vétéran, Junior',
		tournaments: [
			{
				name: 'Double',
				category: 'double',
				startTime: '09:00',
				quota: 32,
				dayOffset: 0,
				phases: [doubleKOPhase, elim3Tiers],
			},
			{
				name: 'Double Féminin',
				category: 'double_female',
				startTime: '09:00',
				quota: 32,
				dayOffset: 0,
				phases: [doubleKOPhase, elim3Tiers],
			},
			{
				name: 'Simple Masculin',
				category: 'male',
				startTime: '15:00',
				quota: 64,
				dayOffset: 1,
				phases: [
					{
						type: 'single_elim',
						entrants: 64,
						tiers: [
							{ round: 8, legs: 3 },
							{ round: 4, legs: 4 },
							{ round: 2, legs: 5 },
						],
					},
				],
			},
			{
				name: 'Simple Féminin',
				category: 'female',
				startTime: '09:00',
				quota: 32,
				dayOffset: 1,
				phases: [
					{
						type: 'single_elim',
						entrants: 32,
						tiers: [
							{ round: 8, legs: 3 },
							{ round: 2, legs: 4 },
						],
					},
				],
			},
			{
				name: 'Simple Vétéran',
				category: 'veteran',
				startTime: '09:00',
				quota: 16,
				dayOffset: 1,
				phases: [
					{
						type: 'single_elim',
						entrants: 16,
						tiers: [
							{ round: 8, legs: 3 },
							{ round: 2, legs: 4 },
						],
					},
				],
			},
			{
				name: 'Simple Junior',
				category: 'junior',
				startTime: '10:00',
				quota: 16,
				dayOffset: 1,
				phases: [
					classicPoolPhase,
					{
						type: 'single_elim',
						entrants: 8,
						tiers: [
							{ round: 8, legs: 3 },
							{ round: 2, legs: 4 },
						],
					},
				],
			},
		],
	},
]
