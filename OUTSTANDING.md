# Outstanding work

Last updated 25 October 2026. Everything here is either waiting on the domain
going live, waiting on Karin, or deliberately deferred with a trigger.

---

## 1. Launch chain

Ordered — each step depends on the one before it.

- [ ] **Re-attach the custom domain** to the Worker in Cloudflare.
      Fixes three things at once: the apex regains an A record (it currently
      has none, so `https://lepotilnicabykarin.si` fails to connect outright),
      `www` stops 301-ing into a dead end, and the logo in every e-mail starts
      loading — the templates point at `${SITE_URL}/logo.png`, which is correct
      and simply unreachable while the apex is dark.
- [ ] **Check `www.lepotilnicabykarin.si`** → 301 → apex → 200.
      No separate attachment needed; the redirect rule already exists and will
      start landing somewhere real.
- [ ] **Add the website URL to the Google Business Profile.**
      Easy to forget and it gates the March measurement: without it, the
      profile's "website clicks" metric stays meaningless. The existing figure
      of 7 is from a period with no site listed, and briefly a limebooking link.
- [ ] **Flip `workers_dev` back to `false`** in `wrangler.jsonc`, then redeploy.
      It is currently `true` so the site is reachable for testing while the
      domain is detached. Leaving it on means the same content served from two
      origins, which competes with the apex for ranking.
- [ ] **Search Console → Sitemaps → submit `sitemap.xml`.**
      Deliberately held back: the apex can't be fetched yet, so submitting now
      only logs a failure. The property itself is already verified by DNS.
- [ ] **URL Inspection → Request indexing** on the homepage, to prompt the
      first crawl.
- [ ] **Bing Webmaster Tools → import from Google Search Console.**
      If the import doesn't see the Domain property, verify Bing directly by
      CNAME. Avoid the XML-file and meta-tag options — both need the site
      reachable.
- [ ] **Confirm Cloudflare Web Analytics is receiving data** once the domain
      is live. Already configured and waiting.

---

## 2. Waiting on Karin

- [ ] **Service descriptions.** All 46 are empty. Because of that the homepage
      currently prints the *same* sentence under every service — "Odkrijte
      prednosti tega vrhunskega tretmaja." (`HomeContent.tsx:116`). She enters
      these in the admin; no code needed. This is the highest-value SEO work
      available and it costs nothing but her time.
- [ ] **Service photos.** 3 of 46 have one. Purely cosmetic — missing images
      fall back to a gradient with the service's initial, and nothing 404s on
      the homepage or `/services`.

---

## 3. Decisions to make around launch

- [ ] **Database backup.** 25+ real bookings in Turso and nothing in the repo
      backs them up. Losing that table means phoning customers.
- [ ] **Error visibility.** `console.error` reaches `wrangler tail` and nowhere
      else, and nobody runs it. Confirmation e-mails silently failing has
      already happened once (`9e903a9`). Cloudflare Web Analytics covers some
      of this; a periodic look at the Resend dashboard covers the rest.
- [ ] **DMARC is `p=none`** — observing, not protecting, so the domain can be
      spoofed without consequence. Reports already go to Postmark. Read them,
      confirm Resend and Cloudflare Email Routing both align, then move to
      `p=quarantine` with `sp=quarantine`. Don't enforce before reading the
      reports or you risk quarantining legitimate mail.
- [ ] **The early customer's booking.** Still live in the database, and they
      hold a working cancellation link. Honour it or cancel it explicitly.
- [ ] **Check the WhatsApp/SMS link** on the Business Profile. The profile
      shows 43 "chat clicks" over six months, but Google shut native Business
      Profile messaging down in July 2024 — so those are most likely taps on a
      WhatsApp or SMS link, which reach her phone normally. If nothing is
      configured, the metric is a ghost and there's nothing to answer.

---

## 4. March 2027 — the English translation decision

### Why it was deferred

English demand is real but unsized. From the Business Profile search terms,
English accounted for ~420 of 3,262 countable impressions (**13%**), or 7.7%
if you strip out the industry loanwords Slovenian clients also use (BIAB, lash
lift, brow lamination, nails). 13% is a **floor**, not a ceiling: of the ~102
terms hidden below Google's `<15` threshold, roughly 30 are English — a far
higher share than the countable set, which is what you'd expect from a
fragmented long tail. The most convincing signal is in that tail: `nails near
me`, `pedicure near me`, `salon near me`, `nail salon ljubljana`. "Near me" in
English means an English-language phone — a tourist or an expat.

### Why it isn't simply "let the browser translate it"

Tested, not assumed:

| Browser | Slovenian → English |
| --- | --- |
| Chrome (desktop + Android) | **yes** — prompts automatically, fast and accurate |
| Edge | yes (Microsoft Translator supports Slovenian) |
| **Safari — macOS** | **no** — Translate is greyed out. Control test: German (`spiegel.de`) translates fine on the same machine, so this is Slovenian-specific, not a broken install |
| Safari — iOS | almost certainly no, same Apple service. Untested — needs an iPhone |
| Samsung Internet | only after a manual language-pack download |
| In-app browsers (Instagram, Facebook) | usually no translate option at all |

Apple Translate has no Slovenian, even after iOS 27 expanded it to 30
languages. Safari is the default on every iPhone, and iPhones are heavily
represented among exactly the Western European and American tourists in
question. So the gap is real — but it only affects non-Chrome visitors, since
Chrome users already get a good translation for free.

### The two scenarios

**Scenario 1 — full translation**, including the database rows (46 services,
7 categories), both legal pages and the e-mail templates. Requires *both*
thresholds below to be met. Considered unlikely.

**Scenario 2 — do nothing.** Everything else: strong demand but concentrated
in Chrome, or demand that is small or manageable.

A middle option — a single static English page — was considered and rejected:
it informs but doesn't convert, since a Safari visitor would read it and then
hit a booking flow they still can't translate.

### Thresholds, fixed in advance

Set now deliberately, so March isn't an exercise in rationalising whatever the
data happens to show.

| Question | Source | Threshold |
| --- | --- | --- |
| Is there English demand? | Search Console — English queries, impressions, clicks | **50+ English sessions/month** |
| Can they self-translate? | Cloudflare Web Analytics — browser/OS split | **Safari + in-app > 30%** of sessions |
| Is the site a channel at all? | Business Profile → website clicks | under ~30/month and nothing downstream matters |

Scenario 1 needs the first two. Scenario 2 is everything else.

**Caveat:** Cloudflare Web Analytics reports browser and OS but not visitor
language, so you get "Safari share of all traffic" rather than "Safari share of
English traffic". The two sources have to be cross-referenced rather than read
off one number.

### What the arithmetic suggests

At ~1,580 profile views/month and English at 8–13%, with website clicks
landing somewhere near 3% of views, you get roughly 5–25 English visitors a
month, of which maybe 40% are non-Chrome — so **2 to 10 people**. Full i18n
means 46 services in two languages, two legal pages, the e-mail templates, new
admin fields, and Karin maintaining all of it indefinitely. For single digits a
month that isn't close.

Measure anyway. Every input above is a guess, and the site has never been
indexed — once it is, it may attract English queries the profile never saw.

### Why March

Winter is the conservative test: no tourist season inflating the numbers, so
whatever shows up is a floor. And March leaves enough runway to build before
the July peak, which is when all three interaction metrics peak, rather than
scrambling during it.

---

## 5. Known debt

- **Drop the old `no_shows` table — but only after the customer-insight code
  is deployed.** No-shows are now counted from the bookings marked as such
  (`booking_absences`), so the new code never touches it. The code deployed
  before that still reads it on every online booking, so dropping it first
  would break booking.
- **`__drizzle_migrations` is empty in production.** The schema was built with
  `drizzle-kit push`, so no migration has ever been recorded there. Running
  `drizzle-kit migrate` would try to replay `0000` and collide with the
  existing tables. `login_attempts` (0004) and the customer-insight tables
  (0005, applied 25 October 2026) went in by hand for this reason. The next
  schema change needs this resolved one way or the other.
- **Rate limits on bookings, contact and cancel are approximate.** Admin login
  is exact, counted in Turso (`src/lib/login-attempts.ts`). The other three
  rely on the Cloudflare binding, which measurably leaks — 20 requests one
  second apart passed a configured 8-per-60s without a single refusal. See the
  KNOWN LIMITATION block in `src/lib/rate-limit.ts`.

---

## 6. Decided, not forgotten

Recorded so they aren't re-opened by accident.

- **Per-service pages** — dropped until content exists. 46 services with no
  descriptions and 3 photos would be 46 near-identical thin pages, which would
  likely rank worse than the single `/services` page and drag down site-wide
  quality signals.
- **Exact rate limiter on the contact form** — deferred. The honeypot, consent
  checkbox and validation are a reasonable defence. The trigger to revisit
  isn't "is it annoying" but **Resend usage climbing**, because the contact
  form and booking confirmations share one quota: spam at volume would stop
  confirmation e-mails rather than just filling an inbox.
- **Notifications for valid cancellations** — not wanted. A slot freed three
  days out refills itself and Karin is in the calendar several times a day.
  Late-cancellation requests *are* notified, since those are actionable.
- **BIMI / the grey sender avatar in Gmail** — needs a VMC or CMC certificate
  at roughly four figures a year. Not worth it for a 32-pixel circle.
