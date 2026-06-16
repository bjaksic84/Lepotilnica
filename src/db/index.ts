import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// Lazily create the libSQL client on first use rather than at module load.
// This keeps `import { db }` side-effect free, so importing a route during the
// build's page-data collection does not require TURSO_* to be present. The
// client is only created when a query actually runs (i.e. at request time).
let _db: LibSQLDatabase<typeof schema> | null = null;

function getDb(): LibSQLDatabase<typeof schema> {
    if (!_db) {
        const client = createClient({
            url: process.env.TURSO_DATABASE_URL!,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
        _db = drizzle(client, { schema });
    }
    return _db;
}

export const db = new Proxy({} as LibSQLDatabase<typeof schema>, {
    get(_target, prop, receiver) {
        const instance = getDb();
        const value = Reflect.get(instance, prop, receiver);
        return typeof value === "function" ? value.bind(instance) : value;
    },
});
