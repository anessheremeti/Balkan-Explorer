import React, { useState } from "react";
import {
  Bell,
  Shield,
  Globe,
  Moon,
  Sun,
  ArrowLeft,
  CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import SettingsSection from "../../components/settings/SettingsSection";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../hooks/useToast";
import { useTranslation } from "react-i18next";

type Settings = {
  theme: "light" | "dark";
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    publicProfile: boolean;
    showLocation: boolean;
  };
};

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  language: "en",
  notifications: {
    email: true,
    push: false,
    marketing: true
  },
  privacy: {
    publicProfile: true,
    showLocation: false
  }
};

/* ---------------------------
   Helper for safe loading
---------------------------- */
const loadSettings = (): Settings => {
  try {
    const stored = localStorage.getItem("app_settings");

    if (!stored) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(stored);

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...(parsed.notifications ?? {})
      },
      privacy: {
        ...DEFAULT_SETTINGS.privacy,
        ...(parsed.privacy ?? {})
      }
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const AppSettings: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const isDark = theme === "dark";
  /* ---------------------------
     Lazy initialization
  ---------------------------- */
  const [settings, setSettings] = useState<Settings>(loadSettings);

  // Sync i18n with the saved language on mount
  const savedLanguage = settings.language;
  React.useEffect(() => {
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleNotification = (key: keyof Settings["notifications"]) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
    }));
  };

  const togglePrivacy = (key: keyof Settings["privacy"]) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: !prev.privacy[key]
      }
    }));
  };

  const handleThemeChange = (nextTheme: "light" | "dark") => {
    setSettings(prev => ({
      ...prev,
      theme: nextTheme
    }));

    setTheme(nextTheme);
  };

  const setLanguage = (language: string) => {
    setSettings(prev => ({ ...prev, language }));
    i18n.changeLanguage(language);
  };

  const saveSettings = () => {
    localStorage.setItem("app_settings", JSON.stringify(settings));
    // Keep i18next LanguageDetector in sync so language persists after reload
    localStorage.setItem("i18nextLng", settings.language);
    showToast(t('apply_settings'), "success");
  };
  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-slate-50/50'} pt-12 pb-24`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="mb-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-sky-500 mb-6"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-semibold">
              {t('back_to_dashboard')}
            </span>
          </Link>

          <h1 className={`text-3xl font-extrabold ${isDark ? 'text-slate-50' : 'text-slate-900'} sm:text-4xl`}>
            {t('settings_title')}
          </h1>

          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('settings_subtitle')}
          </p>
        </div>

        <div className="space-y-8">

          {/* THEME */}
          <SettingsSection
            title={t('appearance')}
            description={t('appearance_desc')}
            icon={theme === "light" ? <Sun size={20}/> : <Moon size={20}/>}
          >
            <div className="grid grid-cols-2 gap-4">

              <button
                onClick={() => handleThemeChange("light")}
                className={`p-4 rounded-xl border transition ${
                  theme === "light"
                    ? "border-sky-500 bg-sky-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Sun />
                <div>{t('light_mode')}</div>
              </button>

              <button
                onClick={() => handleThemeChange("dark")}
                className={`p-4 rounded-xl border transition ${
                  theme === "dark"
                    ? "border-sky-500 bg-sky-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Moon />
                <div>{t('dark_mode')}</div>
              </button>

            </div>
          </SettingsSection>

          {/* NOTIFICATIONS 
          <SettingsSection
            title={t('notifications')}
            description={t('notifications_desc')}
            icon={<Bell size={20}/>}
          >
            {(["email", "push", "marketing"] as const).map((key) => (
              <div key={key} className="flex justify-between items-center py-3">
                <span>{t(`notif_${key}`)}</span>
                <button
                  onClick={() => toggleNotification(key)}
                  className={`w-11 h-6 rounded-full transition ${
                    settings.notifications[key] ? "bg-sky-500" : "bg-slate-300"
                  }`}
                />
              </div>
            ))}
          </SettingsSection>
   */}
          {/* PRIVACY *
          <SettingsSection
            title={t('privacy')}
            description={t('privacy_desc')}
            icon={<Shield size={20}/>}
          >
            {(["publicProfile", "showLocation"] as const).map((key) => (
              <div key={key} className="flex justify-between items-center py-3">
                <span>{t(`privacy_${key}`)}</span>
                <button
                  onClick={() => togglePrivacy(key)}
                  className={`w-11 h-6 rounded-full transition ${
                    settings.privacy[key] ? "bg-sky-500" : "bg-slate-300"
                  }`}
                />
              </div>
            ))}
          </SettingsSection>
     /* }
          {/* LANGUAGE */}
          <SettingsSection
            title={t('language')}
            description={t('language_desc')}
            icon={<Globe size={20}/>}
          >
            <select
              value={settings.language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="en">English</option>
              <option value="sq">Shqip</option>
              <option value="de">Deutsch</option>
            </select>
          </SettingsSection>

          {/* SAVE BUTTON */}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              className="flex items-center gap-2 px-6 py-3 hover:cursor-pointer bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
            >
              <CheckCircle size={18}/>
              {t('apply_settings')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AppSettings;