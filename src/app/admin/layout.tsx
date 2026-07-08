import type { Metadata } from "next";
import { Suspense } from "react";
import AdminChrome from "@/components/AdminChrome";

export const metadata: Metadata = {
    title: "Admin",
    robots: {
        index: false,
        follow: false,
    },
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* Chrome reads search params for the active-tab highlight, so it needs
                a Suspense boundary; keeping it a sibling means page content still
                renders on the server. */}
            <Suspense fallback={null}>
                <AdminChrome />
            </Suspense>
            {children}
        </>
    );
}
