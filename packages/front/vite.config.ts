import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { playwright } from "@vitest/browser-playwright"
import { loadEnv } from "vite"
import devtoolsJson from "vite-plugin-devtools-json"
import { defineConfig } from "vitest/config"

export default defineConfig(({ mode }) => {
	// Injecte les variables du fichier .env dans process.env pour que les packages
	// non-SvelteKit (db, auth) puissent y accéder via process.env au runtime dev.
	// En production (Railway), process.env est déjà peuplé par l'hôte.
	const env = loadEnv(mode, process.cwd(), "")
	Object.assign(process.env, env)

	return {
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
	}
})
