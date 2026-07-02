import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, Bell, Truck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotifContext';
import Logo from './Logo';

const MobileHeader = ({ title, back = false, hideSearch = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unread } = useNotifications();
  const [compact, setCompact] = useState(false);

  // Compact mode after user scrolls past 60px (only used on the home header).
  // Guard against rapid toggling on mobile browsers where scroll events may
  // fire in both directions during momentum — 24px hysteresis prevents jitter.
  useEffect(() => {
    if (title || back) return; // only home header collapses
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setCompact((prev) => {
          const y = window.scrollY;
          if (!prev && y > 80) return true;
          if (prev && y < 40) return false;
          return prev;
        });
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [title, back]);

  if (title || back) {
    return (
      <div className="lg:hidden bg-white border-b border-neutral-100 px-4 h-14 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          {back && (
            <button onClick={() => navigate(-1)} className="-ml-2 w-9 h-9 grid place-items-center rounded-full hover:bg-neutral-100 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-[17px] font-bold text-neutral-900 truncate max-w-[220px]">{title}</h1>
        </div>
        {!hideSearch && (
          <button onClick={() => navigate('/search')} className="w-9 h-9 grid place-items-center rounded-full hover:bg-neutral-100">
            <Search className="w-5 h-5 text-neutral-700" />
          </button>
        )}
      </div>
    );
  }

  // Home header — brand logo on the left, search & bell on the right.
  // The login text is intentionally removed — guests should still feel welcome,
  // and the logo is a clear identity anchor for the brand.
  return (
    <div className="lg:hidden bg-emerald-700 text-white px-4 sticky top-0 z-30 transition-[padding] duration-200 ease-out" style={{ paddingTop: compact ? 8 : 12, paddingBottom: compact ? 8 : 12 }}>
      <div className="flex items-center justify-between gap-2">
        <Link to="/" data-testid="mobile-header-logo" className="flex items-center gap-2 -ml-1 pr-2 py-0.5 rounded-full hover:bg-white/10 transition-colors min-w-0">
          <div className={`rounded-full bg-white grid place-items-center overflow-hidden shrink-0 transition-all duration-200 shadow ring-2 ring-white/30 ${compact ? 'w-9 h-9' : 'w-10 h-10'}`}>
            <Logo size="sm" className="!w-full !h-full" />
          </div>
          <div className="leading-tight text-left min-w-0" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', Inter, sans-serif" }}>
            <div className={`font-extrabold tracking-tight transition-all ${compact ? 'text-[13px]' : 'text-[15px]'}`}>প্রকৃতির ঘ্রাণ</div>
            <div className={`opacity-90 ${compact ? 'text-[9px] hidden' : 'text-[10px]'}`}>খাঁটি পণ্য, সুস্থ জীবন</div>
          </div>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          {/* Compact search icon — smooth scale/fade transition (no width animation to avoid jitter) */}
          <button
            data-testid="home-search-icon-compact"
            onClick={() => navigate('/search')}
            aria-label="Search"
            className="w-10 h-10 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 transition-all duration-200 ease-out"
            style={{
              opacity: compact ? 1 : 0,
              transform: compact ? 'scale(1)' : 'scale(0.7)',
              width: compact ? 40 : 0,
              marginRight: compact ? 0 : -8,
              pointerEvents: compact ? 'auto' : 'none',
              overflow: 'hidden',
            }}
          >
            <Search className="w-4 h-4" />
          </button>
          <Link to="/track" data-testid="mobile-header-track" aria-label="অর্ডার ট্র্যাক" className="w-10 h-10 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 transition-colors">
            <Truck className="w-4 h-4" />
          </Link>
          <button onClick={() => navigate(user ? '/notifications' : '/login?next=/notifications')} className="relative w-10 h-10 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 transition-colors">
            <Bell className="w-4.5 h-4.5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-emerald-700">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Full-width search bar — collapses height smoothly */}
      <button
        data-testid="home-search-bar"
        onClick={() => navigate('/search')}
        className="w-full rounded-full bg-white text-neutral-500 px-4 flex items-center gap-2 text-sm overflow-hidden transition-all duration-200 ease-out"
        style={{
          height: compact ? 0 : 44,
          marginTop: compact ? 0 : 12,
          opacity: compact ? 0 : 1,
          pointerEvents: compact ? 'none' : 'auto',
        }}
      >
        <Search className="w-4 h-4" />
        <span>মধু, তেল, মসলা খুঁজুন…</span>
      </button>
    </div>
  );
};

export default MobileHeader;
