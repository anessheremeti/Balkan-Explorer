import React, { useEffect, useState } from "react";
import { UserPlus, Plane, Tag, Loader2, AlertTriangle } from "lucide-react";
import { adminService, type AdminOverview, type StatCard } from "../../hooks/adminService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

// ─── Sparkline (pure SVG, area + line) ────────────────────────────────────────

const Sparkline: React.FC<{ series: number[] }> = ({ series }) => {
  const W = 220, H = 44;
  // Compress long windows into ≤ 30 points so the line stays readable
  const step = Math.max(1, Math.ceil(series.length / 30));
  const pts: number[] = [];
  for (let i = 0; i < series.length; i += step) {
    pts.push(series.slice(i, i + step).reduce((a, b) => a + b, 0));
  }
  if (pts.length < 2) pts.push(...pts, 0);
  const max = Math.max(...pts, 1);
  const coords = pts.map((v, i) => [
    (i / (pts.length - 1)) * W,
    H - 4 - (v / max) * (H - 10),
  ]);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-11" preserveAspectRatio="none" aria-hidden>
      <path d={area} fill="#e0f2fe" />
      <path d={line} fill="none" stroke="#1e44b8" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────

const Stat: React.FC<{ label: string; card: StatCard | null; format?: (n: number) => string }> = ({
  label, card, format = n => n.toLocaleString("en-US"),
}) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 pb-2 hover:border-[#2653d9] hover:shadow-md transition-all cursor-default">
    <div className="flex items-center justify-between">
      <p className="text-[13px] text-slate-500 font-medium">{label}</p>
      {card && (
        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
          card.trend >= 0 ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50"
        }`}>
          {card.trend >= 0 ? "+" : ""}{card.trend}%
        </span>
      )}
    </div>
    <p className="text-[26px] font-bold text-slate-900 mt-1 leading-none">
      {card ? format(card.total) : "—"}
    </p>
    <div className="mt-2 -mx-1">
      {card ? <Sparkline series={card.series} /> : <div className="h-11" />}
    </div>
  </div>
);

// ─── Popular destinations bar chart ───────────────────────────────────────────

const BAR_COLORS = ["#16295c", "#1e44b8", "#3b82f6", "#7dd3fc", "#bae6fd"];

const BarChart: React.FC<{ data: AdminOverview["popular"] }> = ({ data }) => {
  const H = 210, PAD_T = 18;
  const max = Math.max(...data.map(d => d.count), 1);
  const niceMax = Math.ceil(max / 4) * 4 || 4;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(niceMax * f));

  return (
    <div className="flex gap-3">
      {/* Y axis */}
      <div className="flex flex-col justify-between text-right text-[10px] text-slate-400 shrink-0" style={{ height: H }}>
        {[...ticks].reverse().map(t => <span key={t}>{t}</span>)}
      </div>
      {/* Bars */}
      <div className="flex-1 grid gap-3" style={{ gridTemplateColumns: `repeat(${data.length || 1}, 1fr)` }}>
        {data.map((d, i) => {
          const h = Math.max(((d.count / niceMax) * (H - PAD_T)), 18);
          const light = i >= 3; // light bars need dark text
          return (
            <div key={d.city} className="flex flex-col items-center justify-end" style={{ height: H }}>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded px-1 py-0.5 mb-1">
                {d.share}%
              </span>
              <div
                className="w-full max-w-14 rounded-md flex items-end justify-center pb-1.5 transition-all"
                style={{ height: h, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                title={`${d.city}: ${d.count} trips`}
              >
                <span className={`text-[11px] font-bold ${light ? "text-slate-700" : "text-white"}`}>
                  {d.count}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Activity icons ───────────────────────────────────────────────────────────

const ACTIVITY_ICON: Record<string, { icon: React.ElementType; cls: string }> = {
  user: { icon: UserPlus, cls: "text-slate-500 bg-slate-100" },
  trip: { icon: Plane, cls: "text-sky-600 bg-sky-50" },
  deal: { icon: Tag, cls: "text-emerald-600 bg-emerald-50" },
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const DashboardScreen: React.FC<{ initial: AdminOverview | null }> = ({ initial }) => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AdminOverview | null>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (days === 30 && initial) { setData(initial); return; }
    setLoading(true);
    adminService.getOverview(days).then(setData).finally(() => setLoading(false));
  }, [days, initial]);

  return (
    <div className="">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-slate-900">Admin Dashboard Overview</h1>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 shadow-sm"
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      {loading && (
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> refreshing…
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
        <Stat label="Total Users" card={data?.cards.users ?? null} />
        <Stat label="Trips Created" card={data?.cards.trips ?? null} />
        <Stat label="Active Deals" card={data?.cards.deals ?? null} />
        <Stat label="Revenue" card={data?.cards.revenue ?? null} format={n => `€${n.toLocaleString("en-US")}`} />
      </div>

      {data?.cards.deals === null && (
        <div className="flex items-start gap-2.5 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[13px] text-amber-800">
            Deals table missing — run <code className="font-mono">server/migrations/001_destination_deals.sql</code> in Supabase SQL Editor.
          </p>
        </div>
      )}

      {/* Activity + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Recent Activity */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-bold text-slate-900 text-[15px]">Recent Activity</h2>
          <div className="mt-4">
            {(data?.activity ?? []).length === 0 && (
              <p className="text-sm text-slate-400 py-6 text-center">No activity yet.</p>
            )}
            {(data?.activity ?? []).map((a, i, arr) => {
              const { icon: Icon, cls } = ACTIVITY_ICON[a.type] ?? ACTIVITY_ICON.user;
              return (
                <div key={`${a.ts}-${i}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cls}`}>
                      <Icon size={13} />
                    </div>
                    {i < arr.length - 1 && (
                      <div className="w-px flex-1 my-1 border-l border-dashed border-slate-200" />
                    )}
                  </div>
                  <div className="pb-4 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{a.text}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{relativeTime(a.ts)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Popular Destinations */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-bold text-slate-900 text-[15px]">Popular Destinations</h2>
          <div className="mt-5">
            {(data?.popular ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No trips yet.</p>
            ) : (
              <>
                <BarChart data={data!.popular} />
                <div className="grid gap-3 mt-1.5 ml-8" style={{ gridTemplateColumns: `repeat(${data!.popular.length}, 1fr)` }}>
                  {data!.popular.map(d => (
                    <p key={d.city} className="text-[11px] text-slate-500 text-center truncate">{d.city}</p>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
