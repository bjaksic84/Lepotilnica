import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS, BUSINESS_ADDRESS_LINE, SITE_NAME, SITE_URL } from "@/lib/site";
import { jsonLdScript } from "@/lib/json-ld";

/**
 * Privacy notice (politika zasebnosti).
 *
 * The booking form collects a name, e-mail address and phone number, which
 * makes a GDPR Art. 13 notice mandatory before launch. The content below
 * describes what the application actually does — the tables in
 * `src/db/schema.ts` and the third-party processors the app talks to.
 *
 * If the booking flow starts collecting a new field, or a processor is added or
 * swapped, update the relevant section here at the same time and bump
 * LAST_UPDATED — a notice that no longer matches the code is worse than none.
 */
export const metadata: Metadata = {
    title: "Politika zasebnosti",
    description:
        "Kako Lepotilnica by Karin zbira, uporablja in varuje vaše osebne podatke pri spletnem naročanju na termine.",
    alternates: { canonical: "/zasebnost" },
    openGraph: {
        title: `Politika zasebnosti — ${SITE_NAME}`,
        description: "Kako ravnamo z vašimi osebnimi podatki.",
        url: "/zasebnost",
    },
};

/** Last substantive revision of this notice — shown to users, so keep it honest. */
const LAST_UPDATED = "28. julij 2026";

const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
        { "@type": "ListItem", position: 1, name: "Domov", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Politika zasebnosti", item: `${SITE_URL}/zasebnost` },
    ],
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mt-12">
            <h2 className="text-2xl md:text-3xl font-playfair font-bold text-charcoal mb-4 leading-tight">
                {title}
            </h2>
            <div className="space-y-4 text-charcoal/70 leading-relaxed font-light">{children}</div>
        </section>
    );
}

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-porcelain pt-32 pb-24">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }}
            />

            <div className="container mx-auto px-4 max-w-3xl">
                <div className="w-12 h-px bg-gold mb-6" />
                <h1 className="text-4xl md:text-5xl font-playfair font-bold text-charcoal leading-[1.05]">
                    Politika zasebnosti
                </h1>
                <p className="mt-4 text-charcoal/50 text-sm">
                    Zadnja posodobitev: {LAST_UPDATED}
                </p>

                <Section title="Kdo upravlja vaše podatke">
                    <p>
                        Upravljavec osebnih podatkov je {SITE_NAME}, {BUSINESS_ADDRESS_LINE}, Slovenija.
                    </p>
                    <p>
                        Glede zasebnosti nas kadar koli kontaktirajte na{" "}
                        <a href={`mailto:${BUSINESS.email}`} className="text-gold-dark underline underline-offset-4 hover:text-gold">
                            {BUSINESS.email}
                        </a>{" "}
                        ali po telefonu na{" "}
                        <a href={`tel:${BUSINESS.phone}`} className="text-gold-dark underline underline-offset-4 hover:text-gold">
                            {BUSINESS.phoneDisplay}
                        </a>.
                    </p>
                    {/* Registration details — required of a trader by ZEPT. */}
                    <p className="text-charcoal/50 text-sm">
                        Matična številka: 7543794000 · Davčna številka: 88960587
                    </p>
                </Section>

                <Section title="Katere podatke zbiramo">
                    <p>Ob spletni rezervaciji termina zbiramo samo tisto, kar potrebujemo za izvedbo storitve:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong className="text-charcoal font-medium">Ime in priimek</strong> — da vemo, koga pričakujemo.</li>
                        <li><strong className="text-charcoal font-medium">E-poštni naslov</strong> — za potrditev rezervacije in povezavo za odpoved.</li>
                        <li><strong className="text-charcoal font-medium">Telefonska številka</strong> — če vas moramo glede termina nujno obvestiti.</li>
                        <li><strong className="text-charcoal font-medium">Podatki o rezervaciji</strong> — izbrane storitve, datum in ura ter morebitne opombe, ki nam jih posredujete.</li>
                    </ul>
                    <p>
                        Če se na dogovorjeni termin ne zglasite in nas o tem ne obvestite, si zabeležimo, da je do
                        neprihoda prišlo. To evidenco vodimo izključno zato, da lahko pri ponavljajočih se neprihodih
                        omejimo spletno naročanje — podatkov ne uporabljamo za noben drug namen.
                    </p>
                    <p>
                        Ne zbiramo podatkov o plačilnih karticah — plačilo poteka v salonu. Prav tako ne uporabljamo
                        piškotkov za oglaševanje ali sledenje in nimamo vgrajenih orodij za spletno analitiko.
                        Edini piškotek, ki ga stran nastavi, je prijavni piškotek za skrbniški del strani, ki ga
                        obiskovalci ne uporabljajo. Vaš napredek pri izpolnjevanju rezervacije se začasno shrani
                        v vaš brskalnik (localStorage), da ob osvežitvi strani ne izgubite vnesenih podatkov;
                        ti podatki ostanejo na vaši napravi.
                    </p>
                </Section>

                <Section title="Zakaj podatke obdelujemo in na kateri podlagi">
                    <p>
                        Vaše podatke obdelujemo za izvedbo rezervacije, ki ste jo zahtevali — pravna podlaga je
                        izvajanje pogodbe oziroma ukrepi na vašo zahtevo pred sklenitvijo pogodbe (člen 6(1)(b)
                        Splošne uredbe o varstvu podatkov).
                    </p>
                    <p>
                        Evidenco neprihodov vodimo na podlagi našega zakonitega interesa (člen 6(1)(f)), da
                        zmanjšamo izgubo terminov, ki bi jih lahko koristile druge stranke.
                    </p>
                    <p>
                        Vaših podatkov ne uporabljamo za pošiljanje reklamnih sporočil in vas brez vaše izrecne
                        privolitve ne bomo vpisali na noben seznam prejemnikov novic.
                    </p>
                </Section>

                <Section title="Komu podatke posredujemo">
                    <p>
                        Podatkov ne prodajamo in jih ne posredujemo tretjim osebam za njihove lastne namene.
                        Za delovanje spletne strani uporabljamo naslednje ponudnike, ki podatke obdelujejo
                        izključno po naših navodilih:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong className="text-charcoal font-medium">Cloudflare</strong> — gostovanje spletne strani in zaščita pred zlorabami.</li>
                        <li><strong className="text-charcoal font-medium">Turso</strong> — podatkovna baza, v kateri so shranjene rezervacije.</li>
                        <li><strong className="text-charcoal font-medium">Resend</strong> — pošiljanje potrditvenih e-sporočil.</li>
                    </ul>
                    <p>
                        Nekateri od teh ponudnikov lahko podatke obdelujejo tudi zunaj Evropskega gospodarskega
                        prostora. V takih primerih prenos poteka na podlagi standardnih pogodbenih klavzul, ki jih
                        je odobrila Evropska komisija.
                    </p>
                </Section>

                <Section title="Kako dolgo podatke hranimo">
                    <p>
                        Podatke o rezervacijah hranimo toliko časa, kolikor je potrebno za vodenje evidence
                        obiskov in izpolnjevanje davčnih ter računovodskih obveznosti. Ko razlog za hrambo
                        preneha, podatke izbrišemo.
                    </p>
                    <p>
                        Če želite, da vaše podatke izbrišemo prej, nam to sporočite — zahtevo bomo izpolnili,
                        razen v delu, kjer nas hramba zavezuje po zakonu.
                    </p>
                </Section>

                <Section title="Vaše pravice">
                    <p>V zvezi s svojimi osebnimi podatki imate pravico:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>zahtevati dostop do podatkov, ki jih hranimo o vas;</li>
                        <li>zahtevati popravek netočnih podatkov;</li>
                        <li>zahtevati izbris podatkov;</li>
                        <li>zahtevati omejitev obdelave ali ji ugovarjati;</li>
                        <li>zahtevati prenos podatkov v strojno berljivi obliki.</li>
                    </ul>
                    <p>
                        Za uveljavitev katere koli od teh pravic nam pišite na{" "}
                        <a href={`mailto:${BUSINESS.email}`} className="text-gold-dark underline underline-offset-4 hover:text-gold">
                            {BUSINESS.email}
                        </a>. Odgovorili vam bomo najpozneje v enem mesecu.
                    </p>
                    <p>
                        Če menite, da z vašimi podatki ne ravnamo pravilno, lahko vložite pritožbo pri
                        Informacijskem pooblaščencu Republike Slovenije (Dunajska cesta 22, 1000 Ljubljana,
                        gp.ip@ip-rs.si).
                    </p>
                </Section>

                <Section title="Varnost">
                    <p>
                        Povezava s spletno stranjo je vedno šifrirana (HTTPS). Dostop do rezervacij ima samo
                        skrbnik salona prek gesla zaščitenega vmesnika. Kljub temu noben sistem ni popolnoma
                        neranljiv, zato v obrazec ne vnašajte občutljivih podatkov, ki jih za rezervacijo ne
                        potrebujemo.
                    </p>
                </Section>

                <Section title="Spremembe te politike">
                    <p>
                        To politiko lahko občasno posodobimo. Datum zadnje posodobitve je naveden na vrhu strani.
                        Ob večjih spremembah bomo to jasno označili.
                    </p>
                </Section>

                <div className="mt-16 pt-10 border-t border-dusty-rose/30 flex flex-col sm:flex-row gap-4">
                    <Link href="/" className="btn-secondary text-center">
                        Nazaj na domačo stran
                    </Link>
                    <Link href="/book" className="btn-primary text-center">
                        Rezerviraj termin
                    </Link>
                </div>
            </div>
        </main>
    );
}
