import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { fadeInUp, fadeInUpDelayed } from "../../lib/motion";

export default function LandingHero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  // Parallax + zoom: as the user scrolls, the floating scan card zooms in slightly,
  // the headline drifts up, the radial blobs swell, and overall opacity tapers.
  const heroTilt = useTransform(scrollYProgress, [0, 1], [0, -8]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);
  const cardScale = useTransform(scrollYProgress, [0, 0.6], [1, 1.18]);
  const cardY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const blob1Scale = useTransform(scrollYProgress, [0, 1], [1, 1.45]);
  const blob2Scale = useTransform(scrollYProgress, [0, 1], [1, 1.55]);
  const headlineY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const headlineScale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen bg-brand-dark text-brand-cream grain paisley-soft overflow-hidden"
      data-testid="hero-section"
    >
      <motion.div
        className="absolute -right-40 top-20 w-[680px] h-[680px] rounded-full opacity-50 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, #3A7D44, transparent)",
          scale: blob1Scale,
        }}
      />
      <motion.div
        className="absolute -left-32 bottom-0 w-[480px] h-[480px] rounded-full opacity-40 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, #E4A11B, transparent)",
          scale: blob2Scale,
        }}
      />
      <motion.div
        className="absolute right-1/3 top-2/3 w-[420px] h-[420px] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #B0533C, transparent)" }}
      />

      <motion.div
        style={{ rotate: heroTilt, opacity: heroOpacity, scale: cardScale, y: cardY }}
        className="absolute right-6 sm:right-16 top-32 hidden md:block will-change-transform"
      >
        <div className="relative w-[360px] h-[460px] rounded-3xl overflow-hidden shadow-2xl border-4 border-brand-accent rotate-[6deg]">
          <img
            alt="Colorful supermarket produce"
            src="https://images.pexels.com/photos/2733918/pexels-photo-2733918.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 glass-strong rounded-2xl p-4 font-mono text-xs text-ink">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold">SCAN.0427</span>
              <span className="px-2 py-0.5 rounded-full bg-status-safeBg text-status-safe font-bold">
                98% safe
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">EXP</span>
              <span className="font-bold">2026-09-12</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">BATCH</span>
              <span className="font-bold">L-238A</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 pt-44 sm:pt-52 pb-32">
        <motion.div
          {...fadeInUp}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-dark font-mono text-[11px] tracking-[0.18em] uppercase"
          data-testid="hero-eyebrow"
        >
          <Sparkles className="h-3.5 w-3.5 text-brand-accent" />
          <span>ताज़ा · AI-powered · Built for retail floors</span>
        </motion.div>

        <motion.h1
          {...fadeInUpDelayed(0.1)}
          style={{ y: headlineY, scale: headlineScale }}
          className="font-display text-[14vw] sm:text-[10vw] md:text-8xl xl:text-9xl font-black leading-[0.95] mt-8 max-w-5xl will-change-transform"
        >
          Stop tossing <span className="italic text-brand-accent">good food</span>.
          <br />
          Start <span className="text-brand-accent">scanning</span> it.
        </motion.h1>

        <motion.p
          {...fadeInUpDelayed(0.25)}
          className="mt-8 max-w-xl text-lg sm:text-xl text-brand-cream/75 leading-relaxed"
        >
          FreshTrack reads every product label with vision AI, tracks every batch, and
          warns you before a single carton hits the bin. Built for stores, warehouses,
          kitchens, and pharmacies.
        </motion.p>

        <motion.div
          {...fadeInUpDelayed(0.4)}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <Link
            to="/register"
            data-testid="hero-cta-primary"
            className="inline-flex items-center gap-2 bg-brand-accent text-brand-dark font-sans font-bold px-7 py-4 rounded-full hover:bg-brand-accentHover transition shadow-accent text-base"
          >
            Try the live scanner <ArrowUpRight className="h-5 w-5" strokeWidth={2.5} />
          </Link>
          <Link
            to="/login"
            data-testid="hero-cta-secondary"
            className="inline-flex items-center gap-2 bg-transparent border-2 border-brand-cream/30 text-brand-cream font-sans font-medium px-7 py-4 rounded-full hover:bg-brand-cream/10 transition"
          >
            Sign in to workspace
          </Link>
        </motion.div>

        <Ticker />
      </div>
    </section>
  );
}

function Ticker() {
  const tokens = ["Scan", "Verify", "Monitor", "Save", "Repeat"];
  return (
    <div className="mt-24 border-y border-brand-cream/10 overflow-hidden py-6">
      <div className="flex animate-ticker whitespace-nowrap font-display text-3xl sm:text-5xl font-black uppercase tracking-tight">
        {["a", "b"].map((rowKey) => (
          <span
            key={`ticker-row-${rowKey}`}
            className="flex items-center gap-10 pr-10 text-brand-cream/30"
          >
            {tokens.map((t) => (
              <React.Fragment key={`${rowKey}-${t}`}>
                <span>{t}</span>
                <span className="text-brand-accent">·</span>
              </React.Fragment>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
