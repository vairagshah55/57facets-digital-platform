import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

type Theme = "dark" | "light";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = "sf_retailer_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Dark mode toggle is hidden for now — force the retailer UI to light so no one
  // is stuck in dark. (Restore the saved-preference logic when re-enabling dark.)
  const [theme, setTheme] = useState<Theme>("light");

  // Apply/remove class on <html> so portals (dialogs, popovers) also inherit
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("retailer-light");
    } else {
      document.documentElement.classList.remove("retailer-light");
    }
    return () => {
      document.documentElement.classList.remove("retailer-light");
    };
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
