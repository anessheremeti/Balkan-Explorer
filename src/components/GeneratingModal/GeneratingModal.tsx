import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Compass } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "react-i18next";

interface GeneratingModalProps {
  open: boolean;
}

// Cycles through a few concrete status lines so the wait feels like visible
// progress rather than a frozen spinner — matches the real phases the
// backend actually goes through (place sourcing, then AI theming), just
// without wiring a live progress percentage across two components.
const STATUS_KEYS = ["gm_status_1", "gm_status_2", "gm_status_3", "gm_status_4"] as const;
const STATUS_INTERVAL_MS = 2400;

/**
 * Mobile-only "generating" overlay. The existing progress card in
 * PlanSection lives far below the fold on phones, so a visitor who just
 * tapped "Build My Itinerary" sees nothing happen until they scroll. This
 * sits as a bottom sheet instead — visible the instant generation starts,
 * gone the instant it's done — driven by the caller's actual loading state,
 * not a timer. Desktop is untouched: `sm:hidden` removes this entirely
 * above the sm breakpoint, where the inline progress card is already
 * on-screen next to the form.
 */
const GeneratingModal: React.FC<GeneratingModalProps> = ({ open }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { t } = useTranslation("itinerary");
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setStatusIndex(0);
      return;
    }
    const id = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_KEYS.length);
    }, STATUS_INTERVAL_MS);
    return () => clearInterval(id);
  }, [open]);

  // Body-scroll lock while the sheet is up — but only below the `sm`
  // breakpoint, where the sheet actually renders (it's `sm:hidden` below).
  // Above it the component still mounts (open can be true on desktop too,
  // since `open` mirrors the real generation state regardless of screen
  // size), so without this check desktop scrolling would silently lock
  // during generation despite no visible modal.
  useEffect(() => {
    if (!open) return;
    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    if (!isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="sm:hidden fixed inset-0 z-200">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute inset-0 backdrop-blur-sm ${isDark ? "bg-slate-950/70" : "bg-slate-900/40"}`}
          />

          <motion.div
            role="status"
            aria-live="polite"
            aria-label={t("gm_headline")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className={`absolute bottom-0 left-0 right-0 rounded-t-3xl px-6 pt-8 pb-10 border-t ${
              isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-100"
            }`}
            style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
          >
            {/* Grabber — signals "sheet", reinforces it'll dismiss itself when done */}
            <div className={`mx-auto mb-6 h-1 w-10 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />

            <div className="relative w-20 h-20 mx-auto mb-6">
              {[0, 1].map((ring) => (
                <motion.span
                  key={ring}
                  className="absolute inset-0 rounded-full border-2 border-sky-400"
                  initial={{ opacity: 0.5, scale: 0.7 }}
                  animate={{ opacity: 0, scale: 1.6 }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: ring * 1.1,
                  }}
                />
              ))}
              <div className={`absolute inset-0 rounded-full flex items-center justify-center ${
                isDark ? "bg-slate-800" : "bg-sky-50"
              }`}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                >
                  <Compass size={30} className="text-sky-500" strokeWidth={2} />
                </motion.div>
              </div>
            </div>

            <h2 className={`text-center text-lg font-bold tracking-tight ${isDark ? "text-slate-50" : "text-slate-900"}`}>
              {t("gm_headline")}
            </h2>
            <p className={`text-center text-sm mt-1.5 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t("gm_subtitle")}
            </p>

            <div className="mt-6 h-1 rounded-full overflow-hidden bg-sky-100 dark:bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600"
                animate={{ x: ["-100%", "180%"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: "45%" }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={statusIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className={`text-center text-xs font-medium mt-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                {t(STATUS_KEYS[statusIndex])}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GeneratingModal;
