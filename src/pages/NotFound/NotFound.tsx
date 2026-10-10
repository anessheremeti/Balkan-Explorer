import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import Seo from "../../components/Seo/Seo";
import { useTheme } from "../../context/ThemeContext";

// Netlify serves this route with a real 404 status (see netlify.toml), so
// crawlers drop dead URLs instead of indexing them as soft 404s.
const NotFound: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-slate-950 text-slate-200" : "bg-white text-slate-900"}`}>
      <Seo title="Page not found" noindex />
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full text-center space-y-4">
        <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-sky-400" : "text-sky-600"}`}>404</p>
        <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight ${isDark ? "text-slate-50" : "text-slate-900"}`}>
          Page not found
        </h1>
        <p className={`text-sm max-w-md mx-auto ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          The page you're looking for doesn't exist or has moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link to="/" className="px-6 py-3 rounded-xl bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold text-sm transition-colors">
            Plan a trip
          </Link>
          <Link
            to="/destinations"
            className={`px-6 py-3 rounded-xl border font-bold text-sm transition-colors ${
              isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            Browse destinations
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
