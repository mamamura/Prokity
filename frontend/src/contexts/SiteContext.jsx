import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { THEMES, findTheme, buildThemeCss } from '../lib/themes';

const SiteContext = createContext(null);

const DEFAULTS = {
  siteName: 'প্রকৃতির ঘ্রাণ',
  tagline: 'খাঁটি পণ্য, সুস্থ জীবন',
  logoUrl: '',
  brandColor: '#047857',
  brandColorDark: '#065f46',
  themeId: 'emerald',
  showChatWidget: true,
  showTracker: true,
  showNewsletter: true,
};

/**
 * Provides admin-managed site settings globally, injects the selected
 * theme's CSS overrides into <head>, and updates <meta theme-color>.
 */
export const SiteProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/settings/site');
        setSettings({ ...DEFAULTS, ...data });
      } catch (_) { /* keep defaults on failure */ }
    })();
  }, []);

  // Apply theme whenever it changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const theme = findTheme(settings.themeId);
    let styleEl = document.getElementById('brand-theme-css');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'brand-theme-css';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = buildThemeCss(theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.primary);
  }, [settings.themeId]);

  const refresh = async () => {
    try {
      const { data } = await api.get('/settings/site');
      setSettings({ ...DEFAULTS, ...data });
    } catch (_) {}
  };

  return <SiteContext.Provider value={{ ...settings, refresh, themes: THEMES }}>{children}</SiteContext.Provider>;
};

export const useSite = () => useContext(SiteContext) || { ...DEFAULTS, themes: THEMES, refresh: () => {} };
