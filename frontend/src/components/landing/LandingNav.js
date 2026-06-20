import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

export default function LandingNav({ theme }) {
  const linkCls =
    theme === "dark"
      ? "text-brand-cream/80 hover:text-brand-accent"
      : "text-ink-soft hover:text-brand-primary";
  const signInCls =
    theme === "dark"
      ? "text-brand-cream hover:text-brand-accent"
      : "text-ink-soft hover:text-brand-primary";
  const brandTextCls =
    theme === "dark" ? "text-brand-cream" : "text-ink";

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="brand-home">
          <div className="h-9 w-9 rounded-xl bg-brand-primary grid place-items-center shadow-glow">
            <CheckCircle2 className="h-5 w-5 text-brand-accent" strokeWidth={2.5} />
          </div>
          <span className={`font-display text-2xl tracking-tight transition-colors ${brandTextCls}`}>
            fresh<span className="text-brand-accent">track</span>.
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 font-sans text-sm">
          <a href="#features" className={linkCls}>Features</a>
          <a href="#how" className={linkCls}>How it works</a>
          <a href="#impact" className={linkCls}>Impact</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            data-testid="nav-login"
            className={`hidden sm:inline-flex font-sans text-sm font-medium px-4 py-2 rounded-full transition ${signInCls}`}
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
  );
}
