import type {
	Category,
	DraftEvent,
	EliminationPhase,
	GroupPhase,
	Phase,
	Tournament,
} from "$lib/server/schemas/event-schemas.js"

// ── Template-specific types (no IDs — generated on apply) ──────────────────

// ── Shared phase blocks ────────────────────────────────────────────────────

const doubleKOPhase: Omit<GroupPhase, "position"> = {
	id: "<generated>",
	tournament_id: "<generated>",
	type: "double_loss_groups",
	players_per_group: 8,
	qualifiers_per_group: 4,
	sets_to_win: 1,
	legs_per_set: 2,
}

const classicPoolPhase: Omit<GroupPhase, "position"> = {
	tournament_id: "<generated>",
	id: "<generated>",
	type: "round_robin",
	players_per_group: 8,
	qualifiers_per_group: 4,
	sets_to_win: 1,
	legs_per_set: 2,
}

/** Arbre direct : 1/4 (3m) · 1/2 (4m) · Finale (5m) */
const elim3Tiers: Omit<EliminationPhase, "position"> = {
	id: "<generated>",
	tournament_id: "<generated>",
	type: "single_elimination",
	qualifiers_count: 0,
	tiers: [
		{ round: "8", legs: 3 },
		{ round: "4", legs: 4 },
		{ round: "2", legs: 5 },
	],
}

/** Arbre direct : 1/4 (3m) · Finale (4m) */
const elim2Tiers: Omit<EliminationPhase, "position"> = {
	id: "<generated>",
	tournament_id: "<generated>",
	type: "single_elimination",
	qualifiers_count: 0,
	tiers: [
		{ round: "8", legs: 3 },
		{ round: "2", legs: 4 },
	],
}

export type TournamentTemplate = {
	name: string
	category: Category
	start_at_time: string
	/** 0 = event start date, 1 = start date + 1 day, etc. */
	dayOffset?: number
	phases: Omit<Phase, "id" | "tournament_id">[]
}

export type EventTemplate = {
	id: string
	title: string
	durationDays: number
	summary: string
	event: DraftEvent
}

// ── Templates ──────────────────────────────────────────────────────────────

export const EVENT_TEMPLATES: EventTemplate[] = [
	{
		id: "1",
		title: "Tournoi de Comité",
		durationDays: 1,
		summary: "5 tournois · Double, Masculin, Féminin, Vétéran, Junior",
		event: {
			id: "<generated>",
			location: "",
			name: "Tournoi de Comité",
			status: "draft",
			tournaments: [
				{
					id: "<generated>",
					name: "Double",
					category: "double",
					start_at: new Date(2026, 0, 1, 9, 0, 0, 0),
					auto_referee: true,
					check_in_required: true,
					phases: [
						{ ...doubleKOPhase, position: 0 },
						{ ...elim3Tiers, position: 1 },
					],
				},
				{
					name: "Simple Masculin",
					id: "<generated>",
					category: "male",
					start_at: new Date(2026, 0, 1, 15, 0, 0, 0),
					auto_referee: true,
					check_in_required: true,
					phases: [
						{ ...doubleKOPhase, position: 0 },
						{ ...elim3Tiers, position: 1 },
					],
				},
				{
					name: "Simple Féminin",
					category: "female",
					id: "<generated>",
					auto_referee: true,
					check_in_required: true,
					start_at: new Date(2026, 0, 1, 15, 0, 0, 0),
					phases: [
						{ ...doubleKOPhase, position: 0 },
						{ ...elim3Tiers, position: 1 },
					],
				},
				{
					name: "Simple Vétéran",
					id: "<generated>",
					category: "veteran",
					auto_referee: true,
					check_in_required: true,
					start_at: new Date(2026, 0, 1, 15, 0, 0, 0),
					phases: [
						{ ...doubleKOPhase, position: 0 },
						{ ...elim3Tiers, position: 1 },
					],
				},
				{
					name: "Simple Junior",
					id: "<generated>",
					category: "junior",
					auto_referee: true,
					check_in_required: true,
					start_at: new Date(2026, 0, 1, 15, 0, 0, 0),
					phases: [
						{ ...doubleKOPhase, position: 0 },
						{ ...elim3Tiers, position: 1 },
					],
				},
			],
		},
	},
	{
		id: "2",
		title: "Coupe Nationale",
		durationDays: 2,
		summary:
			"6 tournois · 2 jours · Double, Double Féminin, Masculin, Féminin, Vétéran, Junior",
		event: {
			id: "<generated>",
			location: "",
			name: "Coupe Nationale",
			status: "draft",
			tournaments: [
				{
					id: "<generated>",
					name: "Double",
					category: "double",
					auto_referee: true,
					check_in_required: false,
					start_at: new Date(2026, 0, 1, 9, 0, 0, 0),
					phases: [
						{ ...doubleKOPhase, position: 0 },
						{ ...elim3Tiers, position: 1 },
					],
				},
				{
					id: "<generated>",
					name: "Double Féminin",
					category: "double_female",
					auto_referee: true,
					check_in_required: false,
					start_at: new Date(2026, 0, 1, 9, 0, 0, 0),
					phases: [
						{ ...doubleKOPhase, position: 0 },
						{ ...elim3Tiers, position: 1 },
					],
				},
				{
					id: "<generated>",
					name: "Simple Masculin",
					category: "male",
					auto_referee: true,
					check_in_required: false,
					start_at: new Date(2026, 0, 2, 15, 0, 0, 0),
					phases: [
						{
							...elim3Tiers,
							position: 0,
						},
					],
				},
				{
					id: "<generated>",
					name: "Simple Féminin",
					category: "female",
					auto_referee: true,
					check_in_required: false,
					start_at: new Date(2026, 0, 2, 9, 0, 0, 0),
					phases: [
						{
							...elim2Tiers,
							position: 0,
						},
					],
				},
				{
					id: "<generated>",
					name: "Simple Vétéran",
					category: "veteran",
					auto_referee: true,
					check_in_required: false,
					start_at: new Date(2026, 0, 2, 9, 0, 0, 0),
					phases: [{ ...elim2Tiers, position: 0 }],
				},
				{
					id: "<generated>",
					name: "Simple Junior",
					category: "junior",
					auto_referee: true,
					check_in_required: false,
					start_at: new Date(2026, 0, 2, 10, 0, 0, 0),
					phases: [
						{ ...classicPoolPhase, position: 0 },
						{ ...elim2Tiers, position: 1 },
					],
				},
			],
		},
	},
]
