import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, LogOut, ChevronRight, Phone, Mail, ClipboardList, HelpCircle, Leaf, Bell, Pencil, MessageCircle, MapPin, ShieldCheck, Heart, Search, Package, Trash2, LogIn, UserPlus } from 'lucide-react';
import MobileHeader from '../components/MobileHeader';
import { ADMIN_PATH } from '../lib/admin-path';
import { formatBDT } from '../lib/api';
import { useChat } from '../contexts/ChatContext';

const ProfileRow = ({ icon: Icon, label, to, onClick, danger = false, testid, sub }) => {
  const cls = `w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border border-neutral-100 ${danger ? 'text-red-600' : 'text-neutral-800'} hover:bg-neutral-50 hover:border-emerald-200 transition-all duration-200`;
  const inner = (
    <>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl grid place-items-center ${danger ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <Icon className={`w-4 h-4 ${danger ? 'text-red-600' : 'text-emerald-700'}`} />
        </div>
        <div>
          <div className="text-[14px] font-medium">{label}</div>
          {sub && <div className="text-[11px] text-neutral-500 mt-0.5">{sub}</div>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-neutral-400" />
    </>
  );
  if (to) return <Link to={to} data-testid={testid} className={cls}>{inner}</Link>;
  return <button onClick={onClick} data-testid={testid} className={cls}>{inner}</button>;
};

const GUEST_ORDERS_KEY = 'os_guest_orders';
const useGuestOrders = () => {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    try { setOrders(JSON.parse(localStorage.getItem(GUEST_ORDERS_KEY) || '[]')); } catch { setOrders([]); }
  }, []);
  const remove = (orderNo) => {
    const next = orders.filter((o) => o.orderNo !== orderNo);
    setOrders(next);
    try { localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(next)); } catch (_) {}
  };
  return { orders, remove };
};

const Profile = () => {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { openChat } = useChat();
  const { orders: guestOrders, remove: removeGuestOrder } = useGuestOrders();

  if (!user) return (
    <div className="pb-12 max-w-2xl mx-auto lg:px-6">
      <MobileHeader title="প্রোফাইল" hideSearch />
      <div className="px-6 pt-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 grid place-items-center"><User className="w-7 h-7 text-emerald-700" /></div>
        <h2 className="text-lg font-extrabold mt-4">প্রকৃতির ঘ্রাণে স্বাগতম</h2>
        <p className="text-sm text-neutral-500 mt-1">দ্রুত চেকআউট, উইশলিস্ট ও ঠিকানা সংরক্ষণের জন্য লগইন করুন। লগইন ছাড়াও অর্ডার করতে পারবেন।</p>
        <div className="mt-5 flex flex-col gap-2">
          <Link to="/login" data-testid="profile-signin-link" className="inline-flex items-center justify-center gap-2 bg-emerald-700 text-white px-5 h-11 rounded-full text-sm font-semibold hover:bg-emerald-800 transition-colors">
            <LogIn className="w-4 h-4" /> লগইন করুন
          </Link>
          <Link to="/signup" data-testid="profile-signup-link" className="inline-flex items-center justify-center gap-2 bg-white border border-emerald-700 text-emerald-700 px-5 h-11 rounded-full text-sm font-semibold hover:bg-emerald-50 transition-colors">
            <UserPlus className="w-4 h-4" /> অ্যাকাউন্ট তৈরি করুন
          </Link>
        </div>
      </div>

      {/* Guest helpers */}
      <div className="px-4 mt-8 space-y-2">
        <div className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 px-1">গেস্ট অপশন</div>
        <ProfileRow icon={Search} label="অর্ডার ট্র্যাক করুন" sub="অর্ডার নম্বর ও মোবাইল নম্বর দিয়ে" to="/track" testid="profile-row-track-guest" />
        <ProfileRow icon={MessageCircle} label="হেল্প ও সাপোর্ট" onClick={() => openChat()} testid="profile-row-help-guest" />
      </div>

      {/* Guest's local orders */}
      {guestOrders.length > 0 && (
        <div className="px-4 mt-8">
          <div className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 mb-2 px-1 flex items-center gap-1"><Package className="w-3 h-3" /> আপনার সাম্প্রতিক অর্ডার (এই ডিভাইসে)</div>
          <div className="space-y-2">
            {guestOrders.map((o) => (
              <div key={o.orderNo} data-testid={`guest-order-${o.orderNo}`} className="rounded-2xl bg-white border border-neutral-100 p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 grid place-items-center shrink-0"><Package className="w-4 h-4 text-emerald-700" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-bold text-[13px]">{o.orderNo}</div>
                  <div className="text-[11px] text-neutral-500">৳{formatBDT(o.total)} · {o.itemsCount || 1} আইটেম · {new Date(o.placedAt || Date.now()).toLocaleDateString()}</div>
                </div>
                <Link to={`/track?orderNo=${o.orderNo}&phone=${encodeURIComponent(o.phone || '')}`} className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-emerald-700 text-white text-[11px] font-bold hover:bg-emerald-800">ট্র্যাক</Link>
                <button onClick={() => removeGuestOrder(o.orderNo)} aria-label="Remove" className="w-7 h-7 grid place-items-center rounded-full text-neutral-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center mt-10 text-[10.5px] text-neutral-400">প্রকৃতির ঘ্রাণ · © {new Date().getFullYear()}</div>
    </div>
  );

  return (
    <div className="pb-4 max-w-2xl mx-auto lg:px-6">
      <MobileHeader title="প্রোফাইল" hideSearch />
      <div className="hidden lg:block mt-6 mb-2">
        <h1 className="text-3xl font-extrabold">প্রোফাইল</h1>
      </div>
      <div className="px-4 mt-3">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 text-white p-4 flex items-center gap-3 relative overflow-hidden">
          <div className="w-14 h-14 rounded-full bg-white/15 grid place-items-center text-xl font-extrabold overflow-hidden shrink-0">
            {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-lg truncate">{user.name}</div>
            <div className="text-[12px] opacity-90 flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" /> {user.email}</div>
            <div className="text-[12px] opacity-90 flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" /> {user.phone}</div>
          </div>
          <Link to="/profile/edit" data-testid="profile-edit-btn" className="shrink-0 inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 h-8 rounded-full transition-colors">
            <Pencil className="w-3.5 h-3.5" /> এডিট
          </Link>
        </div>

        <div className="mt-4 space-y-2">
          <ProfileRow icon={MapPin} label="ঠিকানা" to="/profile/addresses" testid="profile-row-addresses" />
          <ProfileRow icon={Heart} label="উইশলিস্ট" to="/wishlist" testid="profile-row-wishlist" />
          <ProfileRow icon={ClipboardList} label="আমার অর্ডার" to="/orders" testid="profile-row-orders" />
          <ProfileRow icon={Search} label="অর্ডার ট্র্যাক" to="/track" testid="profile-row-track" />
          <ProfileRow icon={Bell} label="নোটিফিকেশন" to="/notifications" testid="profile-row-notifications" />
          <ProfileRow icon={MessageCircle} label="মেসেজ" to="/messages" testid="profile-row-messages" />
          {user.role === 'admin' && (
            <ProfileRow icon={ShieldCheck} label="অ্যাডমিন ড্যাশবোর্ড" to={ADMIN_PATH} testid="profile-row-admin" />
          )}
          <ProfileRow icon={Leaf} label="অর্গানিক সার্টিফিকেশন" onClick={() => {}} testid="profile-row-about" />
          <ProfileRow icon={HelpCircle} label="হেল্প ও সাপোর্ট" onClick={() => openChat()} testid="profile-row-help" />
          <ProfileRow icon={LogOut} label="লগআউট" danger onClick={() => { logout(); nav('/'); }} testid="profile-row-logout" />
        </div>

        <div className="text-center mt-8 text-[10.5px] text-neutral-400">
          প্রকৃতির ঘ্রাণ · © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

export default Profile;
