"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { BUSINESS, SERVICE_CATEGORIES, SITE_NAME } from "@/lib/site";

type FieldErrors = Partial<Record<"name" | "email" | "phone" | "topic" | "message" | "consent", string[]>>;

const inputClass =
    "w-full min-w-0 rounded-xl border border-charcoal/12 bg-white/70 px-4 py-3 text-[15px] text-charcoal " +
    "placeholder:text-charcoal/30 transition-colors duration-200 " +
    "focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20";

export default function ContactForm() {
    const formId = useId();
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [consent, setConsent] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitting) return;

        const form = event.currentTarget;
        const data = new FormData(form);

        setSubmitting(true);
        setFormError(null);
        setFieldErrors({});

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: String(data.get("name") ?? "").trim(),
                    email: String(data.get("email") ?? "").trim(),
                    phone: String(data.get("phone") ?? "").trim(),
                    topic: String(data.get("topic") ?? ""),
                    message: String(data.get("message") ?? "").trim(),
                    consent,
                    website: String(data.get("website") ?? ""),
                }),
            });

            const payload = (await response.json()) as {
                success?: boolean;
                error?: string;
                details?: FieldErrors;
            };

            if (!response.ok) {
                setFormError(payload.error ?? "Sporočila ni bilo mogoče poslati.");
                if (payload.details) setFieldErrors(payload.details);
                return;
            }

            setSent(true);
            form.reset();
            setConsent(false);
        } catch {
            setFormError("Povezava ni uspela. Preverite internetno povezavo in poskusite znova.");
        } finally {
            setSubmitting(false);
        }
    }

    if (sent) {
        return (
            <div className="shell">
                <div className="core flex min-h-[420px] flex-col items-center justify-center p-8 text-center sm:p-12">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold-dark">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20 6 9 17l-5-5" />
                        </svg>
                    </span>
                    <h3 className="mt-6 font-playfair text-2xl font-bold text-charcoal">
                        Sporočilo je oddano.
                    </h3>
                    <p className="mt-3 max-w-sm text-pretty font-light leading-relaxed text-charcoal/60">
                        Oglasimo se vam isti ali naslednji delovni dan. Če se vam mudi, nas
                        pokličite na{" "}
                        <a
                            href={`tel:${BUSINESS.phone}`}
                            className="font-medium text-charcoal transition-colors hover:text-gold-dark"
                        >
                            {BUSINESS.phoneDisplay}
                        </a>
                        .
                    </p>
                    <button
                        type="button"
                        onClick={() => setSent(false)}
                        className="btn-secondary mt-8"
                    >
                        Pošljite še eno sporočilo
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="shell">
            <form onSubmit={handleSubmit} noValidate className="core relative space-y-5 p-6 sm:p-8">
                {/* Honeypot: off-screen rather than display:none, since some bots
                    skip hidden fields but not positioned ones. aria-hidden and
                    tabIndex keep it away from real visitors entirely. */}
                <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                    <label htmlFor={`${formId}-website`}>Spletna stran</label>
                    <input
                        id={`${formId}-website`}
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                    />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="min-w-0">
                        <label htmlFor={`${formId}-name`} className="eyebrow mb-2 block">
                            Ime in priimek
                        </label>
                        <input
                            id={`${formId}-name`}
                            name="name"
                            type="text"
                            required
                            autoComplete="name"
                            placeholder="Ana Novak"
                            className={inputClass}
                            aria-invalid={Boolean(fieldErrors.name)}
                        />
                        {fieldErrors.name && (
                            <p className="mt-1.5 text-xs text-rose-dark">{fieldErrors.name[0]}</p>
                        )}
                    </div>

                    <div className="min-w-0">
                        <label htmlFor={`${formId}-phone`} className="eyebrow mb-2 block">
                            Telefon <span className="normal-case tracking-normal">(neobvezno)</span>
                        </label>
                        <input
                            id={`${formId}-phone`}
                            name="phone"
                            type="tel"
                            autoComplete="tel"
                            placeholder="040 123 456"
                            className={inputClass}
                            aria-invalid={Boolean(fieldErrors.phone)}
                        />
                        {fieldErrors.phone && (
                            <p className="mt-1.5 text-xs text-rose-dark">{fieldErrors.phone[0]}</p>
                        )}
                    </div>
                </div>

                <div className="min-w-0">
                    <label htmlFor={`${formId}-email`} className="eyebrow mb-2 block">
                        E-naslov
                    </label>
                    <input
                        id={`${formId}-email`}
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="ana@primer.si"
                        className={inputClass}
                        aria-invalid={Boolean(fieldErrors.email)}
                    />
                    {fieldErrors.email && (
                        <p className="mt-1.5 text-xs text-rose-dark">{fieldErrors.email[0]}</p>
                    )}
                </div>

                <div className="min-w-0">
                    <label htmlFor={`${formId}-topic`} className="eyebrow mb-2 block">
                        Kaj vas zanima
                    </label>
                    <select
                        id={`${formId}-topic`}
                        name="topic"
                        defaultValue=""
                        className={inputClass}
                    >
                        <option value="">Še ne vem / drugo</option>
                        {SERVICE_CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="min-w-0">
                    <label htmlFor={`${formId}-message`} className="eyebrow mb-2 block">
                        Sporočilo
                    </label>
                    <textarea
                        id={`${formId}-message`}
                        name="message"
                        required
                        rows={5}
                        placeholder="Zanima me…"
                        className={`${inputClass} resize-y`}
                        aria-invalid={Boolean(fieldErrors.message)}
                    />
                    {fieldErrors.message && (
                        <p className="mt-1.5 text-xs text-rose-dark">{fieldErrors.message[0]}</p>
                    )}
                </div>

                <label className="flex cursor-pointer items-start gap-3 text-[13px] font-light leading-relaxed text-charcoal/60">
                    <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-gold"
                        aria-invalid={Boolean(fieldErrors.consent)}
                    />
                    <span>
                        Strinjam se, da {SITE_NAME} moje podatke uporabi izključno za odgovor na
                        to povpraševanje.{" "}
                        <Link
                            href="/zasebnost"
                            target="_blank"
                            className="font-medium text-charcoal underline decoration-gold/50 underline-offset-2 transition-colors hover:text-gold-dark"
                        >
                            Politika zasebnosti
                        </Link>
                        .
                    </span>
                </label>

                {formError && (
                    <p role="alert" className="rounded-xl bg-rose/10 px-4 py-3 text-sm text-rose-dark">
                        {formError}
                    </p>
                )}

                <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="submit"
                        disabled={submitting || !consent}
                        className="btn-primary min-h-[44px] w-full sm:w-auto"
                    >
                        {submitting ? "Pošiljanje…" : "Pošljite povpraševanje"}
                    </button>
                    <p className="text-xs font-light text-charcoal/40">
                        Odgovorimo v enem delovnem dnevu.
                    </p>
                </div>
            </form>
        </div>
    );
}
