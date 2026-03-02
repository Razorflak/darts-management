<script lang="ts">
	import type { EventData, Tournament, GroupPhase, EliminationPhase, Phase } from '../types.js'
	import { CATEGORY_LABELS, PHASE_TYPE_LABELS, BRACKET_ROUND_LABELS } from '../labels.js'
	import { Badge, Button, Card } from 'flowbite-svelte'

	function isGroupPhase(p: Phase): p is GroupPhase {
		return p.type === 'round_robin' || p.type === 'double_loss_groups'
	}
	function isEliminationPhase(p: Phase): p is EliminationPhase {
		return p.type === 'single_elim' || p.type === 'double_elim'
	}

	type Props = {
		event: EventData
		tournaments: Tournament[]
		onPrev: () => void
		onPublish: () => void
		publishError?: string
		eventStatus?: 'draft' | 'ready' | 'started'
	}

	let { event, tournaments, onPrev, onPublish, publishError, eventStatus }: Props = $props()

	function formatDate(date: string, time?: string): string {
		if (!date) return '—'
		const d = new Date(`${date}T${time || '00:00'}`)
		return (
			d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
			(time ? ` ${time}` : '')
		)
	}
</script>

<div class="space-y-6">
	<!-- Recap card -->
	<Card class="space-y-0">
		<h2 class="mb-5 font-semibold text-gray-900">Récapitulatif</h2>

		<!-- Event -->
		<div class="mb-5">
			<p class="font-semibold text-gray-800">{event.name || '—'}</p>
			<p class="mt-1 text-sm text-gray-500">
				{formatDate(event.startDate, event.startTime)} → {formatDate(event.endDate)}
				· {event.location || '—'}
			</p>
			{#if event.entity}
				<p class="mt-0.5 text-sm text-gray-400">{event.entity}</p>
			{/if}
		</div>

		<!-- Tournaments tree -->
		{#if tournaments.length > 0}
			<ul class="space-y-5 border-l-2 border-gray-100 pl-4">
				{#each tournaments as t}
					<li>
						<div class="flex flex-wrap items-baseline gap-2">
							<span class="font-medium text-gray-700">
								{t.name || 'Tournoi sans nom'}
							</span>
							{#if t.category}
								<Badge color="blue" rounded>{CATEGORY_LABELS[t.category]}</Badge>
							{/if}
							<span class="text-sm text-gray-400">{t.quota} places</span>
						</div>
						{#if t.startTime}
							<p class="mt-0.5 text-sm text-gray-400">{t.startTime}</p>
						{/if}

						<!-- Phases -->
						{#if t.phases.length > 0}
							<ul class="mt-3 space-y-1.5 border-l border-gray-100 pl-4">
								{#each t.phases as phase}
									<li class="text-sm">
										<span class="font-medium text-gray-700">
											{PHASE_TYPE_LABELS[phase.type]}
										</span>
										{#if isGroupPhase(phase)}
											<span class="text-gray-500">
												— {phase.playersPerGroup} joueurs/poule · {phase.qualifiers} qualifié{phase.qualifiers > 1 ? 's' : ''}/poule
											</span>
										{:else if isEliminationPhase(phase)}
											{#if phase.qualifiers}
												<span class="text-gray-500">
													— {phase.qualifiers} qualifié{phase.qualifiers > 1 ? 's' : ''} pour la suite
												</span>
											{/if}
											{#if phase.tiers.length > 0}
												<ul class="mt-1 space-y-0.5 pl-4">
													{#each phase.tiers as tier}
														<li class="text-sm text-gray-400">
															{BRACKET_ROUND_LABELS[tier.round]} · {tier.legs} manche{tier.legs > 1 ? 's' : ''}
														</li>
													{/each}
												</ul>
											{/if}
										{/if}
									</li>
								{/each}
							</ul>
						{:else}
							<p class="mt-1 pl-4 text-sm italic text-gray-400">Aucune phase configurée</p>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="italic text-gray-400">Aucun tournoi configuré</p>
		{/if}
	</Card>

	{#if publishError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
			{publishError}
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex justify-between pt-2">
		<Button color="alternative" pill onclick={onPrev}>← Modifier</Button>
		{#if eventStatus === 'ready' || eventStatus === 'started'}
			<p class="text-sm text-gray-500">
				Cet événement est publié. Utilisez "Enregistrer" pour mettre à jour le contenu.
			</p>
		{:else}
			<Button color="blue" pill onclick={onPublish}>Publier</Button>
		{/if}
	</div>
</div>
