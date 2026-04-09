import {
	getLaunchRepositoryWithSql,
	getTournamentRepositoryWithSql,
	sql,
} from "@darts-management/db"
import {
	assignReferees,
	assignTeamsToPhase0,
	type GeneratorResult,
	generateBracket,
	generateDoubleKoStructure,
	generateRoundRobinStructure,
	PHASE_FORMAT_DEFAULTS,
} from "@darts-management/domain"
import { trace } from "@opentelemetry/api"

type Sql = typeof sql

export const launchTournament = async (
	tournamentId: string,
	userRoles: Array<{ entityId: string; role: string }>,
): Promise<void> => {
	trace.getActiveSpan()?.setAttribute("tournament.id", tournamentId)

	const launchRepo = getLaunchRepositoryWithSql(sql)

	// ── Phase 1 : lectures hors transaction ──────────────────────────────────
	// Pas de verrou — on charge les données pour la génération.
	const tournament = await launchRepo.loadTournamentForLaunch(tournamentId)

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

	const teamIds = await launchRepo.loadActiveRoster(
		tournamentId,
		tournament.check_in_required,
	)

	// ── Génération des matchs (CPU, hors transaction) ─────────────────────────
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

	// Les matchs sont générés avec event_match_id démarrant à 1.
	// L'offset réel (maxEventMatchId) est appliqué dans la transaction.
	const combinedResult: GeneratorResult = {
		matches: [],
		roundRobinInfos: [],
		bracketInfos: [],
	}
	let expectedQualifiers = teamIds.length
	let nextEventMatchId = 1

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
				phase.qualifiers_per_group ?? defaults[phase.type].qualifiers_per_group,
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
					setsToWin: 1, // TODO: mettre les sets dans les tier de bracket
					legsPerSet: tier.legs,
				}
			})
			if (tierConfig.length === 0) {
				throw new Error("single_elimination phase must have tiers config")
			}
			phaseResult = generateBracket({
				mode: "single",
				participantCount: expectedQualifiers,
				phaseId: phase.id,
				tournamentId,
				startEventMatchId: nextEventMatchId,
				tiers: tierConfig,
				defaultFormat: tierConfig[tierConfig.length - 1],
			})
		} else if (phase.type === "double_elimination") {
			const fmt = {
				setsToWin: phase.sets_to_win ?? defaults.single_elimination.setsToWin,
				legsPerSet:
					phase.legs_per_set ?? defaults.single_elimination.legsPerSet,
			}
			phaseResult = generateBracket({
				mode: "double",
				participantCount: expectedQualifiers,
				phaseId: phase.id,
				tournamentId,
				startEventMatchId: nextEventMatchId,
				tiers: [],
				defaultFormat: fmt,
			})
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

	if (tournament.auto_referee) {
		combinedResult.matches = assignReferees(
			combinedResult.matches,
			teamIds,
			true,
		)
	}

	// ── Phase 2 : transaction courte — lock + écriture uniquement ────────────
	await sql.begin(async (rawTx) => {
		const tx = rawTx as unknown as Sql
		const txLaunchRepo = getLaunchRepositoryWithSql(tx)
		const txTournamentRepo = getTournamentRepositoryWithSql(tx)

		// Re-vérifier le statut avec FOR UPDATE pour éviter les lancements concurrents
		const status = await txLaunchRepo.lockTournamentStatus(tournamentId)
		if (status !== "ready" && status !== "check-in") {
			throw new Error("ALREADY_LAUNCHED")
		}

		// Advisory lock sur l'event pour garantir l'unicité des event_match_id
		await tx`SELECT pg_advisory_xact_lock(hashtext(${tournament.event_id}))`

		// Lire le max après le verrou, puis décaler les IDs générés
		const maxEventMatchId = await txLaunchRepo.countEventMatches(
			tournament.event_id,
		)
		if (maxEventMatchId > 0) {
			for (const m of combinedResult.matches) {
				m.event_match_id += maxEventMatchId
			}
		}

		await txLaunchRepo.insertMatches(combinedResult)
		await txTournamentRepo.updateStatus(tournamentId, "started")
	})
}
