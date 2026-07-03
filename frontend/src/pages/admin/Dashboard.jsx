import React, { useEffect, useState } from 'react';
import { Link, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { api, formatBDT } from '../../lib/api';
import { LayoutDashboard, Package, ClipboardList, LogOut, ArrowUpRight, Users, TrendingUp, Clock, BarChart3, FolderTree, Menu, X, Leaf, ChevronRight, MessageCircle, Sparkles, Settings as SettingsIcon, Image as ImageIcon, Tag, Star, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_PATH } from '../../lib/admin-path';

const navItems = [
  { to: ADMIN_PATH, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: `${ADMIN_PATH}/analytics`, label: 'Analytics', icon: BarChart3 },
  { to: `${ADMIN_PATH}/products`, label: 'Products', icon: Package },
  { to: `${ADMIN_PATH}/categories`, label: 'Categories', icon: FolderTree },
  { to: `${ADMIN_PATH}/orders`, label: 'Orders', icon: ClipboardList },
  { to: `${ADMIN_PATH}/users`, label: 'Customers', icon: Users },
  { to: `${ADMIN_PATH}/messages`, label: 'Messages', icon: MessageCircle },
  { to: `${ADMIN_PATH}/reviews`, label: 'Reviews', icon: Star },
  { to: `${ADMIN_PATH}/banners`, label: 'Banners', icon: ImageIcon },
  { to: `${ADMIN_PATH}/coupons`, label: 'Coupons', icon: Tag },
  { to: `${ADMIN_PATH}/newsletter`, label: 'Newsletter', icon: Mail },
  { to: `${ADMIN_PATH}/settings`, label: 'Settings', icon: SettingsIcon },
];

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const link = ({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'text-neutral-700 hover:bg-neutral-100'}`;

  const closeDrawer = () => setDrawerOpen(false);

  // Opt admin panel out of the storefront anti-copy / no-select CSS + listeners.
  useEffect(() => {
    document.body.dataset.admin = '1';
    return () => { delete document.body.dataset.admin; };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Desktop sidebar */}
      <aside className="w-60 bg-white border-r border-neutral-200 p-4 hidden lg:flex flex-col">
        <div className="flex items-center gap-2 px-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-500 grid place-items-center shadow-sm"><Leaf className="w-5 h-5 text-white" /></div>
          <div>
            <div className="font-extrabold text-neutral-900 leading-tight" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', Inter, sans-serif" }}>প্রকৃতির ঘ্রাণ</div>
            <div className="text-[10.5px] text-neutral-500">Admin panel</div>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={link}>
              <it.icon className="w-4 h-4" /> {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-neutral-100">
          <div className="text-[11px] text-neutral-500 px-2">Signed in as</div>
          <div className="text-[13px] font-semibold px-2 mt-0.5 truncate">{user?.email}</div>
          <button onClick={() => { logout(); nav('/'); }} className="mt-3 w-full text-sm flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50"><LogOut className="w-4 h-4" /> Logout</button>
          <Link to="/" className="mt-1 w-full text-xs flex items-center gap-1 px-3 py-2 rounded-xl text-neutral-500 hover:bg-neutral-100">View storefront <ArrowUpRight className="w-3 h-3" /></Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50" onClick={closeDrawer}>
          <div className="absolute inset-0 bg-black/40" />
          <aside onClick={(e) => e.stopPropagation()} className="absolute left-0 top-0 bottom-0 w-72 max-w-[82%] bg-white p-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-500 grid place-items-center"><Leaf className="w-5 h-5 text-white" /></div>
                <div>
                  <div className="font-extrabold leading-tight" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', Inter, sans-serif" }}>প্রকৃতির ঘ্রাণ</div>
                  <div className="text-[10.5px] text-neutral-500">Admin panel</div>
                </div>
              </div>
              <button onClick={closeDrawer} className="w-9 h-9 grid place-items-center rounded-full hover:bg-neutral-100"><X className="w-5 h-5" /></button>
            </div>
            <nav className="space-y-1">
              {navItems.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} onClick={closeDrawer} className={link}>
                  <it.icon className="w-4 h-4" /> {it.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto pt-4 border-t border-neutral-100">
              <div className="text-[11px] text-neutral-500 px-2">Signed in as</div>
              <div className="text-[13px] font-semibold px-2 mt-0.5 truncate">{user?.email}</div>
              <button onClick={() => { logout(); nav('/'); }} className="mt-3 w-full text-sm flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50"><LogOut className="w-4 h-4" /> Logout</button>
              <Link to="/" onClick={closeDrawer} className="mt-1 w-full text-xs flex items-center gap-1 px-3 py-2 rounded-xl text-neutral-500 hover:bg-neutral-100">View storefront <ArrowUpRight className="w-3 h-3" /></Link>
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden bg-white border-b border-neutral-200 px-3 h-14 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setDrawerOpen(true)} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-neutral-100"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-500 grid place-items-center"><Leaf className="w-4 h-4 text-white" /></div>
            <div className="font-extrabold text-sm" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', Inter, sans-serif" }}>প্রকৃতির ঘ্রাণ</div>
          </div>
          <Link to="/" className="text-xs font-semibold text-neutral-600">Shop</Link>
        </div>
        <div className="p-3 md:p-6 lg:p-8 max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    (async () => {
      const [s, o] = await Promise.all([api.get('/admin/stats'), api.get('/admin/orders')]);
      setStats(s.data);
      setRecent(o.data.slice(0, 5));
    })();
  }, []);
  const cards = [
    { i: TrendingUp, label: 'Revenue', value: stats ? `৳${formatBDT(stats.revenue)}` : '—', color: 'bg-emerald-50 text-emerald-700', to: `${ADMIN_PATH}/analytics` },
    { i: ClipboardList, label: 'Orders', value: stats?.orders ?? '—', color: 'bg-blue-50 text-blue-700', to: `${ADMIN_PATH}/orders` },
    { i: Package, label: 'Products', value: stats?.products ?? '—', color: 'bg-amber-50 text-amber-700', to: `${ADMIN_PATH}/products` },
    { i: Users, label: 'Customers', value: stats?.customers ?? '—', color: 'bg-violet-50 text-violet-700', to: `${ADMIN_PATH}/users` },
    { i: Clock, label: 'Pending', value: stats?.pendingOrders ?? '—', color: 'bg-rose-50 text-rose-700', to: `${ADMIN_PATH}/orders` },
  ];
  return (
    <div>
      <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 text-white p-5 md:p-8 relative overflow-hidden mb-5">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/15 text-[10.5px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full">
            <Sparkles className="w-3 h-3" /> Admin overview
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold mt-2.5 leading-tight">Welcome back 👋</h1>
          <p className="text-[13px] md:text-sm opacity-90 mt-1 max-w-md">Here's what's happening at your shop today.</p>
        </div>
        <Leaf className="absolute -right-6 -bottom-6 w-32 h-32 md:w-44 md:h-44 text-white/15 -rotate-12" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3">
        {cards.map((c, i) => (
          <Link key={i} to={c.to} className="rounded-2xl bg-white border border-neutral-100 p-3 md:p-4 hover:border-neutral-300 transition-colors">
            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg grid place-items-center ${c.color}`}><c.i className="w-4 h-4" /></div>
            <div className="text-[10.5px] text-neutral-500 mt-2 md:mt-3">{c.label}</div>
            <div className="text-lg md:text-xl font-extrabold mt-0.5">{c.value}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link to={`${ADMIN_PATH}/products`} className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 text-white p-5 hover:shadow-lg transition-shadow">
          <Package className="w-6 h-6" />
          <div className="font-extrabold text-lg mt-3">Add new product</div>
          <div className="text-[12.5px] opacity-90 mt-0.5">Manage your catalogue, prices, images.</div>
          <div className="text-[12px] mt-3 inline-flex items-center gap-1 font-semibold">Go to products <ChevronRight className="w-3.5 h-3.5" /></div>
        </Link>
        <Link to={`${ADMIN_PATH}/orders`} className="rounded-2xl bg-white border border-neutral-100 p-5 hover:border-neutral-300 transition-colors">
          <ClipboardList className="w-6 h-6 text-blue-600" />
          <div className="font-extrabold text-lg mt-3">Manage orders</div>
          <div className="text-[12.5px] text-neutral-500 mt-0.5">Update status, view delivery details.</div>
          <div className="text-[12px] mt-3 inline-flex items-center gap-1 font-semibold text-blue-700">Go to orders <ChevronRight className="w-3.5 h-3.5" /></div>
        </Link>
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-base">Recent orders</h2>
          <Link to={`${ADMIN_PATH}/orders`} className="text-xs font-semibold text-emerald-700">View all</Link>
        </div>
        <div className="rounded-2xl bg-white border border-neutral-100 overflow-hidden">
          {recent.length === 0 ? (<div className="p-8 text-center text-sm text-neutral-500">No orders yet.</div>) : (
            <>
              {/* Desktop table */}
              <table className="hidden md:table w-full text-sm">
                <thead className="bg-neutral-50 text-[11px] uppercase text-neutral-500">
                  <tr><th className="text-left px-4 py-2">Order</th><th className="text-left px-4 py-2">Customer</th><th className="text-left px-4 py-2">Method</th><th className="text-right px-4 py-2">Total</th><th className="text-left px-4 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id} className="border-t border-neutral-100">
                      <td className="px-4 py-3 font-mono text-xs">{o.orderNo}</td>
                      <td className="px-4 py-3">{o.userName}</td>
                      <td className="px-4 py-3 uppercase text-xs">{o.paymentMethod}</td>
                      <td className="px-4 py-3 text-right font-bold">৳{formatBDT(o.total)}</td>
                      <td className="px-4 py-3 capitalize text-xs">{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-neutral-100">
                {recent.map((o) => (
                  <div key={o.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono text-[11px] text-neutral-500">{o.orderNo}</div>
                        <div className="font-semibold text-sm mt-0.5">{o.userName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-emerald-700">৳{formatBDT(o.total)}</div>
                        <div className="text-[10px] capitalize text-neutral-500 mt-0.5">{o.paymentMethod} · {o.status}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
