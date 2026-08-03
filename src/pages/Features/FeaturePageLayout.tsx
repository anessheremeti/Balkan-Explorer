import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { useTheme } from "../../context/ThemeContext";

interface FeaturePageLayoutProps {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: { label: string; to: string };
  children: React.ReactNode;
}

// Shared shell for the feature-focused marketing pages (itinerary builder,
// route mapping, PDF export, 24/7 support) — same hero + CTA pattern as
// HowItWorks, factored out since four pages need it identically.
const FeaturePageLayout: React.FC<FeaturePageLayoutProps> = ({ icon, eyebrow, title, subtitle, cta, children }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-slate-950 text-slate-200" : "bg-white text-slate-900"}`}>
      <Navbar />
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 w-full">
        <div className="text-center space-y-5 mb-16">
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${
            isDark ? "bg-slate-800 text-sky-400" : "bg-sky-50 text-sky-600"
          }`}>
            {icon}
          </div>
          <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-sky-400" : "text-sky-600"}`}>
            {eyebrow}
          </p>
          <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight ${isDark ? "text-slate-50" : "text-slate-900"}`}>
            {title}
          </h1>
          <p className={`text-sm sm:text-base max-w-xl mx-auto leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {subtitle}
          </p>
          <div className="pt-2">
            <Link
              to={cta.to}
              className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
            >
              {cta.label}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="space-y-6">{children}</div>
      </section>
      <Footer />
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`flex gap-4 p-5 sm:p-6 rounded-2xl border transition-all ${
      isDark
        ? "bg-slate-900 border-slate-700 hover:shadow-lg hover:shadow-slate-900/40"
        : "bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-200/50"
    }`}>
      <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
        isDark ? "bg-slate-800 text-sky-400" : "bg-sky-50 text-sky-600"
      }`}>
        {icon}
      </div>
      <div>
        <h3 className={`font-bold text-[15px] mb-1 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          {title}
        </h3>
        <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {description}
        </p>
      </div>
    </div>
  );
};

export default FeaturePageLayout;
