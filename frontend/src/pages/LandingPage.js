import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ScanLine,
  Sparkles,
  ShieldCheck,
  Bell,
  BarChart3,
  FileSpreadsheet,
  Boxes,
  Zap,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

const FEATURES = [
  { icon: ScanLine, title: "Live Label Scan", body: "Point. Capture. Done. Gemini Vision reads product name, batch, MFG & EXP in one shot." },
  { icon: ShieldCheck, title: "AI Validation", body: "Dates checked, missing fields flagged, low-confidence scans routed for human review." },
  { icon: Boxes, title: "Duplicate Guard", body: "Same product + batch = blocked. Receive a soft alert instead of a duplicate row." },
  { icon: Bell, title: "Smart Expiry Alerts", body: "Four-tier monitor: Safe · Near · Critical · Expired. Tuned per category." },
  { icon: BarChart3, title: "Waste-Reduction Reports", body: "Watch your kg-saved counter climb. Export to Excel anytime." },
  { icon: FileSpreadsheet, title: "Auto Data Entry", body: "Verified scans land in MongoDB and Excel-ready exports. No clipboards." },
];

const STATS = [
  { kpi: "37%", label: "Food waste reduction" },
  { kpi: "4×", label: "Faster intake than manual entry" },
  { kpi: "<3s", label: "Per scan end-to-end" },
];

const STEPS = [
  { n: "01", title: "Product arrives", body: "Floor worker grabs a phone or scanner." },
  { n: "02", title: "Camera scan", body: "Label captured in HD, sent securely to the AI." },
  { n: "03", title: "AI extraction", body: "Name, batch, dates, qty, category — structured JSON." },
  { n: "04", title: "Verify & save", body: "Confidence < 75%? Edit. Confidence ≥ 75%? Auto-save." },
  { n: "05", title: "Live monitor", body: "Four-tier expiry status running 24/7." },
];

export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroTilt = useTransform(scrollYProgress, [0, 1], [0, -8]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const handler = () => {
      const y = window.scrollY;
      setTheme(y > 700 ? "light" : "dark");
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="relative w-full overflow-x-hidden" data-testid="landing-page">
      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-home">
            <div className="h-9 w-9 rounded-xl bg-brand-primary grid place-items-center shadow-glow">
              <CheckCircle2 className="h-5 w-5 text-brand-accent" strokeWidth={2.5} />
            </div>
            <span
              className={`font-display text-2xl tracking-tight transition-colors ${
                theme === "dark" ? "text-brand-cream" : "text-ink"
              }`}
            >
              fresh<span className="text-brand-accent">track</span>.
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 font-sans text-sm">
            <a href="#features" className={theme === "dark" ? "text-brand-cream/80 hover:text-brand-accent" : "text-ink-soft hover:text-brand-primary"}>
              Features
            </a>
            <a href="#how" className={theme === "dark" ? "text-brand-cream/80 hover:text-brand-accent" : "text-ink-soft hover:text-brand-primary"}>
              How it works
            </a>
            <a href="#impact" className={theme === "dark" ? "text-brand-cream/80 hover:text-brand-accent" : "text-ink-soft hover:text-brand-primary"}>
              Impact
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              data-testid="nav-login"
              className={`hidden sm:inline-flex font-sans text-sm font-medium px-4 py-2 rounded-full transition ${
                theme === "dark"
                  ? "text-brand-cream hover:text-brand-accent"
                  : "text-ink-soft hover:text-brand-primary"
              }`}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              data-testid="nav-cta-start"
              className="inline-flex items-center gap-2 bg-brand-accent text-brand-dark font-sans font-bold text-sm px-5 py-2.5 rounded-full hover:bg-brand-accentHover transition shadow-accent"
            >
              Start scanning <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section
        ref={heroRef}
        className="relative min-h-screen bg-brand-dark text-brand-cream grain overflow-hidden"
        data-testid="hero-section"
      >
        {/* Background flair */}
        <motion.div
          className="absolute -right-40 top-20 w-[680px] h-[680px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(closest-side, #259E7E, transparent)" }}
        />
        <motion.div
          className="absolute -left-32 bottom-0 w-[480px] h-[480px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(closest-side, #C1D544, transparent)" }}
        />

        <motion.div
          style={{ rotate: heroTilt, opacity: heroOpacity }}
          className="absolute right-6 sm:right-16 top-32 hidden md:block"
        >
          <div className="relative w-[360px] h-[460px] rounded-3xl overflow-hidden shadow-2xl border-4 border-brand-accent rotate-[6deg]">
            <img
              alt="Colorful supermarket produce"
              src="https://images.pexels.com/photos/2733918/pexels-photo-2733918.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 bg-brand-cream/95 backdrop-blur rounded-2xl p-4 font-mono text-xs text-ink">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">SCAN.0427</span>
                <span className="px-2 py-0.5 rounded-full bg-status-safeBg text-status-safe font-bold">98% safe</span>
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-cream/10 border border-brand-cream/15 font-mono text-[11px] tracking-[0.18em] uppercase"
            data-testid="hero-eyebrow"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand-accent" /> AI-powered · Built for retail floors
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-[14vw] sm:text-[10vw] md:text-8xl xl:text-9xl font-black leading-[0.95] mt-8 max-w-5xl"
          >
            Stop tossing <span className="italic text-brand-accent">good food</span>.
            <br />
            Start <span className="text-brand-accent">scanning</span> it.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-8 max-w-xl text-lg sm:text-xl text-brand-cream/75 leading-relaxed"
          >
            FreshTrack reads every product label with vision AI, tracks every batch, and
            warns you before a single carton hits the bin. Built for stores, warehouses,
            kitchens, and pharmacies.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
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

          {/* Ticker */}
          <div className="mt-24 border-y border-brand-cream/10 overflow-hidden py-6">
            <div className="flex animate-ticker whitespace-nowrap font-display text-3xl sm:text-5xl font-black uppercase tracking-tight">
              {Array.from({ length: 2 }).map((_, k) => (
                <span key={k} className="flex items-center gap-10 pr-10 text-brand-cream/30">
                  <span>Scan</span>
                  <span className="text-brand-accent">·</span>
                  <span>Verify</span>
                  <span className="text-brand-accent">·</span>
                  <span>Monitor</span>
                  <span className="text-brand-accent">·</span>
                  <span>Save</span>
                  <span className="text-brand-accent">·</span>
                  <span>Repeat</span>
                  <span className="text-brand-accent">·</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative bg-brand-accent text-brand-dark py-16 sm:py-24" id="impact">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 grid sm:grid-cols-3 gap-10">
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col"
            >
              <span className="font-display text-7xl sm:text-8xl font-black tracking-tighter">
                {s.kpi}
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.18em] mt-2 max-w-[18ch]">
                {s.label}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-brand-cream py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-brand-primary mb-3">
                / 01 — Capabilities
              </div>
              <h2 className="font-display text-5xl sm:text-6xl font-black text-ink max-w-xl tracking-tight">
                Every batch. Every expiry. <span className="italic text-brand-primary">Watched.</span>
              </h2>
            </div>
            <p className="font-sans text-ink-soft max-w-md text-lg">
              An end-to-end pipeline replacing clipboards, spreadsheets, and the dreaded
              “oh no, that was last month” moment.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, idx) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.05 }}
                className="group relative bg-surface border border-line rounded-3xl p-7 hover:-translate-y-1 hover:shadow-soft transition"
                data-testid={`feature-card-${idx}`}
              >
                <div className="h-12 w-12 rounded-2xl bg-brand-primary/10 grid place-items-center mb-5 group-hover:bg-brand-primary group-hover:text-brand-accent transition">
                  <f.icon className="h-6 w-6 text-brand-primary group-hover:text-brand-accent" strokeWidth={2} />
                </div>
                <h3 className="font-display text-2xl font-bold text-ink mb-2">{f.title}</h3>
                <p className="font-sans text-ink-soft text-sm leading-relaxed">{f.body}</p>
                <div className="absolute top-7 right-7 font-mono text-xs text-ink-muted">
                  0{idx + 1}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-brand-dark text-brand-cream py-24 sm:py-32 grain relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-brand-accent mb-3">
            / 02 — Workflow
          </div>
          <h2 className="font-display text-5xl sm:text-6xl font-black tracking-tight mb-16 max-w-4xl">
            From <span className="text-brand-accent">arrival</span> to <span className="italic">alert</span> in
            five steps.
          </h2>

          <div className="grid md:grid-cols-5 gap-px bg-brand-cream/10 rounded-3xl overflow-hidden border border-brand-cream/10">
            {STEPS.map((s, i) => (
              <div key={s.n} className="bg-brand-dark p-7 flex flex-col gap-3 min-h-[220px]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-brand-accent text-sm font-bold">{s.n}</span>
                  <Zap className="h-4 w-4 text-brand-accent/60" />
                </div>
                <h3 className="font-display text-2xl font-bold mt-2 leading-tight">{s.title}</h3>
                <p className="font-sans text-brand-cream/65 text-sm leading-relaxed">{s.body}</p>
                {i < STEPS.length - 1 && (
                  <div className="mt-auto hidden md:block text-brand-cream/30 font-mono">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-cream py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-6 sm:px-10">
          <div className="relative rounded-3xl bg-brand-primary text-brand-cream p-10 sm:p-16 overflow-hidden grain">
            <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-brand-accent/20 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-5xl sm:text-6xl font-black tracking-tight max-w-2xl">
                Save the produce. Save the margin.
              </h2>
              <p className="mt-6 font-sans text-brand-cream/80 max-w-lg text-lg">
                Spin up the workspace in 30 seconds. Workers scan, managers verify, admins
                rule.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/register"
                  data-testid="cta-bottom-register"
                  className="inline-flex items-center gap-2 bg-brand-accent text-brand-dark font-sans font-bold px-7 py-4 rounded-full hover:bg-brand-accentHover transition shadow-accent"
                >
                  Create account <ArrowUpRight className="h-5 w-5" strokeWidth={2.5} />
                </Link>
                <Link
                  to="/login"
                  data-testid="cta-bottom-login"
                  className="inline-flex items-center gap-2 bg-transparent border-2 border-brand-cream/40 font-sans font-medium px-7 py-4 rounded-full hover:bg-brand-cream/10 transition"
                >
                  I have an account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-brand-dark text-brand-cream py-16 grain relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10 mb-12">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-brand-cream/60">
                / Built with vision AI · Powered by Gemini
              </div>
              <h3 className="font-display text-3xl font-bold mt-3 max-w-xl">
                Less waste. Less paperwork. Less worry.
              </h3>
            </div>
            <div className="flex gap-6 font-sans text-sm text-brand-cream/70">
              <a href="#features" className="hover:text-brand-accent">
                Features
              </a>
              <a href="#how" className="hover:text-brand-accent">
                Workflow
              </a>
              <Link to="/login" className="hover:text-brand-accent">
                Sign in
              </Link>
            </div>
          </div>
          <div className="relative -mb-12 sm:-mb-20 select-none">
            <div className="font-display text-[26vw] leading-none font-black tracking-tighter text-brand-accent/90 whitespace-nowrap">
              freshtrack.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
