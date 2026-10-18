import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloudflare build output and local wrangler state. Both are generated and
    // gitignored, but eslint-config-next doesn't know about them: after any
    // `npm run deploy` the bundled worker in .open-next alone reported 713
    // errors, which drowns out everything in src/ and makes lint worthless.
    ".open-next/**",
    ".wrangler/**",
  ]),
]);

export default eslintConfig;
