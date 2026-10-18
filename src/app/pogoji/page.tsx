import type { Metadata } from "next";
import Link from "next/link";
import {
    BUSINESS,
    BUSINESS_ADDRESS_LINE,
    ONLINE_BOOKING_WINDOW_PROSE,
    SITE_NAME,
    SITE_URL,
} from "@/lib/site";
import { jsonLdScript } from "@/lib/json-ld";

/**
 * Terms of service (splošni pogoji poslovanja).
 *
 * The cancellation-fee rules here are the ones the booking flow actually
 * enforces: the self-service cancellation link in the confirmation e-mail stops
 * working 36 hours before the appointment (see
 * `src/app/api/cancel/[token]/route.ts`), which is exactly the fee-free window
 * described in section 3. If that constant moves, this page, the confirmation
 * e-mail and the homepage FAQ all have to move with it, and LAST_UPDATED has to
 * be bumped — a policy page that contradicts the software is worse than none.
 */
export const metadata: Metadata = {
    title: "Splošni pogoji poslovanja",
    description:
        "Splošni pogoji poslovanja kozmetičnega salona Lepotilnica by Karin — rezervacija terminov, odpovedi, plačilni pogoji, zamude ter varnost in higiena.",
    alternates: { canonical: "/pogoji" },
    openGraph: {
        title: `Splošni pogoji poslovanja — ${SITE_NAME}`,
        description: "Pogoji rezervacije, odpovedi in izvedbe storitev.",
        url: "/pogoji",
    },
};

/** Last substantive revision of these terms — shown to users, so keep it honest. */
const LAST_UPDATED = "20. september 2026";

const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
        { "@type": "ListItem", position: 1, name: "Domov", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Splošni pogoji poslovanja", item: `${SITE_URL}/pogoji` },
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

function Highlight({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-dusty-rose/40 bg-blush/40 p-5 my-2">
            <div className="space-y-3 text-charcoal/80 leading-relaxed font-light">{children}</div>
        </div>
    );
}

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-porcelain pt-32 pb-24">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }}
            />

            <div className="container mx-auto px-4 max-w-3xl">
                <div className="w-12 h-px bg-gold mb-6" />
                <h1 className="text-4xl md:text-5xl font-playfair font-bold text-charcoal leading-[1.05]">
                    Splošni pogoji poslovanja
                </h1>
                <p className="mt-4 text-charcoal/50 text-sm">
                    Zadnja posodobitev: {LAST_UPDATED}
                </p>

                <p className="mt-8 text-charcoal/70 leading-relaxed font-light">
                    Dobrodošli v kozmetičnem salonu {SITE_NAME}. Da bi zagotovili prijetno izkušnjo in
                    kakovostno izvedbo storitev za vse naše stranke, smo pripravili naslednje splošne
                    pogoje poslovanja. Ob naročanju na termin smatramo, da ste pogoje prebrali in jih
                    boste upoštevali.
                </p>

                <Section title="1. Veljavnost pogojev">
                    <p>
                        Ti pogoji veljajo za vse rezervacije in storitve salona {SITE_NAME}, ne glede na to,
                        ali je bil termin dogovorjen osebno, po telefonu, prek družbenih omrežij ali prek
                        spletnega sistema za naročanje na tej spletni strani.
                    </p>
                    <p>
                        Z oddajo spletne rezervacije potrdite, da ste te pogoje prebrali in se z njimi
                        strinjate. Pogodbeno razmerje med vami in salonom nastane s potrditvijo rezervacije.
                    </p>
                </Section>

                <Section title="2. Rezervacija terminov">
                    <p>
                        Termine lahko rezervirate osebno, po telefonu, prek družbenih omrežij ali prek
                        spletnega sistema za naročanje.
                    </p>
                    <p>
                        Ob rezervaciji označite vse storitve, ki jih je treba opraviti. Če določena storitev
                        ob naročanju ni bila označena, jo lahko po ceniku zaračunamo dodatno. (Primer:
                        stranka se je naročila na pedikuro s permanentnim lakiranjem, pri naročanju pa ni
                        označila odstranitve tujega gel laka — to storitev smo zato zaračunali dodatno.)
                        Ker sta ob naročanju prikazana tako trajanje kot cena posamezne storitve, smatramo,
                        da ste z njima seznanjeni.
                    </p>
                    <p>
                        Spletno naročanje je mogoče za termine med {ONLINE_BOOKING_WINDOW_PROSE}, od ponedeljka
                        do sobote. Ob nedeljah in praznikih je salon zaprt. Sicer delamo po dogovoru — za termin
                        izven navedenega okvira nas prosimo pokličite na{" "}
                        <a href={`tel:${BUSINESS.phone}`} className="text-gold-dark underline underline-offset-4 hover:text-gold">
                            {BUSINESS.phoneDisplay}
                        </a>.
                    </p>
                    <p>
                        Po oddani spletni rezervaciji na svoj e-poštni naslov prejmete potrditev s povzetkom
                        termina in povezavo za odpoved. Če potrditve ne prejmete, preverite mapo z neželeno
                        pošto ali nas kontaktirajte — brez potrditve rezervacija morda ni bila zabeležena.
                    </p>
                </Section>

                <Section title="3. Odpoved ali prestavitev termina">
                    <Highlight>
                        <p>
                            <strong className="text-charcoal font-medium">Vsaj 36 ur pred terminom.</strong>{" "}
                            Termin lahko brezplačno odpoveste ali prestavite, če nas o tem obvestite vsaj
                            36 ur pred dogovorjenim terminom — prek povezave v potrditvenem e-sporočilu ali
                            na telefonsko številko{" "}
                            <a href={`tel:${BUSINESS.phone}`} className="text-gold-dark underline underline-offset-4 hover:text-gold">
                                {BUSINESS.phoneDisplay}
                            </a>.
                        </p>
                        <p>
                            <strong className="text-charcoal font-medium">Manj kot 36 ur pred terminom.</strong>{" "}
                            V tem primeru si {SITE_NAME} pridržuje pravico do obračuna stroška odpovedi v
                            višini 50 % vrednosti rezervirane storitve.
                        </p>
                        <p>
                            <strong className="text-charcoal font-medium">Manj kot 24 ur pred terminom ali zamuda nad 15 minut.</strong>{" "}
                            Če stranka odpove termin manj kot 24 ur pred začetkom ali zamudi več kot
                            15 minut, se obračuna 100 % vrednosti storitve.
                        </p>
                        <p>
                            <strong className="text-charcoal font-medium">Neudeležba brez predhodnega obvestila.</strong>{" "}
                            Če se stranka rezerviranega termina ne udeleži in o odsotnosti predhodno ne
                            obvesti salona, si {SITE_NAME} pridržuje pravico do obračuna celotne vrednosti
                            rezervirane storitve.
                        </p>
                    </Highlight>
                    <p className="text-charcoal/50 text-sm">
                        Povezava za odpoved v potrditvenem e-sporočilu deluje do 36 ur pred začetkom termina.
                        Za poznejšo odpoved ali prestavitev nas prosimo pokličite.
                    </p>
                </Section>

                <Section title="4. Neplačane obveznosti zaradi pozne odpovedi ali neudeležbe">
                    <p>
                        V primeru obračuna stroška zaradi pozne odpovedi termina ali neudeležbe brez
                        predhodnega obvestila je stranka dolžna poravnati izstavljeni račun v roku 24 ur.
                    </p>
                    <p>
                        Do poravnave vseh zapadlih obveznosti si {SITE_NAME} pridržuje pravico, da stranki
                        onemogoči rezervacijo novih terminov in koriščenje storitev.
                    </p>
                    <p>
                        Če ima stranka v času izdaje računa za pozno odpoved ali neudeležbo že rezervirane
                        prihodnje termine, si {SITE_NAME} pridržuje pravico, da te termine odpove, če račun
                        ni poravnan v roku 36 ur od njegove izdaje.
                    </p>
                    <p>
                        Po poravnavi vseh odprtih obveznosti lahko stranka ponovno koristi storitve in
                        rezervira nove termine skladno z razpoložljivostjo terminov.
                    </p>
                    <p>
                        Spletno naročanje lahko omejimo tudi strankam, ki se ponavljajoče ne udeležijo
                        rezerviranih terminov. V takem primeru termin dogovorimo osebno ali po telefonu.
                    </p>
                </Section>

                <Section title="5. Plačilni pogoji">
                    <p>Plačilo storitev se izvede v kozmetičnem salonu oziroma prek spleta.</p>
                    <p>Morebitni preostanek zneska ali dodatek se poravna po opravljeni storitvi v salonu.</p>
                    <p>
                        Možni načini plačila so skladni z aktualno ponudbo salona. Spletna rezervacija ne
                        zahteva vnaprejšnjega plačila.
                    </p>
                    <p>
                        Veljajo cene iz aktualnega cenika, objavljenega na strani{" "}
                        <Link href="/services" className="text-gold-dark underline underline-offset-4 hover:text-gold">
                            Storitve
                        </Link>. Cene so v evrih. Salon ni zavezanec za DDV, zato DDV ni obračunan.
                    </p>
                </Section>

                <Section title="6. Zamude">
                    <p>Stranke prosimo, da na termin pridejo pravočasno.</p>
                    <p>
                        V primeru zamude, daljše od 10 minut, si {SITE_NAME} pridržuje pravico do skrajšanja
                        storitve ali odpovedi termina, če zaradi zamude storitve ni več mogoče izvesti v
                        predvidenem času.
                    </p>
                    <p>
                        V primeru odpovedi termina zaradi večje zamude se storitev obračuna skladno z
                        aktualnim cenikom (glejte točko 3).
                    </p>
                </Section>

                <Section title="7. Varnost in higiena">
                    <p>
                        V Lepotilnici by Karin upoštevamo visoke higienske standarde ter skrbimo za varnost
                        naših strank.
                    </p>
                    <p>
                        Vsi pripomočki in oprema so ustrezno razkuženi in sterilizirani skladno s predpisi in
                        strokovnimi smernicami.
                    </p>
                    <p>
                        Stranke prosimo, da pred začetkom storitve obvestijo izvajalko o morebitnih
                        zdravstvenih težavah, alergijah, nosečnosti, jemanju zdravil ali drugih okoliščinah,
                        ki bi lahko vplivale na izvedbo storitve. Če izvedba storitve zaradi takih okoliščin
                        ni varna, jo lahko odklonimo ali prilagodimo.
                    </p>
                    <p>
                        Storitve izvajamo polnoletnim strankam. Za mladoletne stranke je potrebno soglasje
                        staršev ali zakonitega zastopnika.
                    </p>
                </Section>

                <Section title="8. Reklamacije in pritožbe">
                    <p>Ob poškodbi nohta vam po 24 urah zaračunamo popravilo po ceniku.</p>
                    <p>
                        Morebitne reklamacije sprejemamo čim prej po opravljeni storitvi, da lahko napako
                        pregledamo in odpravimo. Pišite nam na{" "}
                        <a href={`mailto:${BUSINESS.email}`} className="text-gold-dark underline underline-offset-4 hover:text-gold">
                            {BUSINESS.email}
                        </a>{" "}
                        ali nas pokličite na{" "}
                        <a href={`tel:${BUSINESS.phone}`} className="text-gold-dark underline underline-offset-4 hover:text-gold">
                            {BUSINESS.phoneDisplay}
                        </a>.
                    </p>
                </Section>

                <Section title="9. Varstvo osebnih podatkov">
                    <p>
                        Podatke, ki jih posredujete ob rezervaciji, obdelujemo izključno za izvedbo termina.
                        Kako jih zbiramo, uporabljamo in hranimo, je podrobno opisano v{" "}
                        <Link href="/zasebnost" className="text-gold-dark underline underline-offset-4 hover:text-gold">
                            politiki zasebnosti
                        </Link>, ki je sestavni del teh pogojev.
                    </p>
                </Section>

                <Section title="10. Spremembe pogojev poslovanja">
                    <p>
                        {SITE_NAME} si pridržuje pravico do spremembe teh splošnih pogojev poslovanja.
                        Vse spremembe bodo objavljene na uradnih komunikacijskih kanalih podjetja in začnejo
                        veljati z dnem objave.
                    </p>
                    <p>
                        Za že potrjene rezervacije veljajo pogoji, ki so veljali v trenutku potrditve
                        rezervacije.
                    </p>
                </Section>

                <Section title="11. Pravo in reševanje sporov">
                    <p>
                        Za ta razmerja se uporablja pravo Republike Slovenije. Morebitne spore želimo rešiti
                        sporazumno — prosimo, da nas najprej kontaktirate na{" "}
                        <a href={`mailto:${BUSINESS.email}`} className="text-gold-dark underline underline-offset-4 hover:text-gold">
                            {BUSINESS.email}
                        </a>. Če sporazumna rešitev ni mogoča, je za reševanje spora pristojno stvarno
                        pristojno sodišče v Ljubljani.
                    </p>
                </Section>

                <Section title="12. Kontaktni podatki">
                    <p>Za dodatne informacije smo vam na voljo:</p>
                    <ul className="space-y-2">
                        <li><strong className="text-charcoal font-medium">{SITE_NAME}</strong></li>
                        <li>{BUSINESS_ADDRESS_LINE}, Slovenija</li>
                        <li>
                            <a href={`tel:${BUSINESS.phone}`} className="text-gold-dark underline underline-offset-4 hover:text-gold">
                                {BUSINESS.phoneDisplay}
                            </a>
                        </li>
                        <li>
                            <a href={`mailto:${BUSINESS.email}`} className="text-gold-dark underline underline-offset-4 hover:text-gold">
                                {BUSINESS.email}
                            </a>
                        </li>
                    </ul>

                    {/* Registration details — required of a trader by ZEPT. */}
                    <div className="mt-6 rounded-2xl border border-dusty-rose/30 p-5 text-sm text-charcoal/60 space-y-1">
                        <p className="text-charcoal/80 font-medium">Podatki o podjetju</p>
                        <p>LEPOTILNICA BY KARIN, Karin Somrak s.p.</p>
                        <p>Sedež: Tržaška cesta 283, 1000 Ljubljana</p>
                        <p>Salon: {BUSINESS_ADDRESS_LINE}</p>
                        <p>Matična številka: 7543794</p>
                        <p>Davčna številka: 88960587</p>
                        <p>Nismo zavezanec za DDV. DDV ni obračunan po 94. členu ZDDV-1.</p>
                    </div>
                </Section>

                <div className="mt-16 pt-10 border-t border-dusty-rose/30 flex flex-col sm:flex-row gap-4">
                    <Link href="/zasebnost" className="btn-secondary text-center">
                        Politika zasebnosti
                    </Link>
                    <Link href="/book" className="btn-primary text-center">
                        Rezerviraj termin
                    </Link>
                </div>
            </div>
        </main>
    );
}
