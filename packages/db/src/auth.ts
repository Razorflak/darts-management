import { betterAuth } from "better-auth";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import { PostgresJSDialect } from "kysely-postgres-js";
import { createTransport } from "nodemailer";
import type postgres from "postgres";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

type AuthConfig = {
  smtp: SmtpConfig;
  secret: string;
  baseURL?: string;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createAuth(sql: postgres.Sql, config: AuthConfig) {
  const { smtp } = config;
  const mailer = createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });

  return betterAuth({
    secret: config.secret,
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
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
        });
      },
    },
    plugins: [
      sveltekitCookies(getRequestEvent), // MUST be last -- required for SvelteKit form actions (Pitfall #2)
    ],
  });
}
