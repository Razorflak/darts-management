import { fileURLToPath } from "node:url"
import { config } from "dotenv"
import { defineConfig } from "vitest/config"

// Charge le .env local avant le démarrage des workers — les workers héritent de process.env
config({ path: new URL(".env", import.meta.url).pathname })

export default defineConfig({
	resolve: {
		alias: {
			// $app/server est un module SvelteKit absent hors front — on le mocke
			"$app/server": fileURLToPath(
				new URL("src/mocks/app-server.ts", import.meta.url),
			),
		},
	},
	test: {
		environment: "node",
		// Séquentiel — les scripts modifient la base, pas de parallélisme
		pool: "forks",
		singleFork: true,
		sequence: { concurrent: false },
	},
})
