import { BUSINESS_ADDRESS_LINE } from "@/lib/site";

/**
 * Homepage FAQ — the single source for both the visible accordion and the
 * FAQPage JSON-LD. Google only awards FAQ rich results when the marked-up
 * questions and answers are also visible on the page, so the two must be
 * generated from the same data rather than maintained separately.
 *
 * This lives on the homepage only. It previously sat in the root layout, which
 * emitted FAQPage markup on every route — including /book and /admin, where the
 * questions appear nowhere on the page.
 */
export interface FaqItem {
    question: string;
    answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
    {
        question: "Kako rezerviram termin v Lepotilnici?",
        answer: "Termin rezervirate neposredno na tej spletni strani — izberite želene storitve, datum in uro ter potrdite rezervacijo. Potrditev prejmete po e-pošti takoj, brez čakanja na klic.",
    },
    {
        question: "Kje se nahaja Lepotilnica by Karin?",
        answer: `Najdete nas na naslovu ${BUSINESS_ADDRESS_LINE}, v neposredni bližini središča Ljubljane.`,
    },
    {
        question: "Kakšne storitve ponujate?",
        answer: "Ponujamo nego obraza, manikuro in pedikuro (tudi BIAB in trajno lakiranje), depilacijo, laminacijo in oblikovanje obrvi, barvanje ter keratinsko vihanje trepalnic, masaže, biomicroneedling in tretmaje za oblikovanje telesa. Celoten cenik s trajanjem posamezne storitve najdete na strani Storitve.",
    },
    {
        question: "Ali lahko odpovem ali prestavim termin?",
        answer: "Da. V potrditvenem e-sporočilu prejmete povezavo za odpoved, ki deluje kadar koli. Če želite termin prestaviti, nas prosimo pokličite — tako lahko sproščeni termin ponudimo komu drugemu.",
    },
    {
        question: "Kako plačam storitev?",
        answer: "Plačilo poteka v salonu po opravljeni storitvi, z gotovino ali plačilno kartico. Rezervacija prek spleta ne zahteva vnaprejšnjega plačila.",
    },
];

/** schema.org FAQPage node built from the same items the page renders. */
export function faqJsonLd(baseUrl: string) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${baseUrl}/#faq`,
        mainEntity: FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
            },
        })),
    };
}
