import { resolve } from "node:path"
import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { playwright } from "@vitest/browser-playwright"
import { loadEnv } from "vite"
import devtoolsJson from "vite-plugin-devtools-json"
import { defineConfig } from "vitest/config"

// packages/front/ est à 2 niveaux sous la racine du monorepo
const monorepoRoot = resolve(import.meta.dirname, "../..")

export default defineConfig(({ mode }) => {
	return {
		plugins: [
			tailwindcss(),
			sveltekit(),
			devtoolsJson(),
			{
				name: "load-env-into-process",
				// configureServer ne s'exécute qu'au démarrage du serveur dev,
				// jamais pendant vite build — les vars sont donc lues au runtime.
				configureServer() {
					console.log("[vite] loading .env variables into process.env")
					const env = loadEnv(mode, monorepoRoot, "")
					Object.assign(process.env, env)
					console.log(
						"[vite] loaded env variables:",
						Object.keys(env).join(", "),
					)
				},
			},
		],
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
