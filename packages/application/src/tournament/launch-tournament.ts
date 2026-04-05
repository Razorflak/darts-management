import {
	getLaunchRepositoryWithSql,
	getTournamentRepositoryWithSql,
	sql,
} from "@darts-management/db"
import {
	assignReferees,
	assignTeamsToPhase0,
	type GeneratorResult,
	generateDoubleKoStructure,
	generateRoundRobinStructure,
	generateSingleEliminationStructure,
	PHASE_FORMAT_DEFAULTS,
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

		// Helper: compute how many teams qualify out of a phase
		function computePhaseQualifiers(
			phase: (typeof tournament.phases)[number],
			teamCount: number,
		): number {
			if (phase.type === "round_robin" || phase.type === "double_loss_groups") {
				const nbGroups = Math.ceil(teamCount / (phase.players_per_group ?? 4))
				return nbGroups * (phase.qualifiers_per_group ?? 1)
			}
			if (phase.type === "single_elimination") {
				return phase.qualifiers_count ?? 0
			}
			return 0
		}

		// 7. Generate matches for each phase in order
		const combinedResult: GeneratorResult = {
			matches: [],
			roundRobinInfos: [],
			bracketInfos: [],
		}
		let expectedQualifiers = teamIds.length

		for (
			let phaseIndex = 0;
			phaseIndex < tournament.phases.length;
			phaseIndex++
		) {
			const phase = tournament.phases[phaseIndex]
			const defaults = PHASE_FORMAT_DEFAULTS

			let phaseResult: GeneratorResult = {
				matches: [],
				roundRobinInfos: [],
				bracketInfos: [],
			}

			if (phase.type === "round_robin") {
				phaseResult = generateRoundRobinStructure(
					expectedQualifiers,
					phase.players_per_group ?? defaults[phase.type].playersPerGroup,
					phase.id,
					tournamentId,
					nextEventMatchId,
					{
						setsToWin: phase.sets_to_win ?? defaults[phase.type].setsToWin,
						legsPerSet: phase.legs_per_set ?? defaults[phase.type].legsPerSet,
					},
				)
			} else if (phase.type === "double_loss_groups") {
				phaseResult = generateDoubleKoStructure(
					expectedQualifiers,
					phase.players_per_group ?? defaults[phase.type].playersPerGroup,
					phase.qualifiers_per_group ??
						defaults[phase.type].qualifiers_per_group,
					phase.id,
					tournamentId,
					nextEventMatchId,
					{
						setsToWin: phase.sets_to_win ?? defaults[phase.type].setsToWin,
						legsPerSet: phase.legs_per_set ?? defaults[phase.type].legsPerSet,
					},
				)
			} else if (phase.type === "single_elimination") {
				const rawTiers = phase.tiers
				const tiers = Array.isArray(rawTiers) ? rawTiers : []
				const tierConfig = tiers.map((t: unknown, i: number) => {
					const tier = t as Record<string, number>
					return {
						round: i,
						setsToWin: 1, //TODO: ARV quand mise en place du nombre de sets à gagner spécifique par tier
						legsPerSet: tier.legs,
					}
				})
				const effectiveTiers = tierConfig
				if (tierConfig.length === 0) {
					throw new Error("single_elimination phase must have tiers config")
				}

				phaseResult = generateSingleEliminationStructure(
					expectedQualifiers,
					phase.id,
					tournamentId,
					nextEventMatchId,
					effectiveTiers,
				)
			} else if (phase.type === "double_elimination") {
				throw new Error(
					"double_elimination phase type not supported yet — deferred",
				)
			}

			if (phaseIndex === 0) {
				phaseResult = assignTeamsToPhase0(phaseResult, teamIds)
			}

			expectedQualifiers = computePhaseQualifiers(phase, expectedQualifiers)
			nextEventMatchId += phaseResult.matches.length

			combinedResult.matches.push(...phaseResult.matches)
			combinedResult.roundRobinInfos.push(...phaseResult.roundRobinInfos)
			combinedResult.bracketInfos.push(...phaseResult.bracketInfos)
		}

		// 8. Assign referees (stub — sera retravaillé)
		if (tournament.auto_referee) {
			combinedResult.matches = assignReferees(
				combinedResult.matches,
				teamIds,
				true,
			)
		}

		// 9. Insert all matches and info rows
		await launchRepo.insertMatches(combinedResult)

		// 10. Update tournament status to 'started'
		await tournamentRepo.updateStatus(tournamentId, "started")
	})
}
