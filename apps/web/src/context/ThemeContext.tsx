import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const noop = () => {};

const defaultThemeContext: ThemeContextValue = {
  theme: 'light',
  isDark: false,
  setTheme: noop,
  toggleTheme: noop,
};

export const ThemeContext = createContext<ThemeContextValue>(defaultThemeContext);

const THEME_STORAGE_KEY = 'keystay_theme';

export interface ThemeProviderProps {
  children?: React.ReactNode;
  initialTheme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Light mode is locked globally across the Front Desk workspace
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(THEME_STORAGE_KEY);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const setTheme = useCallback((_newTheme: Theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: 'light',
      isDark: false,
      setTheme,
      toggleTheme,
    }),
    [setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  return context || defaultThemeContext;
};
