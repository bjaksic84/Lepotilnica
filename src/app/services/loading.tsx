export default function ServicesLoading() {
    return (
        <main className="min-h-screen bg-porcelain pt-32 pb-20">
            {/* Hero skeleton */}
            <section className="mb-10">
                <div className="container mx-auto px-4 max-w-7xl space-y-4">
                    <div className="h-3 w-32 bg-dusty-rose/20 rounded-full animate-pulse" />
                    <div className="h-14 w-80 md:w-[420px] bg-dusty-rose/20 rounded-xl animate-pulse" />
                    <div className="h-5 w-96 max-w-full bg-dusty-rose/15 rounded-lg animate-pulse" />
                </div>
            </section>

            {/* Category nav pills skeleton */}
            <div className="border-y border-dusty-rose/40 mb-8">
                <div className="container mx-auto px-4 max-w-7xl flex gap-2 py-3.5 overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-9 w-24 shrink-0 bg-dusty-rose/15 rounded-full animate-pulse" />
                    ))}
                </div>
            </div>

            {/* Two-column category skeleton */}
            <section className="container mx-auto px-4 max-w-7xl">
                {[...Array(2)].map((_, catIdx) => (
                    <div
                        key={catIdx}
                        className="grid md:grid-cols-[280px_1fr] gap-6 md:gap-11 items-start py-8 md:py-12 border-b border-dusty-rose/40"
                    >
                        {/* Category header skeleton */}
                        <div className="space-y-3">
                            <div className="h-12 w-16 bg-dusty-rose/15 rounded-lg animate-pulse" />
                            <div className="w-8 h-0.5 bg-gold/30" />
                            <div className="h-9 w-44 bg-dusty-rose/20 rounded-xl animate-pulse" />
                            <div className="h-4 w-full max-w-xs bg-dusty-rose/10 rounded animate-pulse" />
                            <div className="h-3 w-24 bg-dusty-rose/15 rounded animate-pulse" />
                        </div>

                        {/* Service rows skeleton */}
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 px-2 md:px-3 py-3.5"
                                    style={{ animationDelay: `${(catIdx * 5 + i) * 70}ms` }}
                                >
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-48 max-w-full bg-dusty-rose/20 rounded animate-pulse" />
                                        <div className="h-3 w-16 bg-dusty-rose/10 rounded animate-pulse" />
                                    </div>
                                    <div className="h-6 w-12 bg-dusty-rose/15 rounded animate-pulse" />
                                    <div className="w-9 h-9 bg-dusty-rose/15 rounded-full animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </main>
    );
}
