import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { formatApiErrorDetail } from "../lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/app";

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="login-page">
      {/* Left visual */}
      <div className="relative bg-brand-dark text-brand-cream hidden lg:block grain overflow-hidden">
        <div className="absolute -top-32 -left-20 w-[500px] h-[500px] rounded-full bg-brand-primary/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-brand-accent/30 blur-3xl" />
        <div className="relative h-full flex flex-col p-12 xl:p-16">
          <Link to="/" className="flex items-center gap-2 mb-auto">
            <div className="h-9 w-9 rounded-xl bg-brand-primary grid place-items-center shadow-glow">
              <CheckCircle2 className="h-5 w-5 text-brand-accent" strokeWidth={2.5} />
            </div>
            <span className="font-display text-2xl tracking-tight">
              fresh<span className="text-brand-accent">track</span>.
            </span>
          </Link>
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-brand-accent mb-4">
              / Workspace login
            </div>
            <h1 className="font-display text-5xl xl:text-6xl font-black leading-[0.95] tracking-tight">
              Welcome back. <br />
              <span className="italic text-brand-accent">Scan smart.</span>
            </h1>
            <p className="mt-6 text-brand-cream/70 max-w-md text-lg">
              Sign in to your workspace and pick up where your inventory left off.
            </p>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-col items-center justify-center px-6 py-12 bg-brand-cream">
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
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
            Sign in
          </h2>
          <p className="text-ink-soft mb-8">
            New here?{" "}
            <Link to="/register" className="text-brand-primary font-semibold underline underline-offset-4">
              Create an account
            </Link>
            .
          </p>

          <div className="space-y-5">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-2">
                Email
              </label>
              <input
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white border border-line rounded-xl px-4 py-3.5 text-ink placeholder:text-ink-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none font-sans"
              />
            </div>
          </div>

          <button
            data-testid="login-submit-button"
            disabled={loading}
            className="w-full mt-8 inline-flex items-center justify-center gap-2 bg-brand-primary text-white font-semibold px-6 py-4 rounded-full hover:bg-brand-primaryHover transition shadow-glow disabled:opacity-60"
          >
            {loading ? "Signing in…" : (
              <>
                Sign in <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="mt-8 text-xs font-mono text-ink-muted bg-white border border-line rounded-xl p-4">
            <div className="uppercase tracking-[0.18em] mb-2">Demo admin</div>
            <div>admin@inventory.com / Admin@12345</div>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
