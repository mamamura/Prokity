import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Package, Gift, AlertCircle, CheckCheck } from 'lucide-react';
import { useNotifications } from '../contexts/NotifContext';
import { useAuth } from '../contexts/AuthContext';
import MobileHeader from '../components/MobileHeader';

const typeIcon = { order: Package, system: Bell, promo: Gift };
const typeColor = {
  order: 'bg-blue-50 text-blue-600',
  system: 'bg-emerald-50 text-emerald-600',
  promo: 'bg-amber-50 text-amber-600',
};

const timeAgo = (iso) => {
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'এইমাত্র';
    if (diff < 3600) return `${Math.floor(diff / 60)} মিনিট আগে`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ঘণ্টা আগে`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} দিন আগে`;
    return d.toLocaleDateString();
  } catch { return ''; }
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const { items, loading, markRead, markAllRead, unread, refresh } = useNotifications();

  // When user views the notifications page, mark all as read so badge clears
  React.useEffect(() => {
    if (user && unread > 0) markAllRead();
    refresh();
    // eslint-disable-next-line
  }, [user]);

  if (!user) {
    return (
      <div className="pb-4 max-w-2xl mx-auto lg:px-6">
        <MobileHeader title="নোটিফিকেশন" back hideSearch />
        <div className="px-6 py-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 grid place-items-center"><Bell className="w-7 h-7 text-emerald-600" /></div>
          <h2 className="text-lg font-extrabold mt-4">নোটিফিকেশন দেখতে লগইন করুন</h2>
          <p className="text-sm text-neutral-500 mt-1">অর্ডার আপডেট, অফার ও অ্যাকাউন্ট অ্যালার্ট এখানে দেখা যাবে।</p>
          <Link to="/login?next=/notifications" className="inline-flex mt-5 items-center gap-2 bg-emerald-600 text-white px-5 h-11 rounded-full text-sm font-semibold">লগইন</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4 max-w-2xl mx-auto lg:px-6">
      <MobileHeader title="নোটিফিকেশন" back hideSearch />
      <div className="hidden lg:flex items-center justify-between mt-6 mb-4">
        <div>
          <h1 className="text-3xl font-extrabold">নোটিফিকেশন</h1>
          <p className="text-sm text-neutral-500 mt-1">{unread} অপঠিত · মোট {items.length}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1.5">
            <CheckCheck className="w-4 h-4" /> সব পড়া হিসেবে চিহ্নিত করুন
          </button>
        )}
      </div>
      {unread > 0 && (
        <div className="lg:hidden px-4 pt-3 flex items-center justify-between">
          <div className="text-[12px] text-neutral-500">{unread} অপঠিত</div>
          <button onClick={markAllRead} className="text-[12px] font-semibold text-emerald-700 inline-flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5" /> সব পড়া
          </button>
        </div>
      )}
      <div className="px-4 mt-3 lg:px-0 space-y-2">
        {loading ? (
          <div className="py-10 text-center text-sm text-neutral-500">লোড হচ্ছে…</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle className="w-9 h-9 text-neutral-300 mx-auto" />
            <h2 className="text-base font-bold mt-3">এখনো কোনো নোটিফিকেশন নেই</h2>
            <p className="text-xs text-neutral-500 mt-1">কিছু ঘটলে আমরা আপনাকে জানাব।</p>
          </div>
        ) : items.map((n) => {
          const Icon = typeIcon[n.type] || Bell;
          const color = typeColor[n.type] || typeColor.system;
          return (
            <button
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`w-full text-left rounded-2xl border p-3 flex items-start gap-3 transition-colors ${n.read ? 'bg-white border-neutral-100' : 'bg-emerald-50/50 border-emerald-200'}`}
            >
              <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[13.5px] font-semibold text-neutral-900 leading-tight">{n.title}</div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />}
                </div>
                <div className="text-[12.5px] text-neutral-600 mt-1 leading-snug">{n.body}</div>
                <div className="text-[11px] text-neutral-400 mt-1.5">{timeAgo(n.createdAt)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsPage;
