#!/usr/bin/env node
/**
 * Verifies that every image path hardcoded in `src/` actually exists in
 * `public/`.
 *
 * The gallery manifest and the JSON-LD image list name their files as plain
 * strings, so deleting a photo from `public/gallery/` leaves a reference
 * behind that nothing catches: TypeScript sees a valid string, the build
 * succeeds, and the only symptom is a 404 and a blank tile in the carousel at
 * runtime. That has already happened once.
 *
 * Only literal paths are checked. Service photos are resolved at runtime from
 * the service name (see src/lib/service-image.ts) and most of them are
 * genuinely absent by design, so there is no literal to check and nothing
 * here to report.
 *
 *     npm run check:assets
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const PUBLIC = join(ROOT, "public");

/** Absolute-rooted paths ending in an image extension. Template literals
 *  contain `$`/`{`, which the character class excludes, so they never match. */
const IMAGE_REF = /["'`](\/[A-Za-z0-9._\-/]+\.(?:webp|png|jpe?g|svg|avif|gif|ico))["'`]/g;

function walk(dir) {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(full));
        else if (/\.(tsx?|jsx?|mjs|css)$/.test(entry.name)) out.push(full);
    }
    return out;
}

const missing = new Map();
let checked = 0;

for (const file of walk(SRC)) {
    const text = readFileSync(file, "utf8");
    for (const [, ref] of text.matchAll(IMAGE_REF)) {
        // Next.js serves `public/` at the site root, so the reference maps
        // straight onto a path inside it.
        const onDisk = join(PUBLIC, ref);
        checked++;
        if (!existsSync(onDisk) || !statSync(onDisk).isFile()) {
            if (!missing.has(ref)) missing.set(ref, new Set());
            missing.get(ref).add(relative(ROOT, file));
        }
    }
}

const unique = new Set();
for (const file of walk(SRC)) {
    const text = readFileSync(file, "utf8");
    for (const [, ref] of text.matchAll(IMAGE_REF)) unique.add(ref);
}

if (missing.size === 0) {
    console.log(`check:assets — ${unique.size} image paths referenced, all present.`);
    process.exit(0);
}

console.error(`check:assets — ${missing.size} missing file(s) of ${unique.size} referenced:\n`);
for (const [ref, files] of missing) {
    console.error(`  ${ref}`);
    for (const f of files) console.error(`      referenced by ${f}`);
}
console.error(
    `\nEither restore the file in public/, or remove the reference.` +
    ` Left as-is these 404 at runtime.`
);
process.exit(1);
