import { betterAuth } from "better-auth"
import { admin as adminPlugin } from "better-auth/plugins"
import { sveltekitCookies } from "better-auth/svelte-kit"
import { getRequestEvent } from "$app/server"
import { PostgresJSDialect } from "kysely-postgres-js"
import { createTransport } from "nodemailer"
import { sql } from "./client.js"
import { ac, joueur, organisateur, adminTournoi, adminFederal } from "./permissions.js"

const mailer = createTransport({
	host: process.env["SMTP_HOST"] ?? "localhost",
	port: Number(process.env["SMTP_PORT"] ?? "1025"),
	secure: process.env["SMTP_SECURE"] === "true",
	auth:
		process.env["SMTP_USER"]
			? { user: process.env["SMTP_USER"], pass: process.env["SMTP_PASS"] }
			: undefined,
})

export const auth = betterAuth({
	database: {
		dialect: new PostgresJSDialect({ postgres: sql }),
		type: "postgresql",
		// NOTE: Do NOT use casing: "snake" -- known bug with postgres.js dialect (issue #4789)
		// Better Auth managed tables use camelCase columns; app tables use snake_case separately.
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		sendResetPassword: async ({ user, url }) => {
			void mailer.sendMail({
				from: process.env["EMAIL_FROM"] ?? "noreply@ffd.fr",
				to: user.email,
				subject: "Réinitialisation de votre mot de passe FFD",
				text: `Cliquez sur ce lien pour réinitialiser votre mot de passe : ${url}`,
				html: `<p>Réinitialisez votre mot de passe : <a href="${url}">${url}</a></p>`,
			})
		},
	},
	plugins: [
		adminPlugin({
			ac,
			roles: { joueur, organisateur, adminTournoi, adminFederal },
			defaultRole: "joueur",
			adminRoles: ["admin_federal"],
		}),
		sveltekitCookies(getRequestEvent), // MUST be last -- required for SvelteKit form actions (Pitfall #2)
	],
})
