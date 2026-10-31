import dotenv from "dotenv";

dotenv.config({ path: new URL("./.env", import.meta.url) });

export function databaseConfig(env = process.env, { direct = false } = {}) {
  const schema = env.DB_SCHEMA;
  if (schema && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error("Invalid DB_SCHEMA");
  }
  const connectionString =
    (direct && env.DIRECT_DATABASE_URL) || env.DATABASE_URL;
  if (connectionString) {
    try {
      const url = new URL(connectionString);
      if (
        !["postgres:", "postgresql:"].includes(url.protocol) ||
        !url.hostname
      ) {
        throw new Error();
      }
    } catch {
      throw new Error(
        "Database connection URL must be a valid PostgreSQL URL.",
      );
    }
  }
  return {
    ...(connectionString
      ? { connectionString }
      : {
          host: env.DB_HOST,
          user: env.DB_USER,
          password: env.DB_PASSWORD,
          port: env.DB_PORT,
          database: env.DB_NAME,
        }),
    // SSL settings come from the URL, including Neon's sslmode parameter.
    enableChannelBinding: true,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 5,
    ...(schema ? { options: `-c search_path=${schema}` } : {}),
  };
}
