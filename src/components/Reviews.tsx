"use client";

import { motion } from "framer-motion";
import { FEATURED_REVIEWS, RATING_SNAPSHOT, type Review } from "@/lib/reviews";

function Stars({ rating, className = "" }: { rating: number; className?: string }) {
    return (
        <span
            className={`flex gap-[3px] ${className}`}
            role="img"
            aria-label={`${rating} od 5 zvezdic`}
        >
            {Array.from({ length: 5 }, (_, i) => (
                <svg
                    key={i}
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill={i < rating ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                >
                    <path d="m12 2.6 2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95L12 2.6Z" />
                </svg>
            ))}
        </span>
    );
}

function ReviewCard({ review, index }: { review: Review; index: number }) {
    return (
        <motion.li
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: index * 0.12, ease: "easeOut" }}
            className="shell h-full"
        >
            <figure className="core flex h-full flex-col p-7 sm:p-8">
                <Stars rating={review.rating} className="text-gold" />
                <blockquote
                    className="mt-5 flex-1 text-pretty text-[15px] font-light leading-[1.75] text-charcoal/70"
                    lang={review.lang}
                >
                    &bdquo;{review.body}&ldquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-dusty-rose/40 pt-5">
                    <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush font-playfair text-sm font-bold text-charcoal/70"
                        aria-hidden="true"
                    >
                        {review.author.charAt(0)}
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-charcoal">
                            {review.author}
                        </span>
                        <span className="block text-xs text-charcoal/40">{review.month}</span>
                    </span>
                </figcaption>
            </figure>
        </motion.li>
    );
}

export default function Reviews() {
    return (
        <section
            id="mnenja"
            className="relative overflow-hidden bg-blush/30 py-28 sm:py-32"
            aria-labelledby="mnenja-naslov"
        >
            <div className="container relative z-10 mx-auto px-4">
                <div className="mb-14 grid grid-cols-1 items-end gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                        <div className="mb-6 h-px w-12 bg-gold" />
                        <h2
                            id="mnenja-naslov"
                            className="display-lg font-playfair font-bold text-charcoal"
                        >
                            Mnenja na Googlu.
                            <br />
                            <span className="italic font-normal text-rose">
                                Vse do zadnje petice.
                            </span>
                        </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-end">
                        <span className="flex items-baseline gap-3">
                            <span className="font-playfair text-4xl leading-none text-charcoal">
                                {RATING_SNAPSHOT.valueDisplay}
                            </span>
                            <Stars rating={5} className="text-gold" />
                        </span>
                        <a
                            href={RATING_SNAPSHOT.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-quiet"
                        >
                            Preberite vsa mnenja na Googlu
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M7 17 17 7M9 7h8v8" />
                            </svg>
                        </a>
                    </div>
                </div>

                <ul className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
                    {FEATURED_REVIEWS.map((review, i) => (
                        <ReviewCard key={review.author} review={review} index={i} />
                    ))}
                </ul>

                <p className="mt-8 text-xs font-light text-charcoal/40">
                    Mnenja so dobesedno prepisana z Google profila salona. Stanje:{" "}
                    {RATING_SNAPSHOT.snapshot}.
                </p>
            </div>
        </section>
    );
}
