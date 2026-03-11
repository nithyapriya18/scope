/**
 * PostgreSQL database connection using postgres.js
 */
import postgres from 'postgres';

let sql: ReturnType<typeof postgres> | null = null;

export function getSql() {
  if (sql) {
    return sql;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('🔗 Connecting to PostgreSQL database...');

  sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return sql;
}

export async function closeSql() {
  if (sql) {
    await sql.end();
    sql = null;
  }
}
