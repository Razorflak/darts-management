import type {
	BracketTier,
	Category,
	PhaseType,
} from "$lib/server/schemas/event-schemas"

// Tournament status (ready | check-in | started | finished)
export const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
	ready: "Ouvert",
	"check-in": "Check-in",
	started: "Lancé",
	finished: "Terminé",
}
export const TOURNAMENT_STATUS_COLORS: Record<
	string,
	"green" | "yellow" | "blue" | "gray"
> = {
	ready: "green",
	"check-in": "yellow",
	started: "blue",
	finished: "gray",
}
export const TOURNAMENT_STATUS_NEXT: Record<string, string | null> = {
	ready: "check-in",
	"check-in": "started",
	started: "finished",
	finished: null,
}
export const TOURNAMENT_STATUS_PREV: Record<string, string | null> = {
	ready: null,
	"check-in": "ready",
	started: "check-in",
	finished: "started",
}

// Event status (draft | ready | started | finished)
export const EVENT_STATUS_LABELS: Record<string, string> = {
	draft: "Brouillon",
	ready: "Publié",
	started: "En cours",
	finished: "Terminé",
}
export const EVENT_STATUS_COLORS: Record<
	string,
	"gray" | "green" | "blue" | "indigo"
> = {
	draft: "gray",
	ready: "green",
	started: "blue",
	finished: "indigo",
}
// Variant used on the event detail page
export const EVENT_DETAIL_STATUS_COLORS: Record<
	string,
	"gray" | "green" | "yellow" | "red"
> = {
	draft: "gray",
	ready: "green",
	started: "yellow",
	finished: "red",
}

export const CATEGORY_LABELS: Record<Category, string> = {
	male: "Masculin",
	female: "Féminin",
	junior: "Junior",
	veteran: "Vétéran",
	open: "Ouvert",
	mix: "Mixte",
	double: "Double",
	double_female: "Double Féminin",
	double_mix: "Double Mixte",
}

export const PHASE_TYPE_LABELS: Record<PhaseType, string> = {
	round_robin: "Poules Classique",
	double_loss_groups: "Poules Double KO",
	single_elimination: "Arbre Direct",
	double_elimination: "Double Élimination",
}

export const BRACKET_ROUND_LABELS: Record<BracketTier["round"], string> = {
	4096: "jusqu'en 1/4096",
	2048: "jusqu'en 1/2048",
	1024: "jusqu'en 1/1024",
	512: "jusqu'en 1/512",
	256: "jusqu'en 1/256",
	128: "jusqu'en 1/128",
	64: "jusqu'en 1/64",
	32: "jusqu'en 1/32",
	16: "jusqu'en 1/16",
	8: "jusqu'en 1/8",
	4: "Quarts de finale",
	2: "Demi-finales",
	1: "Finale",
}
