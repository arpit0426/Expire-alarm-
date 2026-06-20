import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export function CallToAction() {
  return (
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
  );
}

export function LandingFooter() {
  return (
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
  );
}
