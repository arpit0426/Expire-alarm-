import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  ScanLine,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { logger } from "../lib/logger";

const NAV = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true, testid: "nav-overview" },
  { to: "/app/inventory", label: "Inventory", icon: Boxes, testid: "nav-inventory" },
  { to: "/app/scan", label: "Scan", icon: ScanLine, testid: "nav-scan" },
  { to: "/app/alerts", label: "Alerts", icon: Bell, testid: "nav-alerts" },
  { to: "/app/reports", label: "Reports", icon: BarChart3, testid: "nav-reports" },
  { to: "/app/settings", label: "Settings", icon: Settings, testid: "nav-settings" },
];

function NavItem({ to, end, label, icon: Icon, testid, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      data-testid={testid}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm transition ${
          isActive
            ? "bg-brand-accent text-brand-dark font-semibold shadow-accent"
            : "text-brand-cream/75 hover:text-brand-accent hover:bg-brand-cream/5"
        }`
      }
    >
      <Icon className="h-4.5 w-4.5" strokeWidth={2} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let on = true;
    const load = async () => {
      try {
        const { data } = await api.get("/alerts", { params: { unread_only: true, limit: 50 } });
        if (on) setUnread(data.length);
      } catch (err) {
        logger.warn("Unread-alerts poll failed:", err?.message);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, []);

  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-brand-cream" data-testid="dashboard-layout">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 bg-brand-dark text-brand-cream flex items-center justify-between px-4 py-3">
        <Link to="/app" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-primary grid place-items-center">
            <CheckCircle2 className="h-4 w-4 text-brand-accent" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg">
            fresh<span className="text-brand-accent">track</span>.
          </span>
        </Link>
        <button
          data-testid="mobile-menu-toggle"
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 rounded-lg hover:bg-brand-cream/10"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky lg:top-0 inset-y-0 left-0 z-40 w-72 bg-brand-dark text-brand-cream flex-shrink-0 flex flex-col p-5 transition-transform duration-300 lg:translate-x-0 lg:h-screen ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="sidebar"
      >
        <Link to="/app" className="hidden lg:flex items-center gap-2 px-2 py-2 mb-4">
          <div className="h-9 w-9 rounded-xl bg-brand-primary grid place-items-center shadow-glow">
            <CheckCircle2 className="h-5 w-5 text-brand-accent" strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl tracking-tight">
            fresh<span className="text-brand-accent">track</span>.
          </span>
        </Link>

        <div className="mt-12 lg:mt-2 mb-4 px-3 py-3 bg-brand-cream/5 rounded-xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-cream/50 mb-1">
            Signed in as
          </div>
          <div className="font-display text-lg font-semibold leading-tight">{user?.name || "—"}</div>
          <div className="text-xs text-brand-cream/60 font-mono mt-1">
            {user?.email}
          </div>
          <div className="inline-flex mt-2 px-2 py-0.5 rounded-full bg-brand-accent text-brand-dark text-[10px] font-mono font-bold uppercase tracking-widest">
            {user?.role}
          </div>
        </div>

        <nav className="flex flex-col gap-1.5">
          {NAV.map((n) => (
            <NavItem
              key={n.to}
              {...n}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          {unread > 0 && (
            <Link
              to="/app/alerts"
              data-testid="sidebar-alert-badge"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-accent/15 border border-brand-accent/30"
            >
              <Bell className="h-4 w-4 text-brand-accent" />
              <div className="flex-1">
                <div className="font-display font-bold text-brand-cream text-sm">{unread} new alerts</div>
                <div className="text-xs text-brand-cream/60">tap to view</div>
              </div>
            </Link>
          )}
          <button
            data-testid="logout-button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-brand-cream/70 hover:text-brand-cream hover:bg-brand-cream/5 font-sans text-sm"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Content */}
      <main className="flex-1 pt-16 lg:pt-0 min-w-0">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 py-8 sm:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
