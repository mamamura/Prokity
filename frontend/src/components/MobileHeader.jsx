import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, Bell, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotifContext';

const MobileHeader = ({ title, back = false, hideSearch = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unread } = useNotifications();
  const [compact, setCompact] = useState(false);

  // Compact mode after user scrolls past 60px (only used on the home header).
  useEffect(() => {
    if (title || back) return; // only home header collapses
    const onScroll = () => setCompact(window.scrollY > 60);
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

  // Home header — user profile left, notification bell right.
  // When user scrolls down, the full-width search bar collapses into an icon
  // sitting next to the bell button.
  return (
    <div className="lg:hidden bg-emerald-700 text-white px-4 sticky top-0 z-30 transition-[padding] duration-200 ease-out" style={{ paddingTop: compact ? 8 : 12, paddingBottom: compact ? 8 : 12 }}>
      <div className="flex items-center justify-between gap-2">
        <Link to={user ? '/profile' : '/login'} className="flex items-center gap-2 -ml-1 pr-2 py-0.5 rounded-full hover:bg-white/10 transition-colors min-w-0">
          <div className={`rounded-full bg-white/20 grid place-items-center text-sm font-extrabold overflow-hidden shrink-0 transition-all duration-200 ${compact ? 'w-8 h-8' : 'w-9 h-9'}`}>
            {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : (user ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />)}
          </div>
          <div className="leading-tight text-left min-w-0">
            <div className="text-[10.5px] opacity-80">{user ? 'স্বাগতম' : 'লগইন করতে'}</div>
            <div className={`font-semibold truncate transition-all ${compact ? 'text-[12px] max-w-[120px]' : 'text-[13px] max-w-[160px]'}`}>{user ? user.name : 'ট্যাপ করুন'}</div>
          </div>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          {/* Compact search icon — appears only when scrolled */}
          <button
            data-testid="home-search-icon-compact"
            onClick={() => navigate('/search')}
            aria-label="Search"
            className={`grid place-items-center rounded-full bg-white/15 hover:bg-white/25 transition-all duration-200 overflow-hidden ${compact ? 'w-10 h-10 opacity-100 ml-0' : 'w-0 h-10 opacity-0 -ml-2 pointer-events-none'}`}
          >
            <Search className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('/notifications')} className="relative w-10 h-10 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 transition-colors">
            <Bell className="w-4.5 h-4.5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-emerald-700">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Full-width search bar — collapses height to 0 when compact */}
      <button
        data-testid="home-search-bar"
        onClick={() => navigate('/search')}
        className={`w-full rounded-full bg-white text-neutral-500 px-4 flex items-center gap-2 text-sm overflow-hidden transition-all duration-200 ease-out ${compact ? 'h-0 mt-0 opacity-0 pointer-events-none' : 'h-11 mt-3 opacity-100'}`}
      >
        <Search className="w-4 h-4" />
        <span>মধু, তেল, মসলা খুঁজুন…</span>
      </button>
    </div>
  );
};

export default MobileHeader;
