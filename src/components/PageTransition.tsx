"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useContext, useState } from "react";

/**
 * Preserves the previous route's content during exit animation
 * by freezing the router context until the animation completes.
 */
function FrozenRouter({ children }: { children: React.ReactNode }) {
    const context = useContext(LayoutRouterContext ?? ({} as never));
    // Snapshot the router context on first render only (useState initializer),
    // so the exiting route keeps its content frozen during the exit animation.
    const [frozen] = useState(context);

    return (
        <LayoutRouterContext.Provider value={frozen}>
            {children}
        </LayoutRouterContext.Provider>
    );
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        // `initial={false}` suppresses the enter animation for the *first*
        // render only; route changes still fade.
        //
        // Without it, framer server-renders this wrapper as
        // `style="opacity:0"`, so every page shipped invisible and only
        // appeared once React had hydrated and run the 300ms fade. That made
        // the whole site blank with JS disabled or hydration broken, and it
        // quietly cancelled the LCP work in Hero.tsx — a transparent ancestor
        // means the h1 inside it is not counted as painted, which is the exact
        // thing that fix exists to avoid.
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            >
                <FrozenRouter>{children}</FrozenRouter>
            </motion.div>
        </AnimatePresence>
    );
}
