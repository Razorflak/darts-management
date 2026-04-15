<script lang="ts">
import { page } from "$app/stores"
import { authClient } from "$lib/auth-client"

let { children, data } = $props()

let mobileMenuOpen = $state(false)

async function handleSignOut() {
	await authClient.signOut()
	window.location.href = "/login"
}

function isActive(href: string): boolean {
	if (href === "/") return $page.url.pathname === "/"
	return $page.url.pathname.startsWith(href)
}
</script>

<!-- Navbar -->
<header
	class="sticky top-0 z-30 border-b"
	style="background: oklch(100% 0 0 / 0.95); backdrop-filter: blur(8px); border-color: var(--color-border);"
>
	<div class="container mx-auto flex h-14 items-center gap-4 px-4">
		<!-- Logo -->
		<a href="/" class="mr-2 flex shrink-0 items-center gap-2">
			<div
				class="flex h-7 w-7 items-center justify-center rounded-lg"
				style="background: var(--color-primary-600);"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="white"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-4 w-4"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="10" />
					<circle cx="12" cy="12" r="6" />
					<circle cx="12" cy="12" r="2" />
				</svg>
			</div>
			<span
				class="hidden text-base font-bold sm:block"
				style="font-family: var(--font-display); color: oklch(18% 0.02 264);"
				>FFD Darts</span
			>
		</a>

		<!-- Nav desktop -->
		<nav class="hidden flex-1 items-center gap-1 md:flex">
			<a
				href="/"
				class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
				class:active-nav={isActive("/")}
				style="color: {isActive('/') ? 'var(--color-primary-700)' : 'oklch(45% 0.01 264)'}; background: {isActive('/') ? 'var(--color-primary-50)' : 'transparent'};"
			>
				Tableau de bord
			</a>
			{#if data.hasAdminAccess}
				<a
					href="/admin"
					class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
					style="color: {isActive('/admin') ? 'var(--color-primary-700)' : 'oklch(45% 0.01 264)'}; background: {isActive('/admin') ? 'var(--color-primary-50)' : 'transparent'};"
				>
					Administration
				</a>
			{/if}
		</nav>

		<div class="ml-auto flex items-center gap-2">
			<!-- Menu utilisateur desktop -->
			<div class="relative hidden md:block">
				<button
					type="button"
					id="user-menu-btn"
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-100"
					style="color: oklch(30% 0.02 264);"
				>
					<span
						class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
						style="background: var(--color-primary-500);"
					>
						{data.user?.name?.charAt(0).toUpperCase() ?? "?"}
					</span>
					<span class="hidden lg:block">{data.user?.name}</span>
					<svg
						class="h-4 w-4 opacity-50"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>

				{#if mobileMenuOpen}
					<!-- Overlay pour fermer -->
					<button
						type="button"
						class="fixed inset-0 z-40"
						onclick={() => (mobileMenuOpen = false)}
						aria-label="Fermer le menu"
					></button>

					<!-- Dropdown -->
					<div
						class="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border py-1 shadow-lg"
						style="background: white; border-color: var(--color-border);"
					>
						<div
							class="border-b px-4 py-2.5"
							style="border-color: var(--color-border);"
						>
							<p
								class="text-sm font-semibold"
								style="color: oklch(20% 0.02 264);"
							>
								{data.user?.name}
							</p>
							<p class="truncate text-xs" style="color: oklch(55% 0.01 264);">
								{data.user?.email}
							</p>
						</div>
						<a
							href="/profile"
							onclick={() => (mobileMenuOpen = false)}
							class="flex w-full items-center px-4 py-2 text-sm transition-colors hover:bg-gray-50"
							style="color: oklch(30% 0.02 264);"
						>
							Mon profil
						</a>
						<div
							class="border-t"
							style="border-color: var(--color-border);"
						></div>
						<button
							type="button"
							onclick={handleSignOut}
							class="flex w-full items-center px-4 py-2 text-sm transition-colors hover:bg-red-50"
							style="color: oklch(45% 0.2 25);"
						>
							Se déconnecter
						</button>
					</div>
				{/if}
			</div>

			<!-- Hamburger mobile -->
			<button
				type="button"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
				class="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 md:hidden"
				aria-label="Menu"
			>
				{#if mobileMenuOpen}
					<svg
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				{:else}
					<svg
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile menu -->
	{#if mobileMenuOpen}
		<div class="border-t md:hidden" style="border-color: var(--color-border);">
			<nav class="px-4 py-2">
				<a
					href="/"
					onclick={() => (mobileMenuOpen = false)}
					class="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
					style="color: {isActive('/') ? 'var(--color-primary-700)' : 'oklch(30% 0.02 264)'}; background: {isActive('/') ? 'var(--color-primary-50)' : 'transparent'};"
				>
					Tableau de bord
				</a>
				{#if data.hasAdminAccess}
					<a
						href="/admin"
						onclick={() => (mobileMenuOpen = false)}
						class="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
						style="color: {isActive('/admin') ? 'var(--color-primary-700)' : 'oklch(30% 0.02 264)'}; background: {isActive('/admin') ? 'var(--color-primary-50)' : 'transparent'};"
					>
						Administration
					</a>
				{/if}
			</nav>
			<div
				class="border-t px-4 py-3"
				style="border-color: var(--color-border);"
			>
				<div
					class="mb-2 text-xs font-medium uppercase tracking-wide"
					style="color: oklch(65% 0.01 264);"
				>
					Compte
				</div>
				<div
					class="mb-1 text-sm font-semibold"
					style="color: oklch(20% 0.02 264);"
				>
					{data.user?.name}
				</div>
				<div class="mb-3 text-xs" style="color: oklch(55% 0.01 264);">
					{data.user?.email}
				</div>
				<div class="flex gap-2">
					<a
						href="/profile"
						onclick={() => (mobileMenuOpen = false)}
						class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50"
						style="border-color: var(--color-border); color: oklch(30% 0.02 264);"
					>
						Mon profil
					</a>
					<button
						type="button"
						onclick={handleSignOut}
						class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-red-50"
						style="color: oklch(45% 0.2 25);"
					>
						Se déconnecter
					</button>
				</div>
			</div>
		</div>
	{/if}
</header>

<main class="container mx-auto px-4 py-6 sm:px-6">{@render children()}</main>
