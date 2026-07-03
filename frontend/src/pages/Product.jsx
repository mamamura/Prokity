import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, formatBDT } from '../lib/api';
import { Minus, Plus, Leaf, Truck, ShieldCheck, RotateCcw, ShoppingBag, Heart, Share2, Star } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import MobileHeader from '../components/MobileHeader';
import ProductCard from '../components/ProductCard';
import Reviews, { Stars } from '../components/Reviews';

const RECENT_KEY = 'os_recent';

const loadRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; } };
const saveRecent = (slug) => {
  try {
    const cur = loadRecent().filter((s) => s !== slug);
    cur.unshift(slug);
    localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, 8)));
  } catch (_) {}
};

const ProductPage = () => {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  const [qty, setQty] = useState(1);
  const [related, setRelated] = useState([]);
  const [recent, setRecent] = useState([]);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const { addToCart } = useCart();
  const { inWishlist, toggle } = useWishlist();
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();

  useEffect(() => {
    setP(null);
    setGalleryIdx(0);
    setSelectedVariant(null);
    (async () => {
      try {
        const { data } = await api.get(`/products/${slug}`);
        setP(data);
        // Auto-select first variant if any
        if (data.variants && data.variants.length > 0) setSelectedVariant(data.variants[0]);
        saveRecent(slug);
      } catch (_) {}
    })();
    (async () => {
      try { const { data } = await api.get(`/products/${slug}/related`); setRelated(data || []); } catch (_) {}
    })();
    // load recent (excluding current)
    (async () => {
      const slugs = loadRecent().filter((s) => s !== slug).slice(0, 6);
      if (!slugs.length) { setRecent([]); return; }
      try {
        const items = await Promise.all(slugs.map((s) => api.get(`/products/${s}`).then((r) => r.data).catch(() => null)));
        setRecent(items.filter(Boolean));
      } catch (_) { setRecent([]); }
    })();
    window.scrollTo(0, 0);
  }, [slug]);

  if (!p) return (<div className="p-8 text-center text-sm text-neutral-500">Loading product…</div>);

  // Effective price + unit + stock — uses selected variant if one is chosen
  const effectivePrice = selectedVariant ? selectedVariant.price : p.price;
  const effectiveOldPrice = selectedVariant?.oldPrice ?? (selectedVariant ? null : p.oldPrice);
  const effectiveUnit = selectedVariant ? selectedVariant.label : p.unit;
  const variantStock = selectedVariant && selectedVariant.stock != null ? selectedVariant.stock : p.stock;
  const outOfStock = variantStock === 0;
  const lowStock = !outOfStock && (variantStock ?? 99) <= 5;
  const liked = inWishlist(p.id);

  // Gallery — main image + any additional images (dedup)
  const galleryImages = Array.from(new Set([p.image, ...(p.images || [])].filter(Boolean)));
  const activeImage = galleryImages[galleryIdx] || p.image;

  const add = () => {
    if (outOfStock) return;
    addToCart({ ...p, price: effectivePrice, oldPrice: effectiveOldPrice, unit: effectiveUnit, variantLabel: selectedVariant?.label }, qty);
    toast({ title: 'কার্টে যোগ হয়েছে', description: `${qty} × ${p.name}${selectedVariant ? ' (' + selectedVariant.label + ')' : ''}` });
  };
  const buy = () => { if (outOfStock) return; addToCart({ ...p, price: effectivePrice, oldPrice: effectiveOldPrice, unit: effectiveUnit, variantLabel: selectedVariant?.label }, qty); nav('/cart'); };
  const heart = async () => {
    if (!user) { nav('/login?next=/product/' + slug); return; }
    const r = await toggle(p.id);
    if (!r?.error) toast({ title: r?.inWishlist ? 'উইশলিস্টে যোগ হয়েছে' : 'উইশলিস্ট থেকে সরানো হয়েছে' });
  };
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: p.name, text: p.description?.slice(0, 100), url }); return; } catch (_) {}
    }
    try { await navigator.clipboard.writeText(url); toast({ title: 'Link copied' }); } catch (_) {}
  };

  return (
    <div className="pb-28 lg:pb-12">
      <MobileHeader title=" " back />
      <div className="max-w-7xl mx-auto lg:px-6 lg:py-8 lg:grid lg:grid-cols-2 lg:gap-10">
        <div className="lg:rounded-3xl lg:overflow-hidden">
          <div className="relative aspect-square bg-transparent">
            {outOfStock && (<div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-[2px] z-10"><span className="bg-neutral-900 text-white text-[12px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">স্টকে নেই</span></div>)}
            <img key={activeImage} src={activeImage} alt={p.name} onError={(e) => { e.currentTarget.src = `https://placehold.co/600/f5f5f5/525252?text=${encodeURIComponent(p.name.slice(0,16))}`; }} className="w-full h-full object-contain animate-in fade-in duration-200" />
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <button onClick={share} aria-label="Share" data-testid="product-share-btn" className="w-9 h-9 grid place-items-center rounded-full bg-white/85 backdrop-blur shadow-sm hover:bg-white transition-colors text-neutral-700"><Share2 className="w-4 h-4" /></button>
              <button onClick={heart} aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'} data-testid="product-wishlist-btn" className={`w-9 h-9 grid place-items-center rounded-full bg-white/85 backdrop-blur shadow-sm hover:bg-white transition-colors ${liked ? 'text-red-500' : 'text-neutral-700 hover:text-red-500'}`}><Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} /></button>
            </div>
          </div>
          {galleryImages.length > 1 && (
            <div className="px-4 lg:px-0 mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {galleryImages.map((img, i) => (
                <button key={i} data-testid={`gallery-thumb-${i}`} onClick={() => setGalleryIdx(i)} className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${galleryIdx === i ? 'border-emerald-600' : 'border-neutral-200 hover:border-emerald-300'}`}>
                  <img src={img} alt="" className="w-full h-full object-contain bg-transparent" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="px-4 mt-4 lg:mt-0 lg:px-0">
          <div className="flex items-center gap-2 mb-1">
            {p.organic && (<span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-1.5 py-0.5 rounded"><Leaf className="w-2.5 h-2.5" /> Organic</span>)}
            <span className="text-[11px] text-neutral-500">{effectiveUnit}</span>
            {lowStock && <span className="text-[10.5px] text-amber-600 font-semibold">মাত্র {variantStock}টি বাকি</span>}
          </div>
          <h1 className="text-xl lg:text-3xl font-extrabold leading-tight text-neutral-900">{p.name}</h1>

          {p.avgRating > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <Stars value={p.avgRating} size={14} />
              <span className="text-[12.5px] font-semibold">{p.avgRating.toFixed(1)}</span>
              <a href="#reviews" className="text-[12px] text-neutral-500 hover:text-emerald-700 transition-colors">({p.reviewCount} review{p.reviewCount !== 1 ? 's' : ''})</a>
            </div>
          )}

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl lg:text-4xl font-extrabold text-neutral-900">৳{formatBDT(effectivePrice)}</span>
            {effectiveOldPrice && effectiveOldPrice > effectivePrice && (<><span className="text-sm lg:text-lg text-neutral-400 line-through">৳{formatBDT(effectiveOldPrice)}</span><span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">-{Math.round((1 - effectivePrice/effectiveOldPrice) * 100)}%</span></>)}
          </div>

          {/* Variant picker */}
          {p.variants && p.variants.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] font-bold text-neutral-700 uppercase mb-1.5">পরিমাণ বেছে নিন</div>
              <div className="flex flex-wrap gap-2">
                {p.variants.map((v, i) => {
                  const active = selectedVariant?.label === v.label;
                  const soldOut = v.stock === 0;
                  return (
                    <button
                      key={i}
                      data-testid={`variant-option-${i}`}
                      type="button"
                      disabled={soldOut}
                      onClick={() => setSelectedVariant(v)}
                      className={`relative rounded-xl border-2 px-3 py-2 text-left transition-all ${active ? 'border-emerald-600 bg-emerald-50 shadow-sm' : 'border-neutral-200 bg-white hover:border-emerald-400'} ${soldOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-[13px] font-bold text-neutral-900">{v.label}</div>
                      <div className="text-[12px] text-emerald-700 font-semibold">৳{formatBDT(v.price)}</div>
                      {soldOut && <div className="absolute inset-0 grid place-items-center rounded-xl bg-white/60"><span className="text-[10px] font-bold text-red-600 uppercase">শেষ</span></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {p.tags && p.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {p.tags.map((t, i) => (<span key={i} className="text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">#{t}</span>))}
            </div>
          )}

          <p className="text-[13.5px] lg:text-base text-neutral-600 leading-relaxed mt-4">{p.description}</p>

          <div className="mt-5 grid grid-cols-3 gap-2 lg:gap-3">
            {[
              { i: Truck, t: 'ফ্রি ডেলিভারি', s: '৳৫০০ এর উপরে' },
              { i: ShieldCheck, t: 'মান নিশ্চয়তা', s: '১০০% অর্গানিক' },
              { i: RotateCcw, t: 'সহজ রিটার্ন', s: '২৪ ঘণ্টায়' },
            ].map((f, i) => (
              <div key={i} className="rounded-xl bg-neutral-50 p-2.5 lg:p-3.5 text-center">
                <f.i className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600 mx-auto" />
                <div className="text-[11px] lg:text-sm font-semibold text-neutral-900 mt-1 leading-tight">{f.t}</div>
                <div className="text-[10px] lg:text-xs text-neutral-500">{f.s}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl bg-neutral-50 p-3">
            <span className="text-sm font-medium text-neutral-700">Quantity</span>
            <div className="flex items-center bg-white border border-neutral-200 rounded-full h-10">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-full grid place-items-center text-neutral-700"><Minus className="w-4 h-4" /></button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(p.stock || 99, q + 1))} className="w-10 h-full grid place-items-center text-neutral-700"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Desktop action buttons (inline) */}
          <div className="hidden lg:flex items-center gap-3 mt-6">
            <button data-testid="product-add-to-cart" onClick={add} disabled={outOfStock} className="flex-1 h-12 rounded-full border border-emerald-600 text-emerald-700 font-semibold inline-flex items-center justify-center gap-2 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <ShoppingBag className="w-4 h-4" /> {outOfStock ? 'স্টকে নেই' : 'কার্টে যোগ'}
            </button>
            <button data-testid="product-buy-now" onClick={buy} disabled={outOfStock} className="flex-1 h-12 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">এখনই কিনুন</button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div id="reviews" className="max-w-7xl mx-auto px-4 lg:px-6 mt-2">
        <Reviews product={p} onChange={() => api.get(`/products/${slug}`).then((r) => setP(r.data)).catch(() => {})} />
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 lg:px-6 mt-8">
          <div className="flex items-end justify-between mb-3">
            <h3 className="text-base lg:text-lg font-extrabold">আপনি এগুলোও পছন্দ করতে পারেন</h3>
            <Link to={`/category/${p.category}`} className="text-[12px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors">সব দেখুন</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {related.slice(0, 5).map((rp) => <ProductCard key={rp.id} product={rp} />)}
          </div>
        </div>
      )}

      {/* Recently viewed */}
      {recent.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 lg:px-6 mt-8">
          <h3 className="text-base lg:text-lg font-extrabold mb-3">সম্প্রতি দেখা</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {recent.slice(0, 5).map((rp) => <ProductCard key={rp.id} product={rp} />)}
          </div>
        </div>
      )}

      {/* Mobile sticky action bar */}
      <div className="lg:hidden fixed bottom-16 inset-x-0 bg-white border-t border-neutral-100 px-4 py-3 flex items-center gap-2 z-30">
        <button data-testid="product-add-to-cart-mobile" onClick={add} disabled={outOfStock} className="flex-1 h-12 rounded-full border border-emerald-600 text-emerald-700 font-semibold inline-flex items-center justify-center gap-2 hover:bg-emerald-50 disabled:opacity-50">
          <ShoppingBag className="w-4 h-4" /> {outOfStock ? 'স্টকে নেই' : 'কার্টে যোগ'}
        </button>
        <button data-testid="product-buy-now-mobile" onClick={buy} disabled={outOfStock} className="flex-1 h-12 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">এখনই কিনুন</button>
      </div>
    </div>
  );
};

export default ProductPage;
