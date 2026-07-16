import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Building2, CalendarClock, Flame, ImageOff, X, Loader2, CheckCircle2, Wand2, Heart } from "lucide-react";
import posthog from "posthog-js";
import { API_BASE } from "../../constants/api";
import { findDestinationOption } from "../../constants/allowedDestinations";
import {LOCATION_INPUT_REGEX} from '../../validations/tripFormValidation'
interface Deal {
  id: string;
  city: string;
  country: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  agency: string | null;
  valid_until: string | null;
  image_url: string | null;
}

interface DealsShowcaseProps {
  isDark: boolean;
  /** Optional country filter — e.g. the region selected on the Destinations page */
  country?: string | null;
}

// Email of the logged-in user, decoded from the stored Supabase JWT
function sessionEmail(): string {
  try {
    const token = sessionStorage.getItem("access_token");
    if (!token) return "";
    return (JSON.parse(atob(token.split(".")[1])) as { email?: string }).email ?? "";
  } catch {
    return "";
  }
}

/**
 * Public "Hot Deals" strip: travel-agency offers added via the admin dashboard.
 * Each deal offers two actions:
 *  - "I'm interested" → lead-capture modal → POST /api/deals/:id/inquire
 *  - "Plan this trip" → prefills the main form (destination + budget) and navigates home
 */
const DealsShowcase: React.FC<DealsShowcaseProps> = ({ isDark, country }) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [inquiryDeal, setInquiryDeal] = useState<Deal | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetch(`${API_BASE}/api/deals`)
      .then(r => (r.ok ? r.json() : []))
      .then((all: Deal[]) => {
        const today = new Date().toISOString().split("T")[0];
        setDeals(all.filter(d => !d.valid_until || d.valid_until >= today));
      })
      .catch(() => setDeals([]));
  }, []);

  const planTrip = (deal: Deal) => {
    const label = `${deal.city}, ${deal.country}`;
    // Reuse the existing Mainpage prefill channel (same as Destinations cards)
    const resolved = findDestinationOption(label)?.value ?? label;
    localStorage.setItem("selectedDestination", JSON.stringify(resolved));
    if (deal.price != null && deal.price >= 500) {
      localStorage.setItem("selectedBudget", String(Math.round(deal.price)));
    }
    posthog.capture("deal_plan_trip", { deal_id: deal.id, city: deal.city });
    navigate("/");
  };

  const visible = country ? deals.filter(d => d.country === country) : deals;
  if (visible.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
          <Flame size={16} className="text-orange-500" />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            Hot Deals
          </h2>
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Limited offers from local travel agencies
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.slice(0, 6).map(d => (
          <article
            key={d.id}
            className={`rounded-2xl border overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col ${
              isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
            }`}
          >
            {/* Photo */}
            <div className="relative h-40 shrink-0">
              {d.image_url ? (
                <img src={d.image_url} alt={d.title} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${
                  isDark ? "bg-slate-700" : "bg-slate-100"
                }`}>
                  <ImageOff size={24} className={isDark ? "text-slate-500" : "text-slate-300"} />
                </div>
              )}
              {d.price != null && (
                <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                  {d.price} {d.currency}
                </span>
              )}
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col flex-1">
              <p className={`text-xs font-semibold flex items-center gap-1 ${isDark ? "text-sky-400" : "text-sky-600"}`}>
                <Tag size={11} />
                {d.city}, {d.country}
              </p>
              <h3 className={`font-bold text-[15px] mt-1 leading-snug ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                {d.title}
              </h3>
              {d.description && (
                <p className={`text-[13px] mt-1.5 leading-relaxed line-clamp-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {d.description}
                </p>
              )}
              <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                {d.agency && (
                  <span className="flex items-center gap-1">
                    <Building2 size={10} />
                    {d.agency}
                  </span>
                )}
                {d.valid_until && (
                  <span className="flex items-center gap-1">
                    <CalendarClock size={10} />
                    until {new Date(d.valid_until).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-1">
                <button
                  onClick={() => setInquiryDeal(d)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold py-2 rounded-xl transition"
                >
                  <Heart size={13} />
                  I'm interested
                </button>
                <button
                  onClick={() => planTrip(d)}
                  title="Prefill the trip form with this destination"
                  className={`flex-1 flex items-center justify-center gap-1.5 text-[13px] font-semibold py-2 rounded-xl border transition ${
                    isDark
                      ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Wand2 size={13} />
                  Plan this trip
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {inquiryDeal && (
        <InquiryModal deal={inquiryDeal} isDark={isDark} onClose={() => setInquiryDeal(null)} />
      )}
    </section>
  );
};

// ─── Inquiry modal ────────────────────────────────────────────────────────────

const InquiryModal: React.FC<{ deal: Deal; isDark: boolean; onClose: () => void }> = ({ deal, isDark, onClose }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(sessionEmail());
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const nameHandler = (e:React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.value === '' || LOCATION_INPUT_REGEX.test(e.target.value)){
      setName(e.target.value)
    }
  }
    const emailHandler = (e:React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.value === '' || LOCATION_INPUT_REGEX.test(e.target.value)){
      setEmail(e.target.value)
    }
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/deals/${deal.id}/inquire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          message: message || undefined,
          userId: sessionStorage.getItem("user_id") ?? undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not submit — try again");
      }
      if(name === '' || email === ''){
        throw new Error('You must fill name and email fields')
      }
      posthog.capture("deal_inquiry", { deal_id: deal.id, city: deal.city });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const inputCls = `w-full px-3 py-2.5 rounded-xl border text-sm ${
    isDark
      ? "bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400"
      : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400"
  }`;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative rounded-2xl shadow-2xl w-full max-w-sm p-5 ${isDark ? "bg-slate-800" : "bg-white"}`}>
        <button onClick={onClose} aria-label="Close"
          className={`absolute top-4 right-4 p-1 rounded-lg ${isDark ? "text-slate-400 hover:bg-slate-700" : "text-slate-400 hover:bg-slate-100"}`}>
          <X size={16} />
        </button>

        {sent ? (
          <div className="text-center py-6">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <h3 className={`mt-3 font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              Request sent!
            </h3>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {deal.agency ?? "The agency"} will contact you about "{deal.title}" within 24 hours.
            </p>
            <button onClick={onClose}
              className="mt-5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition">
              Done
            </button>
          </div>
        ) : (
          <>
            <p className={`text-xs font-semibold ${isDark ? "text-sky-400" : "text-sky-600"}`}>
              {deal.city}, {deal.country}
            </p>
            <h3 className={`font-bold text-[16px] mt-0.5 pr-6 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {deal.title}
            </h3>
            <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Leave your contact details and {deal.agency ?? "the agency"} will reach out to you.
            </p>

            <form onSubmit={submit} className="mt-4 space-y-2.5">
              <input  required value={name} onChange={nameHandler}
                placeholder="Your name" maxLength={80} className={inputCls} />
              <input required type="email" value={email} onChange={emailHandler}
                placeholder="Email" className={inputCls} />
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Phone (optional)" maxLength={30} className={inputCls} />
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Message (optional)" rows={2} maxLength={500} className={inputCls} />

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button type="submit" disabled={sending}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50">
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Heart size={15} />}
                {sending ? "Sending…" : "Send request"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default DealsShowcase;
