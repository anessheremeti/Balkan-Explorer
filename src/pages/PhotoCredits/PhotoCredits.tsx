import React from "react";
import { useTranslation } from "react-i18next";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { useTheme } from "../../context/ThemeContext";
import { PHOTO_CREDITS } from "../../constants/photoCredits";

const PhotoCredits: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation("pages");
  const isDark = theme === "dark";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const link = `underline underline-offset-2 ${isDark ? "hover:text-sky-400" : "hover:text-sky-700"}`;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-slate-950 text-slate-200" : "bg-white text-slate-900"}`}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 w-full">
        <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight ${isDark ? "text-slate-50" : "text-slate-900"}`}>
          {t("credits_title")}
        </h1>
        <p className={`mt-3 max-w-xl ${muted}`}>{t("credits_intro")}</p>

        <table className="mt-10 w-full text-sm text-left">
          <thead className={muted}>
            <tr className={`border-b ${isDark ? "border-slate-700" : "border-slate-200"}`}>
              <th scope="col" className="py-2 pr-4 font-semibold">{t("credits_photo")}</th>
              <th scope="col" className="py-2 pr-4 font-semibold">{t("credits_author")}</th>
              <th scope="col" className="py-2 font-semibold">{t("credits_license")}</th>
            </tr>
          </thead>
          <tbody>
            {PHOTO_CREDITS.map((c) => (
              <tr key={c.source} className={`border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                <td className="py-3 pr-4">
                  <a href={c.source} target="_blank" rel="noopener noreferrer" className={link}>
                    {c.subject}
                  </a>
                </td>
                <td className="py-3 pr-4">{c.author}</td>
                <td className="py-3">
                  <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer license" className={link}>
                    {c.license}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
      <Footer />
    </div>
  );
};

export default PhotoCredits;
