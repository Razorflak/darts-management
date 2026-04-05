import type { MatchInsertRow } from "../match-schemas.js"

/**
 * Assign referees to matches.
 *
 * NOTE: Cette implémentation est un stub temporaire.
 * La logique d'assignation dépend du nombre de cibles disponibles par groupe/phase
 * et sera retravaillée dans une phase ultérieure.
 *
 * Pour l'instant, retourne les matchs sans modification des referee_team_id.
 */
export function assignReferees(
	matches: MatchInsertRow[],
	_allTeamIds: string[],
	_autoReferee: boolean,
): MatchInsertRow[] {
	return matches
}
