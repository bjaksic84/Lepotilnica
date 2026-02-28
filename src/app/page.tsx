import Hero from "@/components/Hero";
import HomeContent from "@/components/HomeContent";
import { db } from "@/db";
import { services } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function Home() {
  const allServices = await db.select().from(services);
  const popularServices = allServices
    .filter((s) => s.isPopular)
    .slice(0, 3)
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price,
      duration: s.duration,
      isPopular: s.isPopular,
    }));

  return (
    <main className="min-h-screen bg-porcelain">
      <Hero />
      <HomeContent popularServices={popularServices} />
    </main>
  );
}
