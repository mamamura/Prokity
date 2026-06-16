import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import MobileHeader from '../components/MobileHeader';

const Categories = () => {
  const [cats, setCats] = useState([]);
  useEffect(() => { (async () => { const { data } = await api.get('/categories'); setCats(data); })(); }, []);
  return (
    <div className="pb-4">
      <MobileHeader title="ক্যাটাগরি" />
      <div className="px-4 mt-3 max-w-7xl mx-auto lg:px-6 lg:mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
        {cats.map((c) => (
          <Link key={c.slug} to={`/category/${c.slug}`} className="rounded-2xl bg-white border border-neutral-100 overflow-hidden hover:shadow-sm transition-shadow">
            <div className="aspect-[4/3] bg-emerald-50">
              {c.image && <img src={c.image} alt={c.name} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover" />}
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-[13.5px] font-semibold text-neutral-900 leading-tight">{c.name}</span>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Categories;
