import React from 'react';
import { useSite } from '../contexts/SiteContext';

/**
 * Brand logo component. Uses admin-uploaded logoUrl if available,
 * otherwise falls back to /logo.png. Sizes tuned for mobile-first UI.
 */
const Logo = ({ size = 'md', className = '', ring = false, ...props }) => {
  const site = useSite();
  const src = site?.logoUrl || '/logo.png';
  const dim = {
    xs: 'w-7 h-7',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    xxl: 'w-28 h-28',
  }[size] || 'w-10 h-10';
  return (
    <img
      src={src}
      alt={site?.siteName || 'প্রকৃতির ঘ্রাণ'}
      data-testid="brand-logo"
      onError={(e) => { if (e.currentTarget.src !== window.location.origin + '/logo.png') e.currentTarget.src = '/logo.png'; }}
      className={`${dim} object-contain rounded-full ${ring ? 'ring-2 ring-white shadow-sm' : ''} ${className}`}
      {...props}
    />
  );
};

export default Logo;
