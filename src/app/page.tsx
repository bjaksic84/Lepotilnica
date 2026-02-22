"use client";

import Hero from "@/components/Hero";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Service = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  isPopular: boolean;
};

const cardGradients = [
  "from-dusty-rose/40 to-blush",
  "from-blush to-porcelain",
  "from-dusty-rose/30 to-blush/60",
];

function getServiceSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function Home() {
  const [popularServices, setPopularServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data: { services: Service[] }[]) => {
        const allServices = data.flatMap((cat) => cat.services);
        const popular = allServices.filter((s) => s.isPopular).slice(0, 3);
        setPopularServices(popular);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-porcelain">
      <Hero />

      {/* Services Preview Section */}
      <section id="services" className="py-32 relative overflow-hidden">
        {/* Subtle aurora background */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full opacity-30 -translate-y-1/2 translate-x-1/2 -z-10"
          style={{ background: "radial-gradient(circle, rgba(232,213,213,0.4) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full opacity-20 translate-y-1/2 -translate-x-1/4 -z-10"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-20"
          >
            <span className="text-gold font-semibold tracking-[0.15em] uppercase mb-4 text-xs block">Premium Care</span>
            <h2 className="text-5xl md:text-6xl font-playfair font-bold text-charcoal mb-6">Our Services</h2>
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
            <p className="mt-8 text-charcoal/50 text-xl max-w-2xl mx-auto font-light leading-relaxed">
              Indulge in our curated selection of treatments designed to rejuvenate your body, mind, and spirit.
            </p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold" />
            </div>
          ) : popularServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {popularServices.map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.2, ease: "easeOut" }}
                  whileHover={{ y: -8 }}
                  className="bg-porcelain rounded-2xl overflow-hidden border border-dusty-rose/30 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col"
                >
                  {/* Service image placeholder */}
                  <div className={`relative h-56 bg-gradient-to-br ${cardGradients[i % cardGradients.length]} overflow-hidden`}>
                    <Image
                      src={`/services/${getServiceSlug(service.name)}.jpg`}
                      alt={`${service.name} — beauty treatment at Lepotilnica by Karin`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-7xl font-playfair text-white/10 font-bold select-none">
                        {service.name.charAt(0)}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="absolute top-3 right-3 px-3 py-1 bg-gold text-charcoal text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
                      Popularno
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-8 flex flex-col flex-1">
                    <h3 className="text-2xl font-playfair font-bold text-charcoal group-hover:text-gold-dark transition-colors mb-2">
                      {service.name}
                    </h3>
                    <p className="text-charcoal/50 leading-relaxed text-sm mb-6 line-clamp-2">
                      {service.description || "Discover the benefits of this premium treatment."}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-charcoal/40 mb-6 mt-auto">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {service.duration} min
                    </div>

                    <div className="flex items-end justify-between pt-4 border-t border-dusty-rose/30">
                      <div>
                        <span className="text-[10px] text-charcoal/40 uppercase tracking-widest font-semibold block">Za</span>
                        <span className="text-2xl font-playfair font-bold text-charcoal">€{service.price}</span>
                      </div>
                      <Link
                        href={`/book?service=${service.id}`}
                        className="w-11 h-11 bg-charcoal rounded-full flex items-center justify-center text-porcelain group-hover:bg-gold transition-colors shadow-lg"
                        aria-label={`Book ${service.name}`}
                      >
                        <svg className="w-4 h-4 -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-charcoal/50">
              <p className="text-lg">No popular services available at the moment.</p>
              <p className="text-sm mt-2">Check back soon for our featured treatments!</p>
            </div>
          )}

          <div className="text-center mt-16">
            <Link href="/services" className="btn-secondary px-12">
              View Full Menu
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 bg-charcoal text-porcelain relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 0h20v20H0z\" fill=\"none\" stroke=\"%23F9F5F2\" stroke-opacity=\"0.3\"/%3E%3C/svg%3E')" }} />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full filter blur-[120px] opacity-20"
          style={{ background: "radial-gradient(circle, rgba(232,213,213,0.3) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full filter blur-[120px] opacity-15"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)" }} />

        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -50, rotate: -2 }}
            whileInView={{ opacity: 1, x: 0, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="md:w-1/2 relative"
          >
            <div className="relative z-10 aspect-[4/5] bg-charcoal/80 rounded-3xl overflow-hidden shadow-2xl border border-porcelain/10">
              <Image
                src="/about-karin.jpg"
                alt="Karin — founder and beauty expert at Lepotilnica"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-charcoal/80 to-charcoal/40 flex items-center justify-center -z-10">
                <span className="text-8xl font-playfair text-porcelain/5 italic select-none">K</span>
              </div>
            </div>

            {/* Decorative Frames */}
            <div className="absolute inset-0 border border-gold/20 rounded-3xl translate-x-4 translate-y-4 -z-10" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-charcoal/80 backdrop-blur-md rounded-2xl border border-porcelain/10 p-6 flex flex-col justify-center items-center text-center shadow-xl">
              <span className="text-4xl font-bold text-gold font-playfair">10+</span>
              <span className="text-xs text-porcelain/40 uppercase tracking-widest mt-2">Years of<br />Experience</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="md:w-1/2"
          >
            <span className="text-gold font-semibold tracking-[0.15em] uppercase mb-4 text-xs block">The Artist</span>
            <h2 className="text-5xl md:text-6xl font-playfair font-bold mb-8 leading-tight">
              Dedicated to the <br />
              <span className="text-gold-gradient">Art of Beauty</span>
            </h2>
            <div className="space-y-6 text-lg text-porcelain/50 font-light leading-relaxed">
              <p>
                With over a decade of experience in the beauty industry, Karin has dedicated her life to mastering the art of esthetics.
                Lepotilnica is her vision brought to life — a sanctuary where advanced techniques meet timeless relaxation.
              </p>
              <p>
                &ldquo;My mission is to reveal the confidence that lies within every client. True beauty is about how you feel, and I am here to help you shine.&rdquo;
              </p>
            </div>

            <div className="mt-12 flex items-center gap-6">
              <Link href="/book" className="px-10 py-4 bg-gold text-charcoal rounded-full font-bold hover:bg-gold-light transition-all transform hover:scale-[1.03] shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                Book Appointment
              </Link>
              <div className="font-playfair italic text-porcelain/40">
                — Karin
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
