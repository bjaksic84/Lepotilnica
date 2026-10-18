"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { GALLERY_IMAGES } from "@/lib/gallery";
import { SOCIAL_LINKS } from "@/lib/site";

/** Drift speed, in pixels per millisecond (~45 px/s). */
const SPEED_PX_PER_MS = 0.045;
/** How long the drift yields after the visitor scrolls the strip themselves —
 *  long enough for touch momentum to play out without being fought. */
const USER_SCROLL_GRACE_MS = 500;
/** Fraction of a pending arrow nudge consumed each frame — gives it an ease-out. */
const NUDGE_EASING = 0.12;
/** Largest frame delta we will act on, so returning to a backgrounded tab
 *  resumes the drift instead of teleporting it forward by the time away. */
const MAX_FRAME_MS = 64;

/* ── prefers-reduced-motion ───────────────────────────────
   Read through useSyncExternalStore rather than an effect: matchMedia is a
   browser-only API, and subscribing this way keeps the value correct if the
   user flips the OS setting while the page is open. */
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
    const mq = window.matchMedia(MOTION_QUERY);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
    return useSyncExternalStore(
        subscribeToMotionPreference,
        () => window.matchMedia(MOTION_QUERY).matches,
        () => false
    );
}

export default function GalleryCarousel() {
    const sectionRef = useRef<HTMLElement>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLUListElement>(null);
    const reducedMotion = usePrefersReducedMotion();

    /** Written synchronously from pointer handlers — the drift loop reads it
     *  every frame and must never see a stale React value mid-gesture. */
    const dragging = useRef(false);
    /** Distance still owed to an arrow press, eased out over several frames. */
    const pendingNudge = useRef(0);
    /**
     * The drift's own position, kept as a float.
     *
     * `scrollLeft` cannot hold it: the browser rounds every write to a whole
     * pixel (writing 0.75 reads back as 1). Accumulating the drift by reading
     * scrollLeft back and adding to it therefore loses the fraction on every
     * frame — and at a high refresh rate it loses *everything*, because the
     * per-frame step shrinks as frames get shorter. At 45 px/s a 60Hz frame
     * advances 0.75px, but a 120Hz frame advances 0.375px, which rounds to
     * zero and leaves the strip motionless forever.
     *
     * So the true position lives here at full precision and scrollLeft merely
     * receives it. This also makes the speed exact and identical on every
     * display, rather than quietly becoming whatever the rounding happened to
     * produce.
     */
    const position = useRef(0);
    /** The scrollLeft this component last wrote, so a `scroll` event can be
     *  attributed to either the drift loop or the visitor. */
    const lastWritten = useRef(0);
    /** Timestamp until which the drift stays out of the way. */
    const yieldUntil = useRef(0);

    /** Drift is suspended while the strip is off-screen and while it has
     *  keyboard focus (so arrow keys aren't fighting the animation). */
    const [inView, setInView] = useState(false);
    const [hasFocus, setHasFocus] = useState(false);

    /**
     * Width of one full copy of the list, including the gap that follows it.
     *
     * The track renders the images twice; the second copy's first tile sits
     * exactly one copy-width along, so the difference in offsetLeft is the
     * distance the strip must travel before it can be wrapped back without
     * any visible seam. Measured rather than computed because tile widths are
     * viewport percentages that change at every breakpoint.
     */
    const copyWidth = useCallback(() => {
        const track = trackRef.current;
        if (!track) return 0;
        const first = track.children[0] as HTMLElement | undefined;
        const secondCopyStart = track.children[GALLERY_IMAGES.length] as HTMLElement | undefined;
        if (!first || !secondCopyStart) return 0;
        return secondCopyStart.offsetLeft - first.offsetLeft;
    }, []);

    /** One tile plus its gap — the distance an arrow press travels. */
    const tileStep = useCallback(() => {
        const track = trackRef.current;
        if (!track || track.children.length < 2) return 0;
        const [a, b] = [track.children[0], track.children[1]] as HTMLElement[];
        return b.offsetLeft - a.offsetLeft;
    }, []);

    /** Move to `next`, wrapping into the first copy so the strip loops forever
     *  in either direction. The float is kept; scrollLeft gets the rounded
     *  version the browser will store anyway. */
    const setScroll = useCallback((next: number, width: number) => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        // Modulo rather than a single add/subtract: a fast drag can deliver a
        // pointer delta larger than one copy-width, which a one-step
        // correction would only partially undo.
        const value = width <= 0 ? next : ((next % width) + width) % width;
        position.current = value;
        scroller.scrollLeft = value;
        // Read back rather than storing `value`: the browser rounds, and the
        // scroll listener below compares against what it will actually see.
        lastWritten.current = scroller.scrollLeft;
    }, []);

    /* ── Only animate while the strip is actually on screen ── */
    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;
        const observer = new IntersectionObserver(
            ([entry]) => setInView(entry.isIntersecting),
            { rootMargin: "120px" }
        );
        observer.observe(section);
        return () => observer.disconnect();
    }, []);

    /* ── The drift loop ───────────────────────────────────
       One rAF drives both the constant movement and any outstanding arrow
       nudge, so the two can never fight over scrollLeft. The loop keeps
       running under reduced motion — the drift term drops to zero but arrow
       presses still need somewhere to be applied. */
    useEffect(() => {
        if (!inView) return;
        const scroller = scrollerRef.current;
        if (!scroller) return;

        let raf = 0;
        let last = performance.now();

        const frame = (now: number) => {
            const elapsed = Math.min(now - last, MAX_FRAME_MS);
            last = now;

            // Adopt any movement we did not cause: a trackpad side-swipe, touch
            // momentum, a keyboard scroll, the browser's own clamping.
            //
            // This has to happen here, at the top of the frame, rather than
            // only in the `scroll` listener. Scroll events are coalesced and
            // are not guaranteed to be dispatched before this callback, so the
            // listener could still be holding a pre-scroll position when the
            // frame ran — and the frame would then write that stale value back,
            // yanking the strip to where it sat before the visitor touched it.
            // Comparing against the exact value we last wrote makes the check
            // order-independent and needs no threshold guesswork: scrollLeft is
            // integer-valued, so any genuine difference is at least 1px.
            if (Math.abs(scroller.scrollLeft - lastWritten.current) > 0.5) {
                position.current = scroller.scrollLeft;
                lastWritten.current = scroller.scrollLeft;
            }

            const idle =
                dragging.current ||
                now < yieldUntil.current ||
                document.visibilityState === "hidden";

            if (!idle) {
                const drifting = !reducedMotion && !hasFocus;
                let delta = drifting ? SPEED_PX_PER_MS * elapsed : 0;

                if (Math.abs(pendingNudge.current) > 0.5) {
                    const step = pendingNudge.current * NUDGE_EASING;
                    delta += step;
                    pendingNudge.current -= step;
                } else {
                    pendingNudge.current = 0;
                }

                // Advance from our own float position, never from scrollLeft —
                // see the `position` ref for why reading it back loses the drift.
                if (delta !== 0) setScroll(position.current + delta, copyWidth());
            }

            raf = requestAnimationFrame(frame);
        };

        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [inView, reducedMotion, hasFocus, copyWidth, setScroll]);

    const handleArrow = useCallback(
        (dir: 1 | -1) => {
            pendingNudge.current += dir * tileStep();
        },
        [tileStep]
    );

    /* ── Yield to the visitor's own scrolling ─────────────
       Touch flings and trackpad side-swipes move the strip through the
       browser's native scrolling, which the drift loop would otherwise fight:
       writing scrollLeft every frame on top of an in-flight momentum scroll
       stutters it and, on iOS, can cancel it outright.

       This listener's only job is to hold the drift off while that is
       happening. Keeping the position in step is the frame loop's job — doing
       it in both places is what let a missed event strand a stale position. */
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;

        const onScroll = () => {
            if (Math.abs(scroller.scrollLeft - lastWritten.current) > 0.5) {
                yieldUntil.current = performance.now() + USER_SCROLL_GRACE_MS;
            }
        };

        scroller.addEventListener("scroll", onScroll, { passive: true });
        return () => scroller.removeEventListener("scroll", onScroll);
    }, []);

    /* ── Vertical wheel must scroll the page, not the strip ──
       A horizontally-scrollable element that cannot scroll vertically absorbs
       vertical wheel deltas and pans sideways instead — which is exactly the
       behaviour we were asked not to reproduce. So: vertical-dominant wheel
       events are cancelled and re-applied to the window, while
       horizontal-dominant ones (trackpad side-swipes, shift+wheel) fall
       through to the native horizontal scroll.

       `behavior: "instant"` is required, not cosmetic — `html` sets
       `scroll-behavior: smooth`, which would otherwise animate every single
       wheel tick and make the page feel like treacle. */
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;

        const onWheel = (e: WheelEvent) => {
            // Require the gesture to be *clearly* sideways before handing it to
            // the strip. A plain two-finger scroll down carries a little
            // horizontal jitter, and a bare `|deltaX| > |deltaY|` test let
            // those stray frames through — which is why the carousel appeared
            // to inch along only while the page was being scrolled.
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5) return;
            e.preventDefault();
            window.scrollBy({ top: e.deltaY, behavior: "instant" });
        };

        scroller.addEventListener("wheel", onWheel, { passive: false });
        return () => scroller.removeEventListener("wheel", onWheel);
    }, []);

    /* ── Mouse drag-to-pan ────────────────────────────────
       Touch pans natively, so this is mouse-only. Movement is applied as a
       per-event increment rather than against a remembered origin, because the
       wrap can move scrollLeft out from under an absolute origin mid-drag. */
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;

        let lastX = 0;

        const onPointerDown = (e: PointerEvent) => {
            if (e.pointerType !== "mouse") return;
            dragging.current = true;
            lastX = e.clientX;
            scroller.setPointerCapture(e.pointerId);
            scroller.style.cursor = "grabbing";
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!dragging.current) return;
            const dx = e.clientX - lastX;
            lastX = e.clientX;
            setScroll(position.current - dx, copyWidth());
        };

        const endDrag = (e: PointerEvent) => {
            if (!dragging.current) return;
            dragging.current = false;
            if (scroller.hasPointerCapture(e.pointerId)) {
                scroller.releasePointerCapture(e.pointerId);
            }
            scroller.style.cursor = "";
        };

        scroller.addEventListener("pointerdown", onPointerDown);
        scroller.addEventListener("pointermove", onPointerMove);
        scroller.addEventListener("pointerup", endDrag);
        scroller.addEventListener("pointercancel", endDrag);
        return () => {
            scroller.removeEventListener("pointerdown", onPointerDown);
            scroller.removeEventListener("pointermove", onPointerMove);
            scroller.removeEventListener("pointerup", endDrag);
            scroller.removeEventListener("pointercancel", endDrag);
        };
    }, [copyWidth, setScroll]);

    return (
        <section
            id="galerija"
            ref={sectionRef}
            className="relative overflow-hidden py-28 sm:py-32"
            aria-labelledby="galerija-naslov"
        >
            <div
                className="pointer-events-none absolute right-0 top-1/4 h-[500px] w-[500px] translate-x-1/3 rounded-full opacity-20"
                style={{ background: "radial-gradient(circle, rgba(232,213,213,0.35) 0%, transparent 70%)" }}
            />

            <div className="container relative z-10 mx-auto px-4">
                <div className="mb-12 grid grid-cols-1 items-end gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                        <div className="mb-6 h-px w-12 bg-gold" />
                        <h2
                            id="galerija-naslov"
                            className="display-lg font-playfair font-bold text-charcoal"
                        >
                            Naše delo,
                            <br />
                            <span className="italic font-normal text-rose">brez filtrov.</span>
                        </h2>
                    </div>
                    <p className="max-w-md text-pretty font-light leading-relaxed text-charcoal/50">
                        Vse fotografije so iz našega salona in z naših strank — nič ni kupljeno
                        v fotobanki. Več objavljamo sproti na{" "}
                        <a
                            href={SOCIAL_LINKS.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-charcoal underline decoration-gold/50 underline-offset-4 transition-colors hover:text-gold-dark"
                        >
                            Instagramu
                        </a>
                        .
                    </p>
                </div>
            </div>

            <div className="relative">
                <div
                    ref={scrollerRef}
                    className="no-scrollbar w-full overflow-x-auto overscroll-x-contain"
                    role="region"
                    aria-label="Galerija fotografij salona"
                    tabIndex={0}
                    onFocus={() => setHasFocus(true)}
                    onBlur={() => setHasFocus(false)}
                >
                    {/* Rendered twice so the strip can wrap without a seam. The
                        duplicate is hidden from assistive tech — it is the same
                        21 photographs, and announcing them again is noise. */}
                    <ul ref={trackRef} className="flex w-max gap-4 px-4 sm:gap-5 sm:px-8">
                        {[0, 1].map((copy) =>
                            GALLERY_IMAGES.map((image, i) => (
                                <li
                                    key={`${copy}-${image.src}`}
                                    aria-hidden={copy === 1}
                                    className="w-[68vw] shrink-0 sm:w-[38vw] lg:w-[23vw] xl:w-[20vw]"
                                >
                                    <div className="shell !p-1">
                                        <div className="core relative aspect-[3/4] w-full">
                                            <Image
                                                src={image.src}
                                                alt={copy === 0 ? image.alt : ""}
                                                fill
                                                // Dragging an image fires the browser's native
                                                // image-drag, which cancels the pan gesture.
                                                draggable={false}
                                                className="select-none object-cover"
                                                sizes="(max-width: 640px) 68vw, (max-width: 1024px) 38vw, 23vw"
                                                loading={copy === 0 && i < 3 ? "eager" : "lazy"}
                                            />
                                        </div>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                {/* Arrows sit below the strip so they never cover a photo. The
                    strip itself is focusable and scrolls with the arrow keys. */}
                <div className="container mx-auto mt-8 flex items-center justify-between gap-6 px-4">
                    <p className="text-xs font-light text-charcoal/40">
                        Povlecite ali podrsajte za več fotografij.
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => handleArrow(-1)}
                            aria-label="Prejšnje fotografije"
                            className="pressable flex h-11 w-11 items-center justify-center rounded-full border border-charcoal/15 bg-white/60 text-charcoal transition-colors hover:border-charcoal/30 hover:bg-white"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleArrow(1)}
                            aria-label="Naslednje fotografije"
                            className="pressable flex h-11 w-11 items-center justify-center rounded-full border border-charcoal/15 bg-white/60 text-charcoal transition-colors hover:border-charcoal/30 hover:bg-white"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto mt-12 px-4 text-center">
                <Link href="/services" className="btn-secondary px-12">
                    Poglejte cenik
                </Link>
            </div>
        </section>
    );
}
