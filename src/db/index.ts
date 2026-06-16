import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
// Use the fetch-based web client: the default `@libsql/client` resolves to a
// Node transport that calls `https.request`, which is unimplemented on the
// Cloudflare Workers runtime (unenv). The `/web` build talks over `fetch`.
// Note: this only supports remote (libsql://, https://, wss://) URLs — not file:.
import { createClient } from "@libsql/client/web";
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
            // Inject the runtime's native fetch. The hrana HTTP transport
            // otherwise imports `cross-fetch`, which resolves to a Node
            // `https.request` shim that is unimplemented on the Cloudflare
            // Workers runtime. Native fetch works in both workerd and Node 18+.
            fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
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
