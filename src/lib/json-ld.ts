/**
 * Serialize a value for inlining inside a <script type="application/ld+json">
 * tag via dangerouslySetInnerHTML. Plain JSON.stringify does NOT escape `<`, so
 * a value containing `</script>` could break out of the script context and
 * inject markup. Escaping `<`, `>` and `&` closes that vector — cheap insurance
 * even while the structured data is static. (The ld+json body is not executed as
 * JavaScript, so the U+2028/U+2029 concern that affects inline JS does not apply
 * here; `<` is the only real breakout character.)
 */
export function jsonLdScript(data: unknown): string {
    return JSON.stringify(data)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026");
}
