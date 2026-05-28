import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Send } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

type Theme = "light" | "dark";

const Footer: React.FC = () => {
  const [theme, setTheme] = useState<Theme>("light");
  const { t } = useTranslation("footer");

  useEffect(() => {
    const loadTheme = () => {
      try {
        const stored = localStorage.getItem("app_settings");
        if (!stored) return;

        const parsed = JSON.parse(stored);
        if (parsed?.theme === "dark") {
          setTheme("dark");
        } else {
          setTheme("light");
        }
      } catch (err) {
        console.error("Failed to parse app_settings", err);
      }
    };

    loadTheme();

    // optional: listen for theme changes from other tabs
    window.addEventListener("storage", loadTheme);
    return () => window.removeEventListener("storage", loadTheme);
  }, []);

  const isDark = theme === "dark";

  const linkClass = `text-sm transition-colors duration-200 ${
    isDark ? "text-slate-400 hover:text-[#0ea5e9]" : "text-slate-500 hover:text-[#0ea5e9]"
  }`;

  return (
    <footer
      className={`${
        isDark
          ? "bg-gray-900 border-t border-slate-600"
          : "bg-white border-t border-slate-100"
      } pt-16 pb-8 px-4 sm:px-6 lg:px-8 relative`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="bg-[#0ea5e9] p-[6px] rounded-[10px] mr-3">
                <Send
                  size={20}
                  className="text-white fill-white rotate-[-15deg] translate-x-[-1px] translate-y-[1px]"
                />
              </div>

              <span
                className={`text-xl font-bold tracking-tight ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                BalkanExplorer
              </span>
            </div>

            <p
              className={`text-sm leading-relaxed max-w-xs ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {t('brand_description')}
            </p>
          </div>

          {/* Company */}
          <div>
            <h3
              className={`text-sm font-bold uppercase tracking-wider mb-6 ${ isDark ? "text-white" : "text-slate-900" }`}
            >
              {t('company')}
            </h3>

            <ul className="space-y-4">
              <li>
                <Link to="/about" className={linkClass}>
                  {t('about_us')}
                </Link>
              </li>

              <li>
                <Link to="/travel-tips" className={linkClass}>
                  {t('travel_tips')}
                </Link>
              </li>

              <li>
                <Link to="/contact" className={linkClass}>
                  {t('contact_us')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3
              className={`text-sm font-bold uppercase tracking-wider mb-6 ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {t('resources')}
            </h3>

            <ul className="space-y-4">
              <li>
                <Link to="/destinations" className={linkClass}>
                  {t('destinations')}
                </Link>
              </li>

              <li>
                <Link to="/community" className={linkClass}>
                  {t('community')}
                </Link>
              </li>

              <li>
                <Link to="/help-center" className={linkClass}>
                  {t('help_center')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3
              className={`text-sm font-bold uppercase tracking-wider mb-6 ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {t('newsletter')}
            </h3>

            <div className="flex items-center space-x-2">
              <input
                type="email"
                placeholder={t('your_email')}
                className={`w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 ${ isDark ? "text-white" : "text-slate-900"} text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] transition-all duration-200`}
              />

              <button
                className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white p-2.5 rounded-lg transition-colors duration-200 shadow-sm"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div
          className={`pt-8 border-t flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 ${
            isDark ? "border-slate-700" : "border-slate-100"
          }`}
        >
          <p
            className={`text-sm ${
              isDark ? "text-slate-400" : "text-slate-400"
            }`}
          >
            {t('copyright')}
          </p>
        </div>
      </div>

      {/* Floating Export Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-8 right-8 bg-[#0f172a] text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center space-x-3 z-50 hover:bg-slate-800 transition-colors duration-200"
      >
        <FileText className="w-5 h-5 text-slate-300" />
        <span className="font-bold text-sm tracking-tight">
          {t('export_pdf')}
        </span>
      </motion.button>
    </footer>
  );
};

export default Footer;