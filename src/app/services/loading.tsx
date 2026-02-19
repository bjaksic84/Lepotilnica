export default function ServicesLoading() {
    return (
        <main className="min-h-screen bg-porcelain pt-32 pb-20">
            {/* Hero skeleton */}
            <section className="mb-20">
                <div className="container mx-auto px-4 text-center space-y-4">
                    <div className="h-3 w-32 bg-dusty-rose/20 rounded-full mx-auto animate-pulse" />
                    <div className="h-12 w-80 md:w-[420px] bg-dusty-rose/20 rounded-xl mx-auto animate-pulse" />
                    <div className="w-24 h-px bg-gold/20 mx-auto" />
                    <div className="h-5 w-96 max-w-full bg-dusty-rose/15 rounded-lg mx-auto animate-pulse mt-6" />
                    <div className="h-5 w-72 max-w-full bg-dusty-rose/10 rounded-lg mx-auto animate-pulse" />
                </div>
            </section>

            {/* Services grid skeleton */}
            <section className="container mx-auto px-4 max-w-7xl space-y-24">
                {[...Array(2)].map((_, catIdx) => (
                    <div key={catIdx}>
                        {/* Category header skeleton */}
                        <div className="mb-12 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-px bg-gold/20" />
                                <div className="h-3 w-16 bg-dusty-rose/20 rounded animate-pulse" />
                            </div>
                            <div className="h-10 w-56 bg-dusty-rose/20 rounded-xl animate-pulse" />
                            <div className="h-4 w-80 max-w-full bg-dusty-rose/15 rounded-lg animate-pulse" />
                        </div>

                        {/* Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(3)].map((_, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl overflow-hidden border border-dusty-rose/20 bg-porcelain"
                                    style={{ animationDelay: `${(catIdx * 3 + i) * 80}ms` }}
                                >
                                    <div className="h-48 bg-dusty-rose/15 animate-pulse" />
                                    <div className="p-6 space-y-3">
                                        <div className="h-5 w-40 bg-dusty-rose/20 rounded-lg animate-pulse" />
                                        <div className="h-3 w-full bg-dusty-rose/10 rounded animate-pulse" />
                                        <div className="h-3 w-3/4 bg-dusty-rose/10 rounded animate-pulse" />
                                        <div className="flex items-center gap-2 mt-4">
                                            <div className="h-3 w-16 bg-dusty-rose/15 rounded animate-pulse" />
                                        </div>
                                        <div className="flex items-end justify-between pt-4 border-t border-dusty-rose/15">
                                            <div className="h-7 w-16 bg-dusty-rose/20 rounded-lg animate-pulse" />
                                            <div className="w-11 h-11 bg-dusty-rose/15 rounded-full animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </main>
    );
}
