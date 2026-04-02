import {
	getLaunchRepositoryWithSql,
	getTournamentRepositoryWithSql,
	sql,
} from "@darts-management/db"
import {
	assignReferees,
	generateDoubleKoGroupMatches,
	generateRoundRobinMatches,
	generateSingleEliminationBracket,
	type MatchInsertRow,
	snakeDistribute,
} from "@darts-management/domain"

type Sql = typeof sql

export async function launchTournament(
	tournamentId: string,
	userRoles: Array<{ entityId: string; role: string }>,
): Promise<void> {
	await sql.begin(async (rawTx) => {
		const tx = rawTx as unknown as Sql
		const launchRepo = getLaunchRepositoryWithSql(tx)
		const tournamentRepo = getTournamentRepositoryWithSql(tx)

		// 1. Load tournament (FOR UPDATE) — includes entity_id from joined event table
		const tournament = await launchRepo.loadTournamentForLaunch(tournamentId)

		// 2. Authz: check user has admin role on tournament's entity
		const hasAccess = userRoles.some(
			(r) =>
				r.entityId === tournament.entity_id &&
				[
					"adminTournoi",
					"adminClub",
					"adminComite",
					"adminLigue",
					"adminFederal",
				].includes(r.role),
		)
		if (!hasAccess) throw new Error("Forbidden")

		// 3. Advisory lock on event to prevent concurrent launches with overlapping event_match_id
		await tx`SELECT pg_advisory_xact_lock(hashtext(${tournament.event_id}))`

		// 4. Guard: status must be 'ready' or 'check-in' — LAUNCH-01 lock enforcement
		if (tournament.status !== "ready" && tournament.status !== "check-in") {
			throw new Error("ALREADY_LAUNCHED")
		}

		// 5. Load active roster
		let teamIds = await launchRepo.loadActiveRoster(
			tournamentId,
			tournament.check_in_required,
		)

		// Apply seed order if seeded
		if (tournament.is_seeded && tournament.seed_order.length > 0) {
			const seedSet = new Set(tournament.seed_order)
			const unseeded = teamIds.filter((id) => !seedSet.has(id))
			teamIds = [
				...tournament.seed_order.filter((id) => teamIds.includes(id)),
				...unseeded,
			]
		}

		// 6. Get current event_match_id offset
		const maxEventMatchId = await launchRepo.countEventMatches(
			tournament.event_id,
		)
		let nextEventMatchId = maxEventMatchId + 1

		// 7. Generate matches for each phase in order
		const allMatches: MatchInsertRow[] = []
		const currentTeamIds = teamIds

		for (const phase of tournament.phases) {
			let phaseMatches: MatchInsertRow[] = []

			if (phase.type === "round_robin") {
				const groupCount = Math.ceil(
					currentTeamIds.length / (phase.players_per_group ?? 4),
				)
				const groups = snakeDistribute(
					currentTeamIds,
					groupCount,
					phase.players_per_group ?? 4,
				)
				phaseMatches = generateRoundRobinMatches(
					groups,
					phase.id,
					nextEventMatchId,
					{
						setsToWin: phase.sets_to_win ?? 2,
						legsPerSet: phase.legs_per_set ?? 3,
					},
				)
			} else if (phase.type === "double_loss_groups") {
				const groupCount = Math.ceil(
					currentTeamIds.length / (phase.players_per_group ?? 4),
				)
				const groups = snakeDistribute(
					currentTeamIds,
					groupCount,
					phase.players_per_group ?? 4,
				)
				for (let g = 0; g < groups.length; g++) {
					const groupMatches = generateDoubleKoGroupMatches(
						groups[g],
						g,
						phase.id,
						nextEventMatchId + phaseMatches.length,
						{
							setsToWin: phase.sets_to_win ?? 2,
							legsPerSet: phase.legs_per_set ?? 3,
						},
					)
					phaseMatches.push(...groupMatches)
				}
			} else if (phase.type === "single_elimination") {
				const rawTiers = phase.tiers
				const tiers = Array.isArray(rawTiers) ? rawTiers : []
				const tierConfig = tiers.map((t: unknown, i: number) => {
					const tier = t as Record<string, number>
					return {
						round: i,
						setsToWin: tier.sets_to_win ?? tier.legs ?? phase.sets_to_win ?? 2,
						legsPerSet: tier.legs_per_set ?? phase.legs_per_set ?? 3,
					}
				})
				const slotCount = phase.qualifiers_count ?? currentTeamIds.length
				const teamIdsForBracket =
					currentTeamIds.length > 0 && currentTeamIds.length <= slotCount
						? currentTeamIds
						: []
				phaseMatches = generateSingleEliminationBracket(
					teamIdsForBracket,
					phase.id,
					nextEventMatchId,
					tierConfig,
				)
			} else if (phase.type === "double_elimination") {
				// EXPLICIT GUARD: double_elimination is deferred to Phase 5+
				throw new Error(
					"double_elimination phase type not supported in Phase 4 — deferred to Phase 5",
				)
			}

			nextEventMatchId += phaseMatches.length
			allMatches.push(...phaseMatches)
		}

		// 8. Assign referees if auto_referee enabled
		const finalMatches = tournament.auto_referee
			? assignReferees(allMatches, teamIds, true)
			: allMatches

		// 9. Insert all matches
		await launchRepo.insertMatches(finalMatches)

		// 10. Update tournament status to 'started'
		await tournamentRepo.updateStatus(tournamentId, "started")
	})
}
