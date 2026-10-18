import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
            /**
             * src/db/index.ts imports the fetch-based `/web` build, which only
             * speaks to remote hosts (libsql://, https://, wss://) — it cannot
             * open a local file. Swapping it for the default build in tests
             * lets the real `db` module run unmodified against a temporary
             * SQLite file, so the code under test is the code that ships
             * rather than a mock standing in for it. The two builds expose the
             * same API, and the default one ignores the extra `fetch` option
             * src/db passes for the Workers runtime.
             */
            "@libsql/client/web": "@libsql/client",
        },
    },
    test: {
        environment: "node",
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.test.ts"],
        // The concurrency tests share one SQLite file and assert on absolute
        // row counts, so they must not run beside each other.
        fileParallelism: false,
        testTimeout: 30_000,
    },
});
