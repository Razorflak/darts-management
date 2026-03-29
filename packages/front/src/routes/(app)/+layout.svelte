<script lang="ts">
import {
	Navbar,
	NavBrand,
	NavHamburger,
	NavUl,
	NavLi,
	Avatar,
	Dropdown,
	DropdownItem,
	DropdownDivider,
} from "flowbite-svelte"
import { page } from "$app/stores"
import { authClient } from "$lib/auth-client"

let { children, data } = $props()

async function handleSignOut() {
	await authClient.signOut()
	window.location.href = "/login"
}
</script>

<Navbar>
	{#snippet children({ toggle })}
		<NavBrand href="/">
			<span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
				FFD Darts
			</span>
		</NavBrand>
		<div class="flex items-center gap-2 md:order-2">
			<Avatar id="user-menu" class="cursor-pointer" />
			<Dropdown triggeredBy="#user-menu">
				<div class="px-4 py-3 text-sm text-gray-900 dark:text-white">
					<div class="font-medium">{data.user?.name}</div>
					<div class="truncate text-gray-500">{data.user?.email}</div>
				</div>
				<DropdownDivider />
				<DropdownItem href="/profile">Mon profil</DropdownItem>
				<DropdownDivider />
				<DropdownItem onclick={handleSignOut}>Se déconnecter</DropdownItem>
			</Dropdown>
			<NavHamburger onclick={toggle} />
		</div>
		<NavUl activeUrl={$page.url.pathname}>
			<NavLi href="/">Tableau de bord</NavLi>
			{#if data.hasAdminAccess}
				<NavLi href="/admin">Administration</NavLi>
			{/if}
		</NavUl>
	{/snippet}
</Navbar>

<main class="container mx-auto px-4 py-6">
	{@render children()}
</main>
