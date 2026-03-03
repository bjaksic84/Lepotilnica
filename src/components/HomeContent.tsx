"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

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

// Per-service image crop adjustments
const imagePositions: Record<string, string> = {
    "pedikura-s-permanentnim-lakiranjem": "center 80%",
};

export default function HomeContent({ popularServices }: { popularServices: Service[] }) {
    const servicesRef = useRef<HTMLElement>(null);
    const aboutRef = useRef<HTMLElement>(null);

    const { scrollYProgress: servicesProgress } = useScroll({
        target: servicesRef,
        offset: ["start end", "end start"],
    });
    const yServices1 = useTransform(servicesProgress, [0, 1], [150, -150]);
    const yServices2 = useTransform(servicesProgress, [0, 1], [-150, 150]);

    const { scrollYProgress: aboutProgress } = useScroll({
        target: aboutRef,
        offset: ["start end", "end start"],
    });
    const yAbout1 = useTransform(aboutProgress, [0, 1], [100, -200]);
    const yAbout2 = useTransform(aboutProgress, [0, 1], [-200, 100]);

    return (
        <>
            {/* Services Preview Section */}
            <section id="services" ref={servicesRef} className="py-32 relative overflow-hidden">
                {/* Subtle aurora background */}
                <motion.div style={{ y: yServices1 }} className="absolute z-0 inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full opacity-30 -translate-y-1/2 translate-x-1/2 -z-10"
                        style={{ background: "radial-gradient(circle, rgba(232,213,213,0.4) 0%, transparent 70%)" }} />
                </motion.div>
                <motion.div style={{ y: yServices2 }} className="absolute z-0 inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full opacity-20 translate-y-1/2 -translate-x-1/4 -z-10"
                        style={{ background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />
                </motion.div>

                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-center mb-20"
                    >
                        <span className="text-gold font-semibold tracking-[0.15em] uppercase mb-4 text-xs block">Vrhunska nega</span>
                        <h2 className="text-5xl md:text-6xl font-playfair font-bold text-charcoal mb-6">Naše storitve</h2>
                        <div className="w-24 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
                        <p className="mt-8 text-charcoal/50 text-xl max-w-2xl mx-auto font-light leading-relaxed">
                            Prepustite se naši skrbno izbrani ponudbi tretmajev, zasnovani za pomladitev vašega telesa, uma in duha.
                        </p>
                    </motion.div>

                    {popularServices.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {popularServices.map((service, i) => (
                                <motion.div
                                    key={service.id}
                                    initial={{ opacity: 0, y: 40 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.7, delay: i * 0.2, ease: "easeOut" }}
                                    whileHover={{ y: -10, boxShadow: "0 20px 50px rgba(232,213,213,0.7), 0 8px 20px rgba(212,175,55,0.15)" }}
                                    style={{ boxShadow: "0 8px 30px rgba(232,213,213,0.55), 0 2px 8px rgba(0,0,0,0.06)" }}
                                    className="bg-porcelain rounded-2xl overflow-hidden border border-dusty-rose/40 transition-all duration-300 group flex flex-col"
                                >
                                    {/* Service image */}
                                    <div className={`relative h-56 bg-gradient-to-br ${cardGradients[i % cardGradients.length]} overflow-hidden`}>
                                        <Image
                                            src={`/services/${getServiceSlug(service.name)}.jpeg`}
                                            alt={`${service.name} — lepotni tretma v Lepotilnici`}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                            style={{ objectPosition: imagePositions[getServiceSlug(service.name)] || "center" }}
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
                                            {service.description || "Odkrijte prednosti tega vrhunskega tretmaja."}
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
                                                aria-label={`Rezerviraj ${service.name}`}
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
                            <p className="text-lg">Trenutno ni na voljo priljubljenih storitev.</p>
                            <p className="text-sm mt-2">Kmalu preverite naše izpostavljene tretmaje!</p>
                        </div>
                    )}

                    <div className="text-center mt-16">
                        <Link href="/services" className="btn-secondary px-12">
                            Vse storitve
                        </Link>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" ref={aboutRef} className="py-32 bg-charcoal text-porcelain relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 0h20v20H0z\" fill=\"none\" stroke=\"%23F9F5F2\" stroke-opacity=\"0.3\"/%3E%3C/svg%3E')" }} />
                <motion.div style={{ y: yAbout1 }} className="absolute z-0 inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full filter blur-[120px] opacity-20"
                        style={{ background: "radial-gradient(circle, rgba(232,213,213,0.3) 0%, transparent 70%)" }} />
                </motion.div>
                <motion.div style={{ y: yAbout2 }} className="absolute z-0 inset-0 pointer-events-none">
                    <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full filter blur-[120px] opacity-15"
                        style={{ background: "radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)" }} />
                </motion.div>

                <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-20 relative z-10">
                    <div className="w-full max-w-md mx-auto md:max-w-none md:w-1/2 relative group">
                        {/* Offset Magazine Border */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                            className="absolute -inset-3 md:inset-0 md:translate-x-6 md:translate-y-6 rounded-3xl border border-gold/30 -z-10"
                        />
                        
                        {/* Image Mask Reveal */}
                        <motion.div
                            initial={{ clipPath: "inset(100% 0 0 0 rounded 1.5rem)" }}
                            whileInView={{ clipPath: "inset(0 0 0 0 rounded 1.5rem)" }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 1.2, ease: [0.77, 0, 0.175, 1] }}
                            className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <Image
                                src="/about-karin.jpeg"
                                alt="Karin — founder and beauty expert at Lepotilnica"
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 50vw"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent" />
                        </motion.div>
                    </div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={{
                            hidden: {},
                            visible: {
                                transition: { staggerChildren: 0.15 }
                            }
                        }}
                        className="w-full md:w-1/2 md:pl-8 text-center md:text-left"
                    >
                        <motion.span 
                            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } }}
                            className="text-gold font-semibold tracking-[0.15em] uppercase mb-4 text-xs block"
                        >
                            O meni
                        </motion.span>
                        <motion.h2 
                            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } }}
                            className="text-5xl md:text-6xl font-playfair font-bold mb-8 leading-tight"
                        >
                            Posvečeno <br className="hidden md:block" />
                            <span className="text-gold-gradient">umetnosti lepote</span>
                        </motion.h2>
                        <motion.div 
                            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } }}
                            className="space-y-6 text-lg text-porcelain/50 font-light leading-relaxed text-left"
                        >
                            <p>
                                Ko je Karin pri 18 letih odprla vrata Lepotilnice, je imela jasno vizijo: ustvariti prostor, kjer se mladostna kreativnost sreča s profesionalno nego.
                                Njena pot, ki se je začela takoj po srednji šoli, temelji na nenehnem učenju in želji, da vsaki stranki ponudi najsodobnejše pristope k lepoti.
                            </p>
                            <p>
                                &ldquo;Moja motivacija prihaja iz ljubezni do dela, ki ga opravljam od prvega dne svoje kariere. Vsaka stranka je zame priložnost, da dokažem, da prava kakovost izhaja iz predanosti in pozornosti do detajlov.&rdquo;
                            </p>
                        </motion.div>

                        <motion.div 
                            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } }}
                            className="mt-12 flex flex-col sm:flex-row items-center gap-6 justify-center md:justify-start"
                        >
                            <div className="relative group">
                                <motion.div 
                                    animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 bg-gold/40 rounded-full blur-xl -z-10"
                                />
                                <Link href="/book" className="relative block px-10 py-4 bg-gold text-charcoal rounded-full font-bold hover:bg-gold-light transition-all transform hover:scale-[1.03]">
                                    Rezerviraj termin
                                </Link>
                            </div>
                            <div className="font-playfair italic text-porcelain/40">
                                — Karin
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>
        </>
    );
}
