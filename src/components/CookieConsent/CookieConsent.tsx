import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cookie, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "react-i18next";
import { getConsent, setConsent } from "../../lib/consent";

// Non-modal by design (role="region", not "dialog") — a visitor can read the
// planner, start a search, anything, without being blocked. GDPR/ePrivacy
// requires "reject" to be exactly as easy as "accept" (no dark patterns:
// no pre-ticked boxes, no visually-buried decline), so both actions get the
// same size and weight here — only the color signals which is primary.
const CookieConsent: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { t } = useTranslation("footer");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) {
      // Small delay so this doesn't compete with the one-time intro splash
      // animation for attention on a first visit.
      const timer = setTimeout(() => setVisible(true), 900);
      return () => clearTimeout(timer);
    }
  }, []);

  const decide = (value: "accepted" | "rejected") => {
    setConsent(value);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          role="region"
          aria-label={t("cookie_title")}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0, transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:bottom-6 z-100 w-auto sm:w-[380px]"
        >
          <div
            className={`relative rounded-2xl border shadow-2xl p-5 backdrop-blur-sm ${
              isDark
                ? "bg-slate-900/95 border-slate-700"
                : "bg-white/95 border-slate-200"
            }`}
          >
            <button
              type="button"
              onClick={() => decide("rejected")}
              aria-label={t("cookie_dismiss")}
              className={`absolute top-3 right-3 p-1 rounded-lg transition-colors ${
                isDark ? "text-slate-500 hover:bg-slate-800 hover:text-slate-300" : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
              }`}
            >
              <X size={15} />
            </button>

            <div className="flex items-start gap-3 pr-5">
              <div
                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDark ? "bg-slate-800 text-sky-400" : "bg-sky-50 text-sky-600"
                }`}
              >
                <Cookie size={20} />
              </div>
              <div>
                <h2 className={`text-[14px] font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {t("cookie_title")}
                </h2>
                <p className={`text-[12.5px] leading-relaxed mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {t("cookie_desc")}{" "}
                  <Link to="/privacy" className="underline underline-offset-2 hover:text-sky-500 font-medium">
                    {t("cookie_privacy_link")}
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => decide("rejected")}
                className={`flex-1 text-[13px] font-semibold py-2.5 rounded-xl border transition-colors ${
                  isDark
                    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t("cookie_reject")}
              </button>
              <button
                type="button"
                onClick={() => decide("accepted")}
                className="flex-1 text-[13px] font-semibold py-2.5 rounded-xl bg-sky-700 text-white hover:bg-sky-800 transition-colors shadow-sm"
              >
                {t("cookie_accept")}
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
