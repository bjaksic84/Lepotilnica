import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Rezerviraj termin",
    description:
        "Rezervirajte svoj lepotni tretma prek spleta v Lepotilnici by Karin v Ljubljani. Izbirajte med nego obraza, podaljševanjem trepalnic, oblikovanjem obrvi, manikuro in več. Takojšna potrditev.",
    openGraph: {
        title: "Rezerviraj termin — Lepotilnica by Karin",
        description:
            "Rezervirajte naslednji lepotni tretma prek spleta. Enostavna rezervacija, takojšna potrditev.",
        url: "/book",
    },
    alternates: {
        canonical: "/book",
    },
};

export default function BookLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
