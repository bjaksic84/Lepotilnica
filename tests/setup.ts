import { TEST_DB_URL } from "./helpers/test-db";

/**
 * Runs before the test modules are imported, so `src/db/index.ts` resolves the
 * temporary file rather than the production Turso instance. That module reads
 * the variable lazily, on first query, but setting it here removes any
 * question of ordering.
 */
process.env.TURSO_DATABASE_URL = TEST_DB_URL;
process.env.TURSO_AUTH_TOKEN = "";
