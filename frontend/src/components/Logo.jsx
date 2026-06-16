import React from 'react';

/**
 * Brand logo component. Renders the প্রকৃতির ঘ্রাণ circular badge from /logo.png.
 * Sizes — sm: 32px, md: 40px, lg: 56px, xl: 80px, xxl: 120px (mobile-friendly defaults).
 */
const Logo = ({ size = 'md', className = '', ring = false, ...props }) => {
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
      src="/logo.png"
      alt="প্রকৃতির ঘ্রাণ"
      data-testid="brand-logo"
      className={`${dim} object-contain rounded-full ${ring ? 'ring-2 ring-white shadow-sm' : ''} ${className}`}
      {...props}
    />
  );
};

export default Logo;
