<script lang="ts">
import {
	Dropdown,
	DropdownDivider,
	DropdownHeader,
	DropdownItem,
	NavBrand,
	Navbar,
	NavHamburger,
	NavLi,
	NavUl,
} from "flowbite-svelte"
import { page } from "$app/state"
import { authClient } from "$lib/auth-client"

let { children, data } = $props()

let activeUrl = $derived(page.url.pathname)

async function handleSignOut() {
	await authClient.signOut()
	window.location.href = "/login"
}
</script>

<Navbar
	class="sticky top-0 z-30 border-b bg-white/95 backdrop-blur"
	style="border-color: var(--color-border);"
>
	<NavBrand href="/">
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
			class="ms-2 hidden text-base font-bold sm:block"
			style="font-family: var(--font-display); color: oklch(18% 0.02 264);"
		>
			FFD Darts
		</span>
	</NavBrand>

	<div class="flex items-center gap-2 md:order-2">
		<!-- Bouton avatar utilisateur -->
		<button
			id="user-menu-btn"
			type="button"
			class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-gray-100"
			style="color: oklch(30% 0.02 264);"
		>
			<span
				class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
				style="background: var(--color-primary-500);"
			>
				{data.user?.name?.charAt(0).toUpperCase() ?? "?"}
			</span>
			<span class="hidden lg:block">{data.user?.name}</span>
		</button>

		<Dropdown triggeredBy="#user-menu-btn" placement="bottom-end" class="w-56">
			<DropdownHeader>
				<span class="block text-sm font-semibold">{data.user?.name}</span>
				<span class="block truncate text-xs text-gray-500"
					>{data.user?.email}</span
				>
			</DropdownHeader>
			<DropdownItem href="/profile">Mon profil</DropdownItem>
			<DropdownDivider />
			<DropdownItem
				onclick={handleSignOut}
				class="text-red-600 hover:bg-red-50 hover:text-red-700"
			>
				Se déconnecter
			</DropdownItem>
		</Dropdown>

		<NavHamburger />
	</div>

	<NavUl {activeUrl} class="order-1">
		<NavLi href="/">Tableau de bord</NavLi>
		{#if data.hasAdminAccess}
			<NavLi href="/admin">Administration</NavLi>
		{/if}
	</NavUl>
</Navbar>

<main class="container mx-auto px-4 py-6 sm:px-6">{@render children()}</main>
