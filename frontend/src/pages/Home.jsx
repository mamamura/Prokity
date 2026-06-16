import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Leaf, ShieldCheck, Truck, Sparkles, PackageSearch } from 'lucide-react';
import { api, formatBDT } from '../lib/api';
import ProductCard from '../components/ProductCard';
import MobileHeader from '../components/MobileHeader';

const Skeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-2 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-neutral-100 overflow-hidden animate-pulse">
        <div className="aspect-square bg-neutral-100" />
        <div className="p-2.5 space-y-2">
          <div className="h-3 bg-neutral-100 rounded w-3/4" />
          <div className="h-3 bg-neutral-100 rounded w-1/2" />
          <div className="h-4 bg-neutral-100 rounded w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

const Home = () => {
  const [cats, setCats] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [all, setAll] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [c, f, a, b] = await Promise.all([
          api.get('/categories'),
          api.get('/products', { params: { featured: true } }),
          api.get('/products'),
          api.get('/banners'),
        ]);
        setCats(c.data);
        setFeatured(f.data);
        setAll(a.data);
        setBanners(b.data || []);
      } finally { setLoading(false); }
    })();
  }, []);

  const hero = banners[0];

  return (
    <div className="pb-4">
      <MobileHeader />

      {/* Promo banner */}
      <div className="px-4 mt-3 max-w-7xl mx-auto lg:px-6 lg:mt-6">
        <div className="relative rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 text-white p-5 lg:p-12 overflow-hidden">
          {hero?.image && <img src={hero.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />}
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1 bg-white/15 text-[10.5px] lg:text-xs font-semibold px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" /> এই সপ্তাহের ফসল
            </div>
            <h2 className="text-2xl lg:text-5xl font-extrabold mt-2 leading-tight whitespace-pre-line">{hero?.title || 'খাঁটি অর্গানিক\nতাজা পণ্য'}</h2>
            <p className="text-[12.5px] lg:text-base opacity-90 mt-1 lg:mt-3">{hero?.subtitle || '৳৫০০ এর উপরে অর্ডারে ফ্রি ডেলিভারি'}</p>
            <button data-testid="home-shop-now-btn" onClick={() => nav(hero?.ctaLink || '/categories')} className="mt-3 lg:mt-5 inline-flex items-center gap-1.5 bg-white text-emerald-700 text-[12.5px] lg:text-sm font-semibold px-3.5 lg:px-5 h-9 lg:h-11 rounded-full hover:bg-emerald-50 transition-colors hover:scale-105 active:scale-95 transition-transform">
              {hero?.ctaLabel || 'এখনই কিনুন'} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <Leaf className="absolute -right-4 -bottom-4 w-32 h-32 lg:w-64 lg:h-64 text-white/15 -rotate-12" />
        </div>
      </div>

      {/* Trust badges */}
      <div className="px-4 mt-4 max-w-7xl mx-auto lg:px-6 grid grid-cols-3 gap-2 lg:gap-4">
        {[
          { i: Leaf, t: '১০০% অর্গানিক' },
          { i: Truck, t: 'সেইম-ডে ডেলিভারি' },
          { i: ShieldCheck, t: 'কোয়ালিটি গ্যারান্টি' },
        ].map((it, i) => (
          <div key={i} className="rounded-xl bg-emerald-50 p-2.5 lg:p-4 text-center">
            <it.i className="w-4 h-4 lg:w-6 lg:h-6 text-emerald-600 mx-auto" />
            <div className="text-[10.5px] lg:text-sm font-semibold text-emerald-800 mt-1 lg:mt-2 leading-tight">{it.t}</div>
          </div>
        ))}
      </div>

      {/* Order tracker — prominent CTA so guests can quickly track without an account */}
      <div className="px-4 mt-4 max-w-7xl mx-auto lg:px-6 lg:mt-6">
        <Link
          to="/track"
          data-testid="home-track-card"
          className="group relative block overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-3.5 lg:p-5 hover:border-emerald-400 hover:shadow-lg active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 grid place-items-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
              <PackageSearch className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700 inline-flex items-center gap-1">
                <Truck className="w-2.5 h-2.5" /> অর্ডার ট্র্যাকার
              </div>
              <div className="font-extrabold text-[14.5px] lg:text-base text-emerald-900 mt-0.5 leading-tight">আপনার অর্ডার কোথায়?</div>
              <div className="text-[11.5px] lg:text-[12.5px] text-neutral-600 mt-0.5 leading-snug">অর্ডার নম্বর ও মোবাইল নম্বর দিয়ে সরাসরি ট্র্যাক করুন</div>
            </div>
            <div className="shrink-0 inline-flex items-center gap-1 bg-emerald-700 text-white text-[12px] font-bold px-3 lg:px-4 h-9 rounded-full group-hover:bg-emerald-800 transition-colors">
              ট্র্যাক <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>
      </div>

      {/* Categories */}
      <section className="px-4 mt-5 max-w-7xl mx-auto lg:px-6 lg:mt-10">
        <div className="flex items-center justify-between mb-3 lg:mb-5">
          <h3 className="text-base lg:text-2xl font-extrabold tracking-tight">ক্যাটাগরি অনুযায়ী</h3>
          <Link to="/categories" className="text-[12px] lg:text-sm font-semibold text-emerald-600">সব দেখুন</Link>
        </div>
        <div className="flex lg:grid lg:grid-cols-8 gap-2.5 lg:gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 pb-1">
          {cats.map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`} className="shrink-0 w-[78px] lg:w-auto text-center">
              <div className="w-[72px] h-[72px] lg:w-full lg:aspect-square lg:h-auto rounded-2xl bg-emerald-50 overflow-hidden mx-auto">
                {c.image && <img src={c.image} alt={c.name} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover" />}
              </div>
              <div className="text-[11px] lg:text-xs font-medium text-neutral-700 mt-1.5 lg:mt-2 line-clamp-2 leading-tight">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="px-4 mt-5 max-w-7xl mx-auto lg:px-6 lg:mt-10">
        <div className="flex items-center justify-between mb-3 lg:mb-5">
          <h3 className="text-base lg:text-2xl font-extrabold tracking-tight">এই সপ্তাহের ফিচারড</h3>
          <Link to="/categories" className="text-[12px] lg:text-sm font-semibold text-emerald-600">সব দেখুন</Link>
        </div>
        {loading ? <Skeleton /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {featured.slice(0, 5).map((p) => (<ProductCard key={p.id} product={p} />))}
          </div>
        )}
      </section>

      {/* All products */}
      <section className="px-4 mt-6 max-w-7xl mx-auto lg:px-6 lg:mt-10">
        <div className="flex items-center justify-between mb-3 lg:mb-5">
          <h3 className="text-base lg:text-2xl font-extrabold tracking-tight">নতুন আগমন</h3>
        </div>
        {loading ? <Skeleton count={6} /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {all.slice(0, 10).map((p) => (<ProductCard key={p.id} product={p} />))}
          </div>
        )}
      </section>

      <div className="px-4 mt-6 lg:mt-12 max-w-7xl mx-auto lg:px-6 lg:pb-2">
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 lg:p-8 text-center">
          <Leaf className="w-5 h-5 lg:w-7 lg:h-7 text-emerald-600 mx-auto" />
          <div className="text-[13px] lg:text-lg font-semibold text-emerald-900 mt-1 lg:mt-2">যত্নে চাষ করা, তাজা পৌঁছে দেওয়া</div>
          <div className="text-[11.5px] lg:text-sm text-emerald-700 mt-0.5">পেস্টিসাইড নেই • প্রিজারভেটিভ নেই • কৃত্রিম রং নেই</div>
        </div>
      </div>

      {/* Newsletter */}
      <Newsletter />
    </div>
  );
};

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setLoading(true);
    try { await api.post('/newsletter', { email }); setDone(true); setEmail(''); }
    catch (_) {}
    finally { setLoading(false); }
  };
  return (
    <div className="px-4 mt-6 lg:mt-10 max-w-7xl mx-auto lg:px-6 lg:pb-16">
      <div className="rounded-2xl lg:rounded-3xl bg-neutral-900 text-white p-5 lg:p-10 grid lg:grid-cols-2 gap-6 items-center overflow-hidden relative">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400">নিউজলেটার</div>
          <h3 className="text-xl lg:text-3xl font-extrabold mt-1 leading-snug">তাজা পণ্যের আপডেট ও এক্সক্লুসিভ কুপন পান</h3>
          <p className="text-[12.5px] lg:text-sm text-neutral-300 mt-1.5">৫০০+ অর্গানিক প্রেমীদের সাথে যোগ দিন। যেকোনো সময় unsubscribe করুন।</p>
        </div>
        {done ? (
          <div data-testid="newsletter-success" className="text-emerald-400 text-sm font-semibold animate-in fade-in duration-200">✓ ধন্যবাদ! আপনার ইনবক্সে আমাদের সাপ্তাহিক চিঠি পেয়ে যাবেন।</div>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
            <input data-testid="newsletter-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="flex-1 h-12 px-4 rounded-full bg-neutral-800 border border-neutral-700 outline-none focus:border-emerald-500 text-sm text-white placeholder:text-neutral-500" />
            <button data-testid="newsletter-submit" disabled={loading} type="submit" className="h-12 px-6 rounded-full bg-emerald-500 text-neutral-900 font-bold hover:bg-emerald-400 disabled:opacity-60 transition-colors">{loading ? 'সাবমিট হচ্ছে…' : 'সাবস্ক্রাইব'}</button>
          </form>
        )}
        <Leaf className="absolute -right-6 -bottom-6 w-32 h-32 lg:w-48 lg:h-48 text-emerald-500/10 -rotate-12" />
      </div>
    </div>
  );
};

export default Home;
