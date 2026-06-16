import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Leaf, Heart, Star } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import { formatBDT } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { inWishlist, toggle } = useWishlist();
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const liked = inWishlist(product.id);
  const outOfStock = product.stock === 0;
  const lowStock = !outOfStock && (product.stock ?? 99) <= 5;

  const add = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (outOfStock) return;
    addToCart(product, 1);
    toast({ title: 'কার্টে যোগ হয়েছে', description: product.name });
  };

  const heart = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { toast({ title: 'সেভ করতে লগইন করুন', description: 'উইশলিস্ট আপনার অ্যাকাউন্টের সাথে যুক্ত।' }); nav('/login?next=/wishlist'); return; }
    const r = await toggle(product.id);
    if (!r?.error) toast({ title: r?.inWishlist ? 'উইশলিস্টে যোগ হয়েছে' : 'উইশলিস্ট থেকে সরানো হয়েছে' });
  };

  return (
    <Link to={`/product/${product.slug}`} className="product-card block rounded-2xl bg-white border border-neutral-100 overflow-hidden hover:border-emerald-200 hover:shadow-sm transition-all duration-200">
      <div className="relative aspect-square bg-neutral-50 overflow-hidden">
        {product.discount ? (
          <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-{product.discount}%</span>
        ) : null}
        {product.organic && (
          <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 text-[9.5px] font-semibold px-1.5 py-0.5 rounded">
            <Leaf className="w-2.5 h-2.5" /> Organic
          </span>
        )}
        {/* Heart toggle */}
        <button onClick={heart} data-testid={`product-wishlist-${product.slug}`} aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute bottom-2 right-2 z-10 w-8 h-8 grid place-items-center rounded-full bg-white/85 backdrop-blur shadow-sm hover:bg-white transition-colors ${liked ? 'text-red-500' : 'text-neutral-500 hover:text-red-500'}`}>
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        </button>
        {outOfStock && (
          <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-[2px] z-[5]">
            <span className="bg-neutral-900 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">স্টকে নেই</span>
          </div>
        )}
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = `https://placehold.co/400x400/f5f5f5/525252?text=${encodeURIComponent(product.name.slice(0,16))}`; }}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <div className="p-2.5 space-y-1">
        <h3 className="text-[13px] font-semibold leading-snug text-neutral-900 line-clamp-2 min-h-[34px]">{product.name}</h3>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neutral-500">{product.unit}</span>
          {product.avgRating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-amber-600 font-semibold">
              <Star className="w-3 h-3 fill-current" />{product.avgRating.toFixed(1)}<span className="text-neutral-400 font-normal">({product.reviewCount || 0})</span>
            </span>
          )}
        </div>
        {lowStock && <div className="text-[10.5px] text-amber-600 font-semibold">মাত্র {product.stock}টি বাকি</div>}
        <div className="flex items-end justify-between pt-1">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[14px] font-extrabold text-neutral-900">৳{formatBDT(product.price)}</span>
              {product.oldPrice && (<span className="text-[11px] text-neutral-400 line-through">৳{formatBDT(product.oldPrice)}</span>)}
            </div>
          </div>
          <button onClick={add} aria-label={`Add ${product.name} to cart`} data-testid={`product-add-to-cart-${product.slug}`} disabled={outOfStock}
            className="w-8 h-8 rounded-full bg-emerald-600 text-white grid place-items-center hover:bg-emerald-700 transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
