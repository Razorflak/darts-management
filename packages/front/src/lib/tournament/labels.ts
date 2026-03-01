import type { Category, PhaseType, BracketRound } from './types.js'

export const CATEGORY_LABELS: Record<Category, string> = {
	male: 'Masculin',
	female: 'Féminin',
	junior: 'Junior',
	veteran: 'Vétéran',
	open: 'Ouvert',
	mix: 'Mixte',
	double: 'Double',
	double_female: 'Double Féminin',
	double_mix: 'Double Mixte',
}

export const PHASE_TYPE_LABELS: Record<PhaseType, string> = {
	round_robin: 'Poules Classique',
	double_loss_groups: 'Poules Double KO',
	single_elim: 'Arbre Direct',
	double_elim: 'Double Élimination',
}

export const BRACKET_ROUND_LABELS: Record<BracketRound, string> = {
	4096: "jusqu'en 1/4096",
	2048: "jusqu'en 1/2048",
	1024: "jusqu'en 1/1024",
	512: "jusqu'en 1/512",
	256: "jusqu'en 1/256",
	128: "jusqu'en 1/128",
	64: "jusqu'en 1/64",
	32: "jusqu'en 1/32",
	16: "jusqu'en 1/16",
	8: 'Quarts de finale',
	4: 'Demi-finales',
	2: 'Finale',
}
