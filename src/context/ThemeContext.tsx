import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "app_settings";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
const [themeState, setThemeState] = useState<Theme>(() => {
  const saved = localStorage.getItem("app_settings");
  const parsed = saved ? JSON.parse(saved) : {};
  return parsed.theme || "light";
});

  // Apply theme class to <html> and keep app_settings.theme in sync
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    if (themeState === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      const base = existing ? JSON.parse(existing) : {};
      const updated = { ...base, theme: themeState };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  }, [themeState]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
  };

  return (
    <ThemeContext.Provider value={{ theme: themeState , setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
};

