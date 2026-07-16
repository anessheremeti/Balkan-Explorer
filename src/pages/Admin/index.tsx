import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutGrid, Users, Compass, Tag, Settings as SettingsIcon,
  Send, ShieldAlert, Loader2, ArrowLeft, LogOut, MessageSquare,
} from "lucide-react";
import { adminService, type AdminOverview } from "../../hooks/adminService";
import DashboardScreen from "./DashboardScreen";
import UsersScreen from "./UsersScreen";
import DestinationsScreen from "./DestinationsScreen";
import DealsScreen from "./DealsScreen";
import InquiriesScreen from "./InquiriesScreen";
import SettingsScreen from "./SettingsScreen";

type Screen = "dashboard" | "users" | "destinations" | "deals" | "inquiries" | "settings";
type Access = "checking" | "granted" | "unauthenticated" | "forbidden";

const NAV: { id: Screen; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "users", label: "Users", icon: Users },
  { id: "destinations", label: "Destinations", icon: Compass },
  { id: "deals", label: "Deals", icon: Tag },
  { id: "inquiries", label: "Inquiries", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const AdminDashboard: React.FC = () => {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [access, setAccess] = useState<Access>("checking");
  const [initialOverview, setInitialOverview] = useState<AdminOverview | null>(null);

  // The overview call doubles as the access check:
  // 401 = not logged in, 403 = logged in but not on ADMIN_EMAILS.
  useEffect(() => {
    adminService
      .getOverview(30)
      .then(o => { setInitialOverview(o); setAccess("granted"); })
      .catch((err: Error & { status?: number }) => {
        setAccess(err.status === 403 ? "forbidden" : "unauthenticated");
      });
  }, []);

  if (access !== "granted") {
    return (
      <div className="min-h-screen bg-[#f4f6fa] flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md w-full shadow-sm">
          {access === "checking" ? (
            <>
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#2653d9]" />
              <p className="mt-3 text-sm text-slate-500">Checking access…</p>
            </>
          ) : (
            <>
              <ShieldAlert className="w-10 h-10 mx-auto text-red-400" />
              <h2 className="mt-3 text-lg font-bold text-slate-800">
                {access === "forbidden" ? "Admin access required" : "Please log in"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {access === "forbidden"
                  ? "This account is not on the admin list."
                  : "Log in with an admin account to open the dashboard."}
              </p>
              <Link
                to={access === "forbidden" ? "/" : "/login"}
                className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-xl bg-[#2653d9] text-white text-sm font-semibold hover:bg-[#1e44b8] transition"
              >
                <ArrowLeft size={15} />
                {access === "forbidden" ? "Back to home" : "Go to login"}
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f4f6fa]">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-16 lg:w-56 shrink-0 bg-[#0d1b3e] flex flex-col sticky top-0 h-screen">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 px-3 lg:px-5 h-16 shrink-0">
          <div className="bg-[#0ea5e9] p-1.5 rounded-[10px] shrink-0">
            <Send size={16} className="text-white fill-white rotate-[-15deg] translate-x-[-1px] translate-y-[1px]" />
          </div>
          <span className="hidden lg:block text-white font-bold text-[15px] tracking-tight">
            BalkanExplorer
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-2.5 lg:px-3 mt-2 space-y-1">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = screen === id;
            return (
              <button
                key={id}
                onClick={() => setScreen(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#1c3164] text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Icon size={17} className="shrink-0" />
                <span className="hidden lg:block">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile */}
        <Link
          to="/"
          title="Back to app"
          className="flex items-center gap-2.5 px-3 lg:px-4 py-4 border-t border-white/10 hover:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            A
          </div>
          <span className="hidden lg:block text-slate-400 text-sm flex-1">User profile</span>
          <LogOut size={14} className="hidden lg:block text-slate-500" />
        </Link>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 px-4 sm:px-8 py-7 overflow-x-hidden">
        {screen === "dashboard" && <DashboardScreen initial={initialOverview} />}
        {screen === "users" && <UsersScreen />}
        {screen === "destinations" && <DestinationsScreen />}
        {screen === "deals" && <DealsScreen />}
        {screen === "inquiries" && <InquiriesScreen />}
        {screen === "settings" && <SettingsScreen />}
      </main>
    </div>
  );
};

export default AdminDashboard;
