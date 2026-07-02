import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const SiteContext = createContext(null);

const DEFAULTS = {
  siteName: 'প্রকৃতির ঘ্রাণ',
  tagline: 'খাঁটি পণ্য, সুস্থ জীবন',
  logoUrl: '',
  brandColor: '#047857',
  brandColorDark: '#065f46',
  showChatWidget: true,
  showTracker: true,
  showNewsletter: true,
};

/**
 * Provides admin-managed site settings (branding + feature flags) globally.
 * Reads /settings/site once on mount and applies brandColor as CSS variables.
 */
export const SiteProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULTS);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/settings/site');
        const merged = { ...DEFAULTS, ...data };
        setSettings(merged);
        // Apply brand color as CSS variables for legacy components / inline styles
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--brand', merged.brandColor);
          document.documentElement.style.setProperty('--brand-dark', merged.brandColorDark);
        }
      } catch (_) { /* keep defaults on failure */ }
    })();
  }, []);
  return <SiteContext.Provider value={settings}>{children}</SiteContext.Provider>;
};

export const useSite = () => useContext(SiteContext) || DEFAULTS;
