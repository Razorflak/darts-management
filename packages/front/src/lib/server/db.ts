// Server-only — never import this from +page.svelte or +layout.svelte
// sql est initialisé dans @darts-management/db depuis process.env.DATABASE_URL
export { sql } from "@darts-management/db"
