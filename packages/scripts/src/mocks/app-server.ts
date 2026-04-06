// Mock minimal de $app/server pour permettre l'import de @darts-management/db
// hors contexte SvelteKit (scripts / vitest Node).
export const getRequestEvent = (): null => null
