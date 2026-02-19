export default function BookingLoading() {
    return (
        <div className="min-h-screen pt-28 pb-20 bg-gradient-to-b from-blush/30 via-porcelain to-porcelain">
            <div className="container mx-auto px-4 max-w-3xl">
                {/* Title skeleton */}
                <div className="text-center mb-10 space-y-3">
                    <div className="h-9 w-72 bg-dusty-rose/20 rounded-xl mx-auto animate-pulse" />
                    <div className="h-4 w-56 bg-dusty-rose/15 rounded-lg mx-auto animate-pulse" />
                </div>

                {/* Progress bar skeleton */}
                <div className="flex items-center justify-center mb-10 gap-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center">
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="w-9 h-9 rounded-full bg-dusty-rose/20 animate-pulse" />
                                <div className="h-2.5 w-10 bg-dusty-rose/15 rounded animate-pulse" />
                            </div>
                            {i < 3 && <div className="w-10 sm:w-16 h-[2px] mx-1 sm:mx-2 mb-5 bg-dusty-rose/15 rounded-full" />}
                        </div>
                    ))}
                </div>

                {/* Content skeleton  */}
                <div className="space-y-4">
                    <div className="h-6 w-48 bg-dusty-rose/20 rounded-lg mx-auto animate-pulse" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="h-32 rounded-2xl bg-dusty-rose/10 border border-dusty-rose/15 animate-pulse"
                                style={{ animationDelay: `${i * 100}ms` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
