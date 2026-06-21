import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardLayout from "./pages/DashboardLayout";
import OverviewPage from "./pages/OverviewPage";
import InventoryPage from "./pages/InventoryPage";
import ScanPage from "./pages/ScanPage";
import AlertsPage from "./pages/AlertsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center bg-brand-cream paisley"
        style={{ backgroundColor: "#F7EFE0" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-brand-primary grid place-items-center shadow-glow">
            <span className="h-3 w-3 rounded-full bg-brand-accent animate-pulse_dot" />
          </div>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            Loading workspace…
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/app"
            element={
              <Protected>
                <DashboardLayout />
              </Protected>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
