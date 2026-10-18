import ContactForm from "@/components/ContactForm";
import LocationMap from "@/components/LocationMap";
import { BUSINESS } from "@/lib/site";

/**
 * Closing section: an enquiry form for visitors who would rather write than
 * self-book, and the location block beneath it.
 *
 * Deliberately a server component so the map markup and the whole location
 * block cost nothing on the client — only the form itself hydrates. Keeping it
 * out of HomeContent (which is `"use client"`) is what preserves that.
 */
export default function ContactSection() {
    return (
        <section
            id="kontakt"
            className="relative overflow-hidden py-28 sm:py-32"
            aria-labelledby="kontakt-naslov"
        >
            <div
                className="pointer-events-none absolute -left-[10%] bottom-0 h-[520px] w-[520px] rounded-full opacity-25"
                style={{ background: "radial-gradient(circle, rgba(199,165,103,0.18) 0%, transparent 68%)" }}
            />

            <div className="container relative z-10 mx-auto px-4">
                <div className="mb-14 grid grid-cols-1 items-end gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                        <div className="mb-6 h-px w-12 bg-gold" />
                        <h2
                            id="kontakt-naslov"
                            className="display-lg font-playfair font-bold text-charcoal"
                        >
                            Rezervirajmo
                            <br />
                            <span className="italic font-normal text-rose">vaš termin.</span>
                        </h2>
                    </div>
                    <p className="max-w-md text-pretty font-light leading-relaxed text-charcoal/50">
                        Najhitreje gre prek spletnega naročanja — termin izberete sami in
                        potrditev prejmete takoj. Če imate vprašanje ali vam noben termin ne
                        ustreza, nam pišite ali pokličite na{" "}
                        <a
                            href={`tel:${BUSINESS.phone}`}
                            className="font-medium text-charcoal transition-colors hover:text-gold-dark"
                        >
                            {BUSINESS.phoneDisplay}
                        </a>
                        .
                    </p>
                </div>

                <ContactForm />

                <div className="mt-20">
                    <LocationMap />
                </div>
            </div>
        </section>
    );
}
