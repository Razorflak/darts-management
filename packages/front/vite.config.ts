import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { playwright } from "@vitest/browser-playwright"
import devtoolsJson from "vite-plugin-devtools-json"
import { defineConfig } from "vitest/config"

// Oui, dotenv casse un peu le système de svelte pour la gestion des variable d'env, mais j'ai besoin de ces variable dans d'autre package (notamment db et auth) et c'est plus simple de les exporter dans process.env un fois que de trouver un moyen de les faire passe de svelte au reste
import "dotenv/config"

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	server: {
		allowedHosts: ["sveltekit-production.up.railway.app", "localhost"],
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: "./vite.config.ts",
				test: {
					name: "client",
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: "chromium", headless: true }],
					},
					include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
					exclude: ["src/lib/server/**"],
				},
			},

			{
				extends: "./vite.config.ts",
				test: {
					name: "server",
					environment: "node",
					include: ["src/**/*.{test,spec}.{js,ts}"],
					exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
				},
			},
		],
	},
})
