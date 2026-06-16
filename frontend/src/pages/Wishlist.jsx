import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';
import MobileHeader from '../components/MobileHeader';
import { useToast } from '../hooks/use-toast';
import { formatBDT } from '../lib/api';

const Wishlist = () => {
  const { user } = useAuth();
  const { toggle, refresh } = useWishlist();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/auth/me/wishlist'); setItems(data || []); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const remove = async (p) => {
    await toggle(p.id);
    setItems((s) => s.filter((x) => x.id !== p.id));
  };

  const addAndRemove = (p) => {
    addToCart(p, 1);
    toast({ title: 'কার্টে যোগ হয়েছে', description: p.name });
  };

  return (
    <div className="pb-24 lg:pb-12 max-w-5xl mx-auto lg:px-6">
      <MobileHeader title="উইশলিস্ট" back hideSearch />
      <div className="hidden lg:flex items-end justify-between mt-6 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold">উইশলিস্ট</h1>
          <p className="text-sm text-neutral-500 mt-1">পরে কেনার জন্য সংরক্ষিত পণ্য।</p>
        </div>
      </div>

      <div className="px-4 mt-3">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1,2,3,4].map((i) => <div key={i} className="h-56 rounded-2xl bg-neutral-100 animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-10 text-center">
            <Heart className="w-7 h-7 text-emerald-600 mx-auto" />
            <div className="text-[14px] font-semibold mt-2">Your wishlist is empty</div>
            <div className="text-[12px] text-neutral-500 mt-1">Tap the heart on any product to save it for later.</div>
            <Link to="/categories" data-testid="wishlist-browse-btn" className="mt-4 inline-flex items-center gap-1.5 bg-emerald-700 text-white h-10 px-5 rounded-full text-[13px] font-semibold hover:bg-emerald-800 transition-colors">Browse products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items.map((p) => (
              <div key={p.id} data-testid={`wishlist-card-${p.slug}`} className="rounded-2xl bg-white border border-neutral-100 overflow-hidden hover:border-emerald-200 transition-colors">
                <Link to={`/product/${p.slug}`} className="block aspect-square bg-neutral-50">
                  <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                </Link>
                <div className="p-2.5">
                  <Link to={`/product/${p.slug}`} className="text-[13px] font-semibold leading-snug line-clamp-2 min-h-[34px] block">{p.name}</Link>
                  <div className="text-[11px] text-neutral-500">{p.unit}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="text-[14px] font-extrabold">৳{formatBDT(p.price)}</div>
                    <div className="flex items-center gap-1">
                      <button data-testid={`wishlist-remove-${p.slug}`} onClick={() => remove(p)} aria-label="Remove from wishlist" className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-50 text-red-600 transition-colors"><Heart className="w-4 h-4 fill-current" /></button>
                      <button data-testid={`wishlist-add-${p.slug}`} onClick={() => addAndRemove(p)} aria-label="Add to cart" disabled={p.stock === 0} className="w-8 h-8 grid place-items-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 active:scale-95 transition-transform"><ShoppingBag className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
