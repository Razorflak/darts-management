import postgres from "postgres";

export function createSql(databaseUrl: string): postgres.Sql {
  return postgres(databaseUrl);
}
