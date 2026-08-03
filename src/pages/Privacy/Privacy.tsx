import React from "react";
import { Shield, Cookie, Database, Users, Mail, Trash2 } from "lucide-react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { useTheme } from "../../context/ThemeContext";

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; isDark: boolean }> = ({
  icon, title, children, isDark,
}) => (
  <div className={`rounded-2xl border p-6 sm:p-7 ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-100"}`}>
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-slate-800 text-sky-400" : "bg-sky-50 text-sky-600"}`}>
        {icon}
      </div>
      <h2 className={`font-bold text-base ${isDark ? "text-slate-100" : "text-slate-900"}`}>{title}</h2>
    </div>
    <div className={`text-sm leading-relaxed space-y-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
      {children}
    </div>
  </div>
);

const Privacy: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-slate-950 text-slate-200" : "bg-white text-slate-900"}`}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 w-full">
        <div className="text-center mb-12 space-y-3">
          <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-sky-400" : "text-sky-600"}`}>
            Legal
          </p>
          <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight ${isDark ? "text-slate-50" : "text-slate-900"}`}>
            Privacy Policy
          </h1>
          <p className={`text-sm max-w-lg mx-auto ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Last updated August 2026. Plain-language summary of what we collect, why, and how to control it.
          </p>
        </div>

        <div className="space-y-5">
          <Section icon={<Database size={18} />} title="What we collect" isDark={isDark}>
            <p>
              <strong>Account data:</strong> name and email, if you create an account (guests get a random local ID instead — no personal data required to plan a trip).
            </p>
            <p>
              <strong>Trip data:</strong> the destinations, dates, budget and travel style you enter to build an itinerary, plus the resulting day-by-day plan.
            </p>
            <p>
              <strong>Deal inquiries:</strong> if you contact an agency about a deal, we store the name, email, phone and message you provide so the agency can reply.
            </p>
            <p>
              <strong>Cookies & analytics:</strong> only if you accept them — see below.
            </p>
          </Section>

          <Section icon={<Cookie size={18} />} title="Cookies" isDark={isDark}>
            <p>
              A small number of cookies remember your theme, your consent choice, and (only after you accept) anonymized analytics events — which pages are visited and which features are used — so we can improve the planner.
            </p>
            <p>
              Nothing non-essential loads until you click "Accept all" on the cookie banner. You can change your mind anytime by clearing your browser's local storage for this site.
            </p>
          </Section>

          <Section icon={<Users size={18} />} title="Who we share data with" isDark={isDark}>
            <p>We don't sell your data. A few specialized services process it on our behalf, strictly to run the app:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — hosts our database and handles login (EU-region).</li>
              <li><strong>PostHog</strong> — anonymized product analytics (EU-hosted), only after cookie consent.</li>
              <li><strong>Google Maps / OpenRouter (AI)</strong> — power the map view and day-theme generation; trip details are sent to generate your itinerary, never sold or reused for advertising.</li>
              <li><strong>Resend</strong> — sends your deal inquiry, as an email, to the specific agency you contacted.</li>
              <li><strong>OpenStreetMap / OpenTripMap</strong> — public place data sources; no personal data is sent to them.</li>
            </ul>
          </Section>

          <Section icon={<Trash2 size={18} />} title="Deleting your data" isDark={isDark}>
            <p>
              Delete your account anytime from Account Settings to remove your profile and saved trips. To request deletion of data tied to a guest session or a deal inquiry, email us — see below — and we'll remove it within 30 days.
            </p>
          </Section>

          <Section icon={<Mail size={18} />} title="Contact us" isDark={isDark}>
            <p>
              Questions about this policy, or a data request? Reach us through the{" "}
              <a href="/contact" className="text-sky-500 font-medium hover:underline">Contact page</a>.
            </p>
          </Section>

          <div className={`flex items-center gap-2 text-xs justify-center pt-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            <Shield size={13} />
            This is a plain-language summary provided for transparency, not formal legal advice.
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
