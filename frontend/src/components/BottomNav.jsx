import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

const items = [
  { to: '/', label: 'হোম', icon: Home, exact: true },
  { to: '/categories', label: 'ক্যাটাগরি', icon: LayoutGrid },
  { to: '/cart', label: 'কার্ট', icon: ShoppingBag, badge: true },
  { to: '/profile', label: 'প্রোফাইল', icon: User },
];

const BottomNav = () => {
  const { pathname } = useLocation();
  const { cartCount } = useCart();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 z-40">
      <div className="grid grid-cols-4 h-16 max-w-md mx-auto">
        {items.map((it) => {
          const active = it.exact ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + '/');
          return (
            <Link key={it.to} to={it.to} className="relative flex flex-col items-center justify-center gap-0.5 transition-colors">
              <it.icon className={`w-5 h-5 ${active ? 'text-emerald-600' : 'text-neutral-500'}`} />
              <span className={`text-[10.5px] font-medium ${active ? 'text-emerald-600' : 'text-neutral-500'}`}>{it.label}</span>
              {it.badge && cartCount > 0 && (
                <span className="absolute top-1.5 right-[28%] bg-red-500 text-white text-[9px] font-semibold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">{cartCount}</span>
              )}
              {active && <span className="absolute top-0 w-8 h-0.5 bg-emerald-600 rounded-b-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
