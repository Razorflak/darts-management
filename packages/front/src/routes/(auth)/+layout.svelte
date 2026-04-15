<script lang="ts">
let { children } = $props()
</script>

<div
	class="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12"
>
	<!-- Fond dégradé subtil -->
	<div
		class="pointer-events-none absolute inset-0 -z-10"
		style="background: radial-gradient(ellipse 80% 60% at 50% -10%, oklch(92% 0.06 264 / 0.5), transparent), oklch(98% 0.005 264);"
	></div>

	<!-- Motif de grille discrète -->
	<div
		class="pointer-events-none absolute inset-0 -z-10 opacity-30"
		style="background-image: linear-gradient(oklch(85% 0.01 264 / 0.5) 1px, transparent 1px), linear-gradient(90deg, oklch(85% 0.01 264 / 0.5) 1px, transparent 1px); background-size: 40px 40px;"
	></div>

	<div class="w-full max-w-md">
		<!-- Logo FFD -->
		<div class="mb-8 text-center">
			<div class="inline-flex items-center gap-2">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-xl"
					style="background: var(--color-primary-600);"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="white"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="h-5 w-5"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="10" />
						<circle cx="12" cy="12" r="6" />
						<circle cx="12" cy="12" r="2" />
					</svg>
				</div>
				<span
					class="text-xl font-bold"
					style="font-family: var(--font-display); color: oklch(20% 0.02 264);"
					>FFD Darts</span
				>
			</div>
		</div>

		{@render children()}
	</div>
</div>
