import {
	type sql as defaultSql,
	getMatchRepositoryWithSql,
} from "@darts-management/db"
import {
	computePhaseQualifiers,
	type Qualifier,
} from "@darts-management/domain"

type Sql = typeof defaultSql

/**
 * Charge les matches d'une phase depuis la DB et calcule les qualifiants.
 * Orchestration : DB (données brutes) → domain (logique de classement et d'entrelacement).
 */
export async function loadPhaseQualifiers(
	tx: Sql,
	phaseId: string,
	qualifiersPerGroup: number,
): Promise<Qualifier[]> {
	const matchRepo = getMatchRepositoryWithSql(tx)
	const matches = await matchRepo.getPhaseMatchesForQualifiers(phaseId)
	return computePhaseQualifiers(matches, qualifiersPerGroup)
}
