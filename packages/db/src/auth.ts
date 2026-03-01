import { betterAuth } from "better-auth"
import { admin as adminPlugin } from "better-auth/plugins"
import { sveltekitCookies } from "better-auth/svelte-kit"
import { getRequestEvent } from "$app/server"
import { PostgresJSDialect } from "kysely-postgres-js"
import { createTransport } from "nodemailer"
import type postgres from "postgres"
import { ac, joueur, organisateur, adminTournoi, adminFederal } from "./permissions.js"

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user?: string
  pass?: string
  from: string
}

export function createAuth(sql: postgres.Sql, smtp: SmtpConfig): ReturnType<typeof betterAuth> {
  const mailer = createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  })

  return betterAuth({
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
          from: smtp.from,
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
}
