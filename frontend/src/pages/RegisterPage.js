import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { formatApiErrorDetail } from "../lib/utils";
import { formEnter } from "../lib/motion";

const ROLES = [
  { value: "worker", label: "Worker", desc: "Scan products, view inventory & alerts." },
  { value: "manager", label: "Manager", desc: "Edit records, run reports, set thresholds." },
];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "worker" });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register(form);
      if (data?.role_overridden) {
        toast.warning("Admin role can only be granted by an existing admin — you have been registered as a worker.");
      } else {
        toast.success("Welcome to FreshTrack");
      }
      navigate("/app", { replace: true });
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Sign-up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="register-page">
      <div className="relative bg-brand-primary text-brand-cream hidden lg:block grain paisley-soft overflow-hidden">
        <div className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full bg-brand-accent/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-brand-dark/40 blur-3xl" />
        <div className="relative h-full flex flex-col p-12 xl:p-16">
          <Link to="/" className="flex items-center gap-2 mb-auto">
            <div className="h-9 w-9 rounded-xl bg-brand-dark grid place-items-center shadow-glow">
              <CheckCircle2 className="h-5 w-5 text-brand-accent" strokeWidth={2.5} />
            </div>
            <span className="font-display text-2xl tracking-tight">
              fresh<span className="text-brand-accent">track</span>.
            </span>
          </Link>
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-brand-accent mb-4">
              / Get started
            </div>
            <h1 className="font-display text-5xl xl:text-6xl font-black leading-[0.95] tracking-tight">
              First scan in <br />
              <span className="italic text-brand-accent">under 30 seconds.</span>
            </h1>
            <p className="mt-6 text-brand-cream/80 max-w-md text-lg">
              Roles unlocked on day one: Workers scan, managers run the ship.
              Admins are minted by your team.
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col items-center justify-center px-6 py-12 bg-brand-cream paisley">
        <motion.form
          onSubmit={onSubmit}
          {...formEnter}
          className="w-full max-w-md"
        >
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-10">
            <div className="h-9 w-9 rounded-xl bg-brand-primary grid place-items-center">
              <CheckCircle2 className="h-5 w-5 text-brand-accent" strokeWidth={2.5} />
            </div>
            <span className="font-display text-2xl tracking-tight text-ink">
              fresh<span className="text-brand-primary">track</span>.
            </span>
          </Link>
          <h2 className="font-display text-4xl sm:text-5xl font-black text-ink mb-2 tracking-tight">
            Create account
          </h2>
          <p className="text-ink-soft mb-8">
            Already on board?{" "}
            <Link to="/login" className="text-brand-primary font-semibold underline underline-offset-4">
              Sign in
            </Link>
            .
          </p>

          <div className="space-y-5">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-2">
                Full name
              </label>
              <input
                data-testid="register-name-input"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
                placeholder="Alex Worker"
                className="w-full bg-white border border-line rounded-xl px-4 py-3.5 text-ink placeholder:text-ink-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none font-sans"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-2">
                Email
              </label>
              <input
                data-testid="register-email-input"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
                placeholder="you@store.com"
                className="w-full bg-white border border-line rounded-xl px-4 py-3.5 text-ink placeholder:text-ink-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none font-sans"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-2">
                Password
              </label>
              <input
                data-testid="register-password-input"
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="w-full bg-white border border-line rounded-xl px-4 py-3.5 text-ink placeholder:text-ink-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none font-sans"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-2">
                Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => (
                  <button
                    type="button"
                    key={r.value}
                    data-testid={`register-role-${r.value}`}
                    onClick={() => update("role", r.value)}
                    className={`text-left rounded-xl border-2 p-4 transition ${
                      form.role === r.value
                        ? "border-brand-primary bg-brand-primary/5"
                        : "border-line bg-white hover:border-brand-primary/40"
                    }`}
                  >
                    <div className="font-display font-bold text-ink text-lg">{r.label}</div>
                    <div className="text-xs font-sans text-ink-soft mt-1">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            data-testid="register-submit-button"
            disabled={loading}
            className="w-full mt-8 inline-flex items-center justify-center gap-2 bg-brand-primary text-white font-semibold px-6 py-4 rounded-full hover:bg-brand-primaryHover transition shadow-glow disabled:opacity-60"
          >
            {loading ? "Creating account…" : (
              <>
                Create account <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </motion.form>
      </div>
    </div>
  );
}
