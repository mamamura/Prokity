import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import ProductCard from '../components/ProductCard';
import MobileHeader from '../components/MobileHeader';
import { Search as SearchIcon, SlidersHorizontal, X, Check } from 'lucide-react';

const SORTS = [
  { v: 'newest', label: 'নতুন' },
  { v: 'price-asc', label: 'দাম: কম থেকে বেশি' },
  { v: 'price-desc', label: 'দাম: বেশি থেকে কম' },
  { v: 'rating', label: 'সেরা রেটিং' },
];

const SearchPage = () => {
  const [q, setQ] = useState('');
  const [cats, setCats] = useState([]);
  const [all, setAll] = useState([]);
  const [cat, setCat] = useState('');
  const [organic, setOrganic] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState('newest');
  const [price, setPrice] = useState({ min: '', max: '' });
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => { (async () => {
    try { const { data } = await api.get('/categories'); setCats(data || []); } catch (_) {}
  })(); }, []);

  useEffect(() => {
    const params = { sort };
    if (cat) params.category = cat;
    if (organic) params.organic = true;
    if (inStock) params.inStock = true;
    if (price.min) params.minPrice = Number(price.min);
    if (price.max) params.maxPrice = Number(price.max);
    (async () => {
      try { const { data } = await api.get('/products', { params }); setAll(data || []); } catch (_) {}
    })();
  }, [cat, organic, inStock, sort, price.min, price.max]);

  const results = useMemo(() => {
    const n = q.toLowerCase().trim();
    if (!n) return all;
    return all.filter((p) => p.name.toLowerCase().includes(n) || p.description?.toLowerCase().includes(n));
  }, [q, all]);

  const activeCount = [cat, organic, inStock, price.min, price.max, sort !== 'newest' ? sort : ''].filter(Boolean).length;
  const clearAll = () => { setCat(''); setOrganic(false); setInStock(false); setPrice({ min: '', max: '' }); setSort('newest'); };

  return (
    <div className="pb-24 max-w-5xl mx-auto lg:px-6">
      <MobileHeader title="খুঁজুন" back hideSearch />
      <div className="px-4 mt-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-neutral-100 rounded-full h-11 px-4 gap-2 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 focus-within:border focus-within:border-emerald-300">
            <SearchIcon className="w-4 h-4 text-neutral-500" />
            <input data-testid="search-input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="মধু, তেল, মসলা খুঁজুন…" className="flex-1 bg-transparent outline-none text-sm" />
          </div>
          <button data-testid="search-filter-toggle" onClick={() => setShowFilter((s) => !s)} className={`relative w-11 h-11 grid place-items-center rounded-full transition-colors ${showFilter ? 'bg-emerald-700 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`} aria-label="Toggle filters">
            <SlidersHorizontal className="w-4 h-4" />
            {activeCount > 0 && (<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center border-2 border-white">{activeCount}</span>)}
          </button>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="mt-3 rounded-2xl bg-white border border-neutral-200 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1.5">ক্যাটাগরি</div>
              <div className="flex flex-wrap gap-1.5">
                <button data-testid="filter-cat-all" onClick={() => setCat('')} className={`px-3 h-8 rounded-full text-[12px] font-semibold border transition-colors ${!cat ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white border-neutral-200 text-neutral-700 hover:border-emerald-400'}`}>সব</button>
                {cats.map((c) => (
                  <button key={c.id || c.slug} data-testid={`filter-cat-${c.slug}`} onClick={() => setCat(c.slug)} className={`px-3 h-8 rounded-full text-[12px] font-semibold border transition-colors ${cat === c.slug ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white border-neutral-200 text-neutral-700 hover:border-emerald-400'}`}>{c.name}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1.5">দামের সীমা (৳)</div>
              <div className="grid grid-cols-2 gap-2">
                <input data-testid="filter-price-min" type="number" value={price.min} onChange={(e) => setPrice({ ...price, min: e.target.value })} placeholder="সর্বনিম্ন" className="h-10 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
                <input data-testid="filter-price-max" type="number" value={price.max} onChange={(e) => setPrice({ ...price, max: e.target.value })} placeholder="সর্বোচ্চ" className="h-10 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input data-testid="filter-organic" type="checkbox" checked={organic} onChange={(e) => setOrganic(e.target.checked)} className="w-4 h-4 accent-emerald-600" /> শুধু অর্গানিক
              </label>
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input data-testid="filter-instock" type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="w-4 h-4 accent-emerald-600" /> শুধু স্টকে আছে
              </label>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1.5">সাজান</div>
              <div className="flex flex-wrap gap-1.5">
                {SORTS.map((s) => (
                  <button key={s.v} data-testid={`filter-sort-${s.v}`} onClick={() => setSort(s.v)} className={`inline-flex items-center gap-1 px-3 h-8 rounded-full text-[12px] font-semibold border transition-colors ${sort === s.v ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white border-neutral-200 text-neutral-700 hover:border-emerald-400'}`}>
                    {sort === s.v && <Check className="w-3 h-3" />} {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
              <button data-testid="filter-clear-all" onClick={clearAll} className="inline-flex items-center gap-1 text-[12px] font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"><X className="w-3 h-3" /> সব ক্লিয়ার</button>
              <button data-testid="filter-apply" onClick={() => setShowFilter(false)} className="inline-flex items-center gap-1 bg-emerald-700 text-white text-[12.5px] font-semibold h-9 px-4 rounded-full hover:bg-emerald-800 transition-colors">প্রয়োগ</button>
            </div>
          </div>
        )}

        <div className="text-[11px] text-neutral-500 mt-3">{results.length}টি পণ্য</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          {results.map((p) => (<ProductCard key={p.id} product={p} />))}
        </div>
        {results.length === 0 && (
          <div className="text-center py-14 text-sm text-neutral-500">কোনো পণ্য মিল পাওয়া যায়নি।</div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
