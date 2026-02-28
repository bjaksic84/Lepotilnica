import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Book an Appointment",
    description:
        "Book your beauty treatment online at Lepotilnica by Karin in Ljubljana. Choose from facials, lash extensions, brow styling, manicures and more. Instant confirmation.",
    openGraph: {
        title: "Book an Appointment — Lepotilnica by Karin",
        description:
            "Schedule your next beauty treatment online. Easy booking, instant confirmation.",
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
