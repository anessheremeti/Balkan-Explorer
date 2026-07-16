import React, { useEffect, useMemo, useState } from "react";
import { Search, Loader2, Globe2, Building, Plane, Trophy, Tag } from "lucide-react";
import { BALKAN_DESTINATIONS } from "../../constants/allowedDestinations";
import { adminService, type Deal } from "../../hooks/adminService";

const FLAGS: Record<string, string> = {
  Kosovo: "🇽🇰",
  Albania: "🇦🇱",
  "North Macedonia": "🇲🇰",
  Montenegro: "🇲🇪",
};

const DestinationsScreen: React.FC = () => {
  const [tripCounts, setTripCounts] = useState<Record<string, number>>({});
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("All");

  useEffect(() => {
    Promise.all([adminService.getDestinationStats(), adminService.getDeals()])
      .then(([counts, dealList]) => { setTripCounts(counts); setDeals(dealList); })
      .catch(() => { /* screen still renders the curated list */ })
      .finally(() => setLoading(false));
  }, []);

  const tripsFor = (city: string) => tripCounts[city.toLowerCase()] ?? 0;
  const dealsFor = (city: string) => deals.filter(d => d.city.toLowerCase() === city.toLowerCase()).length;

  const totals = useMemo(() => {
    const cities = BALKAN_DESTINATIONS.flatMap(r => [...r.cities]);
    const totalTrips = cities.reduce((s, c) => s + tripsFor(c), 0);
    const top = [...cities].sort((a, b) => tripsFor(b) - tripsFor(a))[0];
    return {
      countries: BALKAN_DESTINATIONS.length,
      cities: cities.length,
      trips: totalTrips,
      top: top && tripsFor(top) > 0 ? top : "—",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripCounts]);

  const maxTrips = useMemo(
    () => Math.max(...BALKAN_DESTINATIONS.flatMap(r => r.cities.map(c => tripsFor(c))), 1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tripCounts]
  );

  const visibleRegions = BALKAN_DESTINATIONS
    .filter(r => countryFilter === "All" || r.country === countryFilter)
    .map(r => ({
      ...r,
      cities: r.cities.filter(c => !query.trim() || c.toLowerCase().includes(query.trim().toLowerCase())),
    }))
    .filter(r => r.cities.length > 0);

  const kpis = [
    { label: "Countries", value: totals.countries, icon: Globe2, cls: "text-sky-600 bg-sky-50" },
    { label: "Cities", value: totals.cities, icon: Building, cls: "text-violet-600 bg-violet-50" },
    { label: "Trips planned", value: totals.trips, icon: Plane, cls: "text-emerald-600 bg-emerald-50" },
    { label: "Most popular", value: totals.top, icon: Trophy, cls: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Destinations</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Curated allowlist of plannable destinations, with real usage data
          </p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search city…"
            className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-[13px] w-44 sm:w-56 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
        {kpis.map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cls}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-900 truncate leading-tight">
                {loading && label !== "Countries" && label !== "Cities" ? "…" : value}
              </p>
              <p className="text-[12px] text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Country filter chips */}
      <div className="flex flex-wrap gap-2 mt-5">
        {["All", ...BALKAN_DESTINATIONS.map(r => r.country)].map(c => (
          <button
            key={c}
            onClick={() => setCountryFilter(c)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition ${
              countryFilter === c
                ? "bg-[#2653d9] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {c !== "All" && <span className="mr-1.5">{FLAGS[c]}</span>}
            {c}
          </button>
        ))}
      </div>

      {/* Country sections */}
      {loading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-[#2653d9]" />
        </div>
      ) : visibleRegions.length === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-400">No cities match "{query}".</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleRegions.map(region => (
            <div key={region.country} className="bg-white border border-slate-200 rounded-xl overflow-hidden h-fit">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                <h2 className="font-bold text-slate-800 text-[14px]">
                  <span className="mr-2">{FLAGS[region.country]}</span>
                  {region.country}
                </h2>
                <span className="text-[11px] text-slate-400 font-semibold">
                  {region.cities.length} cities
                </span>
              </div>
              <ul>
                {[...region.cities]
                  .sort((a, b) => tripsFor(b) - tripsFor(a))
                  .map(city => {
                    const trips = tripsFor(city);
                    const cityDeals = dealsFor(city);
                    return (
                      <li key={city} className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                        <span className="w-28 shrink-0 text-[13px] font-medium text-slate-700 truncate">{city}</span>
                        {/* Usage bar */}
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#2653d9]"
                            style={{ width: `${(trips / maxTrips) * 100}%` }}
                          />
                        </div>
                        <span className={`w-14 text-right text-[12px] font-semibold ${trips > 0 ? "text-slate-700" : "text-slate-300"}`}>
                          {trips} trip{trips !== 1 ? "s" : ""}
                        </span>
                        <span className={`w-14 text-right text-[11px] font-semibold flex items-center justify-end gap-1 ${cityDeals > 0 ? "text-emerald-600" : "text-slate-300"}`}>
                          <Tag size={10} />
                          {cityDeals}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4">
        Cities are defined in code (allowedDestinations.ts) and mirrored on the server allowlist ·
        the <Tag size={10} className="inline mx-0.5" /> column shows active deals per city.
      </p>
    </div>
  );
};

export default DestinationsScreen;
