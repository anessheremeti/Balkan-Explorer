import React, { useEffect, useState } from "react";
import { ShieldCheck, Server, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { API_BASE } from "../../constants/api";

interface HealthReport {
  status: string;
  ts: string;
  providers?: Record<string, { state?: string; failures?: number } | unknown>;
  aiModels?: { model: string; state?: string }[];
}

const SettingsScreen: React.FC = () => {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const email = (() => {
    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) return null;
      return (JSON.parse(atob(token.split(".")[1])) as { email?: string }).email ?? null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then(r => (r.ok ? r.json() : null))
      .then(setHealth)
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl">
      <h1 className="text-[22px] font-bold text-slate-900">Settings</h1>
      <p className="text-[13px] text-slate-500 mt-0.5">Admin access and system status</p>

      {/* Admin access */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mt-5">
        <h2 className="font-bold text-slate-900 text-[15px] flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-500" />
          Admin access
        </h2>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-50">
            <span className="text-slate-500">Signed in as</span>
            <span className="font-semibold text-slate-800">{email ?? "—"}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-50">
            <span className="text-slate-500">Role</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600">Admin</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500">Managing admins</span>
            <span className="text-slate-600 text-[13px]">
              edit <code className="font-mono bg-slate-100 px-1 rounded">ADMIN_EMAILS</code> on the server
            </span>
          </div>
        </div>
      </div>

      {/* System health */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mt-4">
        <h2 className="font-bold text-slate-900 text-[15px] flex items-center gap-2">
          <Server size={16} className="text-[#2653d9]" />
          System health
        </h2>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#2653d9]" />
          </div>
        ) : !health ? (
          <p className="text-sm text-slate-400 py-6 text-center">API unreachable</p>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">API status</span>
              <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                <CheckCircle2 size={14} /> {health.status}
              </span>
            </div>
            {(health.aiModels ?? []).map(m => {
              const ok = (m.state ?? "closed") === "closed"; // circuit closed = healthy
              return (
                <div key={m.model} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-slate-500 font-mono text-[12px] truncate pr-3">{m.model}</span>
                  <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${ok ? "text-emerald-600" : "text-red-500"}`}>
                    {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {ok ? "healthy" : "circuit open"}
                  </span>
                </div>
              );
            })}
            <p className="text-[11px] text-slate-400 pt-1">
              Last checked {new Date(health.ts).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsScreen;
