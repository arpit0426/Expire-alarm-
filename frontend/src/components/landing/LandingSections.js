import React from "react";
import { motion } from "framer-motion";
import {
  ScanLine,
  ShieldCheck,
  Boxes,
  Bell,
  BarChart3,
  FileSpreadsheet,
  Zap,
} from "lucide-react";
import { fadeInScroll, fadeInScrollStaggered } from "../../lib/motion";

const FEATURES = [
  {
    icon: ScanLine,
    title: "Live Label Scan",
    body: "Point. Capture. Done. Gemini Vision reads product name, batch, MFG & EXP in one shot.",
  },
  {
    icon: ShieldCheck,
    title: "AI Validation",
    body: "Dates checked, missing fields flagged, low-confidence scans routed for human review.",
  },
  {
    icon: Boxes,
    title: "Duplicate Guard",
    body: "Same product + batch = blocked. Receive a soft alert instead of a duplicate row.",
  },
  {
    icon: Bell,
    title: "Smart Expiry Alerts",
    body: "Four-tier monitor: Safe · Near · Critical · Expired. Tuned per category.",
  },
  {
    icon: BarChart3,
    title: "Waste-Reduction Reports",
    body: "Watch your kg-saved counter climb. Export to Excel anytime.",
  },
  {
    icon: FileSpreadsheet,
    title: "Auto Data Entry",
    body: "Verified scans land in MongoDB and Excel-ready exports. No clipboards.",
  },
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

export function ImpactStats() {
  return (
    <section className="relative bg-brand-accent text-brand-dark py-16 sm:py-24" id="impact">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 grid sm:grid-cols-3 gap-10">
        {STATS.map((s) => (
          <motion.div key={s.label} {...fadeInScroll} className="flex flex-col">
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
  );
}

export function Features() {
  return (
    <section id="features" className="bg-brand-cream py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-brand-primary mb-3">
              / 01 — Capabilities
            </div>
            <h2 className="font-display text-5xl sm:text-6xl font-black text-ink max-w-xl tracking-tight">
              Every batch. Every expiry.{" "}
              <span className="italic text-brand-primary">Watched.</span>
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
              {...fadeInScrollStaggered(idx)}
              className="group relative glass rounded-3xl p-7 hover:-translate-y-1 hover:shadow-soft transition"
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
  );
}

export function HowItWorks() {
  return (
    <section
      id="how"
      className="bg-brand-dark text-brand-cream py-24 sm:py-32 grain relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-brand-accent mb-3">
          / 02 — Workflow
        </div>
        <h2 className="font-display text-5xl sm:text-6xl font-black tracking-tight mb-16 max-w-4xl">
          From <span className="text-brand-accent">arrival</span> to{" "}
          <span className="italic">alert</span> in five steps.
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
  );
}
