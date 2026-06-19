import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, UserCog, SlidersHorizontal } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { formatApiErrorDetail } from "../lib/utils";

export default function SettingsPage() {
  const { user } = useAuth();
  const [thresholds, setThresholds] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState({});

  const canManage = ["manager", "admin"].includes(user?.role);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    api.get("/thresholds").then(({ data }) => setThresholds(data)).catch(() => {});
    if (isAdmin) {
      api.get("/users").then(({ data }) => setUsers(data)).catch(() => {});
    }
  }, [isAdmin]);

  const updateThresholdLocal = (cat, key, val) => {
    setThresholds((prev) => prev.map((t) => (t.category === cat ? { ...t, [key]: val } : t)));
  };

  const saveThreshold = async (t) => {
    setSaving((s) => ({ ...s, [t.category]: true }));
    try {
      await api.put("/thresholds", {
        category: t.category,
        near_expiry_days: parseInt(t.near_expiry_days, 10),
        critical_days: parseInt(t.critical_days, 10),
      });
      toast.success(`${t.category} thresholds saved`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Save failed");
    } finally {
      setSaving((s) => ({ ...s, [t.category]: false }));
    }
  };

  const changeRole = async (uid, role) => {
    try {
      await api.put(`/users/${uid}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === uid ? { ...u, role } : u)));
      toast.success("Role updated");
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Failed");
    }
  };

  return (
    <div className="space-y-10" data-testid="settings-page">
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-brand-primary mb-2">
          / Settings
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-black text-ink tracking-tight">
          Tune the <span className="italic text-brand-primary">rules</span>.
        </h1>
      </div>

      {/* Thresholds */}
      <div className="bg-surface border border-line rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-brand-primary/10 grid place-items-center">
            <SlidersHorizontal className="h-5 w-5 text-brand-primary" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-ink">Expiry thresholds per category</h3>
            <p className="text-sm text-ink-soft">
              Days before EXP triggering each color. <span className="font-mono">critical &lt; near_expiry</span>.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-brand-cream border-y border-line">
              <tr className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 w-44">Near-expiry days</th>
                <th className="px-4 py-3 w-44">Critical days</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line" data-testid="thresholds-tbody">
              {thresholds.map((t) => (
                <tr key={t.category} data-testid={`threshold-row-${t.category}`}>
                  <td className="px-4 py-3 font-display font-bold text-ink capitalize">{t.category}</td>
                  <td className="px-4 py-3">
                    <input
                      data-testid={`threshold-near-${t.category}`}
                      type="number"
                      min="1"
                      max="365"
                      disabled={!canManage}
                      value={t.near_expiry_days}
                      onChange={(e) => updateThresholdLocal(t.category, "near_expiry_days", e.target.value)}
                      className="w-full bg-white border border-line rounded-lg px-3 py-2 font-mono text-sm focus:border-brand-primary outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      data-testid={`threshold-critical-${t.category}`}
                      type="number"
                      min="1"
                      max="365"
                      disabled={!canManage}
                      value={t.critical_days}
                      onChange={(e) => updateThresholdLocal(t.category, "critical_days", e.target.value)}
                      className="w-full bg-white border border-line rounded-lg px-3 py-2 font-mono text-sm focus:border-brand-primary outline-none"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <button
                        data-testid={`save-threshold-${t.category}`}
                        onClick={() => saveThreshold(t)}
                        disabled={saving[t.category]}
                        className="inline-flex items-center gap-1.5 bg-brand-primary text-white font-semibold text-sm px-4 py-2 rounded-full hover:bg-brand-primaryHover disabled:opacity-60"
                      >
                        <Save className="h-3.5 w-3.5" /> {saving[t.category] ? "Saving" : "Save"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users (admin only) */}
      {isAdmin && (
        <div className="bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-brand-accent/30 grid place-items-center">
              <UserCog className="h-5 w-5 text-brand-dark" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-ink">Team & roles</h3>
              <p className="text-sm text-ink-soft">Admin-only. Promote or demote teammates.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-brand-cream border-y border-line">
                <tr className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 w-44">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line" data-testid="users-tbody">
                {users.map((u) => (
                  <tr key={u.id} data-testid={`user-row-${u.id}`}>
                    <td className="px-4 py-3 font-display font-bold text-ink">{u.name}</td>
                    <td className="px-4 py-3 font-mono text-sm text-ink-soft">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        data-testid={`user-role-${u.id}`}
                        value={u.role}
                        disabled={u.email === user.email}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        className="bg-white border border-line rounded-lg px-3 py-2 font-mono text-sm focus:border-brand-primary outline-none"
                      >
                        <option value="worker">worker</option>
                        <option value="manager">manager</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
