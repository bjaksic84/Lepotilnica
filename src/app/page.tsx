"use client";

import Hero from "@/components/Hero";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white selection:bg-pink-200">
      <Hero />

      {/* Services Preview Section */}
      <section id="services" className="py-32 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-pink-50/50 rounded-full mix-blend-multiply filter blur-[120px] opacity-60 -translate-y-1/2 translate-x-1/2 -z-10" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-yellow-50/50 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 translate-y-1/2 -translate-x-1/4 -z-10" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-20"
          >
            <span className="text-yellow-600 font-bold tracking-widest uppercase mb-4 text-sm block">Premium Care</span>
            <h2 className="text-5xl md:text-6xl font-playfair font-bold text-gray-900 mb-6">Our Services</h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 mx-auto rounded-full" />
            <p className="mt-8 text-gray-600 text-xl max-w-2xl mx-auto font-light leading-relaxed">
              Indulge in our curated selection of treatments designed to rejuvenate your body, mind, and spirit.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                title: "Signature Facial",
                price: "€85",
                desc: "A bespoke treatment tailored to your skin's needs, using premium organic products to restore your natural glow.",
                icon: "✨",
                delay: 0
              },
              {
                title: "Deep Tissue Massage",
                price: "€70",
                desc: "Release tension and restore mobility with our therapeutic deep tissue massage techniques.",
                icon: "💆‍♀️",
                delay: 0.2
              },
              {
                title: "Luxury Manicure",
                price: "€45",
                desc: "Complete hand renewal including exfoliation, mask, and precision polish application.",
                icon: "💅",
                delay: 0.4
              }
            ].map((service, i) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: service.delay, ease: "easeOut" }}
                whileHover={{ y: -10 }}
                className="glass-card p-10 rounded-[2.5rem] relative group group-hover:bg-white/60"
              >
                <div className="absolute top-10 right-10 text-4xl opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 grayscale group-hover:grayscale-0">
                  {service.icon}
                </div>

                <h3 className="text-3xl font-playfair font-bold text-gray-900 mb-4 group-hover:text-yellow-700 transition-colors mt-8">{service.title}</h3>
                <p className="text-gray-600 mb-10 leading-relaxed text-lg font-light">{service.desc}</p>

                <div className="flex items-end justify-between border-t border-gray-100 pt-6">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Starting at</span>
                    <span className="text-3xl font-playfair font-bold text-gray-900">{service.price}</span>
                  </div>
                  <Link href="/book" className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white group-hover:bg-yellow-500 transition-colors shadow-lg">
                    <svg className="w-5 h-5 -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link href="/book" className="btn-secondary px-12 text-lg">
              View Full Menu
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 bg-gray-900 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-900/30 rounded-full filter blur-[120px] mix-blend-screen opacity-40" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-yellow-900/20 rounded-full filter blur-[120px] mix-blend-screen opacity-40" />

        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -50, rotate: -2 }}
            whileInView={{ opacity: 1, x: 0, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="md:w-1/2 relative"
          >
            <div className="relative z-10 aspect-[4/5] bg-gray-800 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              {/* Abstract placeholder for Karin's image */}
              <div className="absolute inset-0 bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center">
                <span className="text-8xl font-playfair text-white/5 font-italic">K</span>
              </div>
            </div>

            {/* Decorative Frames */}
            <div className="absolute inset-0 border border-yellow-500/30 rounded-3xl translate-x-4 translate-y-4 -z-10" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gray-800/80 backdrop-blur-md rounded-2xl border border-white/10 p-6 flex flex-col justify-center items-center text-center shadow-xl">
              <span className="text-4xl font-bold text-yellow-500 font-playfair">10+</span>
              <span className="text-xs text-gray-400 uppercase tracking-widest mt-2">Years of<br />Experience</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="md:w-1/2"
          >
            <span className="text-yellow-500 font-bold tracking-widest uppercase mb-4 text-sm block">The Artist</span>
            <h2 className="text-5xl md:text-6xl font-playfair font-bold mb-8 leading-tight">
              Dedicated to the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600">Art of Beauty</span>
            </h2>
            <div className="space-y-6 text-lg text-gray-400 font-light leading-relaxed">
              <p>
                With over a decade of experience in the beauty industry, Karin has dedicated her life to mastering the art of esthetics.
                Lepotilnica is her vision brought to life - a sanctuary where advanced techniques meet timeless relaxation.
              </p>
              <p>
                "My mission is to reveal the confidence that lies within every client. True beauty is about how you feel, and I am here to help you shine."
              </p>
            </div>

            <div className="mt-12 flex items-center gap-6">
              <Link href="/book" className="px-10 py-4 bg-yellow-500 text-gray-900 rounded-full font-bold hover:bg-yellow-400 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                Book Appointment
              </Link>
              <div className="font-playfair italic text-gray-500">
                - Karin
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
