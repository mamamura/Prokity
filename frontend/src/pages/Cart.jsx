import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, Truck, Percent, Tag, Sparkles } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { formatBDT } from '../lib/api';
import MobileHeader from '../components/MobileHeader';

const CartPage = () => {
  const { cart, updateQty, removeFromCart, subtotal, delivery, total, siteDiscount, siteDiscountPercent, siteDiscountLabel, tax, taxPercent, minOrderAmount } = useCart();
  const nav = useNavigate();

  const freeAt = 500;
  const remaining = Math.max(0, freeAt - (subtotal - siteDiscount));
  const belowMin = minOrderAmount > 0 && subtotal < minOrderAmount;

  return (
    <div className="pb-32 lg:pb-12 max-w-3xl mx-auto lg:px-6">
      <MobileHeader title={`কার্ট (${cart.length})`} back />
      <div className="hidden lg:block mt-6 mb-4">
        <h1 className="text-3xl font-extrabold">আপনার কার্ট ({cart.length})</h1>
      </div>
      {cart.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 grid place-items-center">
            <ShoppingBag className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-lg font-extrabold mt-4">আপনার কার্ট খালি</h2>
          <p className="text-sm text-neutral-500 mt-1">তাজা অর্গানিক পণ্য যোগ করে শুরু করুন।</p>
          <Link to="/" data-testid="cart-start-shopping-btn" className="inline-flex mt-5 items-center gap-2 bg-emerald-600 text-white px-5 h-11 rounded-full text-sm font-semibold hover:bg-emerald-700 transition-colors">কেনাকাটা শুরু করুন</Link>
        </div>
      ) : (
        <>
          {siteDiscountPercent > 0 && (
            <div className="px-4 mt-3">
              <div className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white p-3 flex items-center gap-2 animate-in fade-in duration-200">
                <Sparkles className="w-4 h-4 shrink-0" />
                <div className="text-[12.5px] leading-tight">
                  <span className="font-extrabold">{siteDiscountLabel || 'সাইট ডিসকাউন্ট'}</span> চলছে — সব পণ্যে <span className="font-extrabold">{siteDiscountPercent}% ছাড়!</span>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 mt-3 space-y-2">
            {cart.map((it) => (
              <div key={it.id} data-testid={`cart-item-${it.slug || it.id}`} className="flex items-center gap-3 p-2.5 rounded-2xl border border-neutral-100">
                <img src={it.image} alt={it.name} onError={(e) => { e.currentTarget.src = `https://placehold.co/100/f5f5f5/525252?text=img`; }} className="w-16 h-16 rounded-xl object-cover bg-neutral-50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold line-clamp-2">{it.name}</div>
                  <div className="text-[11px] text-neutral-500">{it.unit}</div>
                  <div className="mt-0.5 text-[14px] font-extrabold text-emerald-700">৳{formatBDT(it.price * it.qty)}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button onClick={() => removeFromCart(it.id)} aria-label="Remove" className="w-7 h-7 grid place-items-center rounded-full text-neutral-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  <div className="flex items-center bg-emerald-50 rounded-full h-8">
                    <button onClick={() => updateQty(it.id, it.qty - 1)} className="w-7 h-full grid place-items-center text-emerald-700"><Minus className="w-3 h-3" /></button>
                    <span className="w-6 text-center text-xs font-bold text-emerald-700">{it.qty}</span>
                    <button onClick={() => updateQty(it.id, it.qty + 1)} className="w-7 h-full grid place-items-center text-emerald-700"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 mt-4">
            <div className="rounded-2xl bg-neutral-50 p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-neutral-600">সাবটোটাল</span><span className="font-semibold">৳{formatBDT(subtotal)}</span></div>
              {siteDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-700"><span className="flex items-center gap-1"><Percent className="w-3.5 h-3.5" /> ডিসকাউন্ট ({siteDiscountPercent}%)</span><span className="font-semibold">-৳{formatBDT(siteDiscount)}</span></div>
              )}
              {tax > 0 && (
                <div className="flex items-center justify-between"><span className="text-neutral-600 flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> ভ্যাট/ট্যাক্স ({taxPercent}%)</span><span className="font-semibold">৳{formatBDT(tax)}</span></div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> ডেলিভারি</span>
                <span className="font-semibold">{delivery === 0 ? <span className="text-emerald-600">ফ্রি</span> : `৳${formatBDT(delivery)}`}</span>
              </div>
              {delivery > 0 && remaining > 0 && (<div className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">আরও ৳{formatBDT(remaining)} যোগ করলে ফ্রি ডেলিভারি!</div>)}
              {belowMin && (<div className="text-[11px] text-red-700 bg-red-50 rounded-lg px-2 py-1.5">সর্বনিম্ন অর্ডার ৳{formatBDT(minOrderAmount)} — আরও ৳{formatBDT(minOrderAmount - subtotal)} যোগ করুন।</div>)}
              <div className="border-t border-dashed border-neutral-200 my-1" />
              <div className="flex items-center justify-between text-base"><span className="font-semibold">মোট</span><span data-testid="cart-total" className="font-extrabold text-emerald-700">৳{formatBDT(total)}</span></div>
            </div>
          </div>

          <div className="lg:hidden fixed bottom-16 inset-x-0 bg-white border-t border-neutral-100 px-4 py-3 z-30">
            <button data-testid="cart-checkout-btn" disabled={belowMin} onClick={() => nav('/checkout')} className="w-full h-12 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              চেকআউটে যান · ৳{formatBDT(total)}
            </button>
          </div>
          <div className="hidden lg:block max-w-7xl mx-auto px-6 mt-4">
            <button data-testid="cart-checkout-btn-desktop" disabled={belowMin} onClick={() => nav('/checkout')} className="w-full lg:w-auto lg:px-8 h-12 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              চেকআউটে যান · ৳{formatBDT(total)}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CartPage;
