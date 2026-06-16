import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api, formatBDT } from '../lib/api';
import MobileHeader from '../components/MobileHeader';
import { useToast } from '../hooks/use-toast';
import { Search, MapPin, Phone, User, Package, Truck, Check, ClipboardList, Clock, X as XIcon, CheckCircle2, Download, Hash } from 'lucide-react';

const statusSteps = [
  { key: 'pending', label: 'গৃহীত', icon: Clock },
  { key: 'confirmed', label: 'নিশ্চিত', icon: CheckCircle2 },
  { key: 'shipped', label: 'প্রেরিত', icon: Truck },
  { key: 'delivered', label: 'ডেলিভারি সম্পন্ন', icon: Check },
];

const payColors = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  unpaid: 'bg-neutral-200 text-neutral-700',
  rejected: 'bg-red-100 text-red-700',
};

const Track = () => {
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [orderNo, setOrderNo] = useState(params.get('orderNo') || '');
  const [phone, setPhone] = useState(params.get('phone') || '');
  const [loading, setLoading] = useState(false);
  const [o, setO] = useState(null);
  const [searched, setSearched] = useState(false);

  const lookup = async (e) => {
    e?.preventDefault();
    if (!orderNo.trim() || !phone.trim()) {
      toast({ title: 'অর্ডার নম্বর ও মোবাইল নম্বর প্রয়োজন', variant: 'destructive' });
      return;
    }
    setLoading(true); setSearched(true); setO(null);
    try {
      const { data } = await api.get(`/orders/track/${encodeURIComponent(orderNo.trim())}`, { params: { phone: phone.trim() } });
      setO(data);
    } catch (e) {
      toast({ title: 'অর্ডার খুঁজে পাওয়া যায়নি', description: e.response?.data?.detail || 'অর্ডার নম্বর ও মোবাইল নম্বর চেক করুন', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  // Auto-lookup on first load if both params provided via URL
  React.useEffect(() => {
    if (params.get('orderNo') && params.get('phone') && !searched) {
      lookup();
    }
    // eslint-disable-next-line
  }, []);

  const cancelled = o?.status === 'cancelled';
  const activeIdx = o && !cancelled ? statusSteps.findIndex((s) => s.key === o.status) : -1;

  return (
    <div className="pb-12 max-w-3xl mx-auto lg:px-6">
      <MobileHeader title="অর্ডার ট্র্যাক" back hideSearch />
      <div className="px-4 mt-3">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 text-white p-4">
          <div className="flex items-center gap-2 text-[12px] uppercase tracking-wider font-semibold opacity-90"><Search className="w-3.5 h-3.5" /> পাবলিক অর্ডার ট্র্যাকিং</div>
          <p className="text-[12.5px] mt-1.5 opacity-95 leading-relaxed">কোনো লগইন ছাড়াই আপনার অর্ডার ট্র্যাক করুন — অর্ডার নম্বর ও মোবাইল নম্বর দিন।</p>
        </div>

        <form onSubmit={lookup} className="mt-4 rounded-2xl bg-white border border-neutral-100 p-4 space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-1"><Hash className="w-3 h-3" /> অর্ডার নম্বর</label>
            <input data-testid="track-order-no" value={orderNo} onChange={(e) => setOrderNo(e.target.value.toUpperCase())} placeholder="যেমন ORD-260616-1234" className="mt-1 w-full h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm font-mono transition-colors" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-1"><Phone className="w-3 h-3" /> মোবাইল নম্বর (চেকআউটে দেওয়া)</label>
            <input data-testid="track-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" className="mt-1 w-full h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm transition-colors" />
          </div>
          <button data-testid="track-lookup-btn" type="submit" disabled={loading} className="w-full h-12 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2">
            <Search className="w-4 h-4" /> {loading ? 'খুঁজছি…' : 'অর্ডার ট্র্যাক করুন'}
          </button>
        </form>

        {searched && !loading && !o && (
          <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-[13px] text-amber-900">
            অর্ডার পাওয়া যায়নি। দয়া করে অর্ডার নম্বর ও মোবাইল নম্বর আবার চেক করুন।
          </div>
        )}

        {o && (
          <div className="mt-4 space-y-4">
            {/* Status header */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] opacity-80">অর্ডার নম্বর</div>
                  <div className="text-[15px] font-extrabold">{o.orderNo}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] opacity-80">মোট</div>
                  <div className="text-xl font-extrabold">৳{formatBDT(o.total)}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-[10.5px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full capitalize">{o.status}</span>
                <span className={`text-[10.5px] uppercase font-bold px-2 py-0.5 rounded-full capitalize ${payColors[o.paymentStatus] || 'bg-white/20'}`} style={{ color: o.paymentStatus === 'paid' ? '#065f46' : undefined }}>Pay: {o.paymentStatus}</span>
                <span className="text-[10.5px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full">{o.paymentMethod}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Link to={`/receipt/${o.orderNo}?phone=${encodeURIComponent(phone.trim())}`} target="_blank" className="inline-flex items-center gap-1.5 bg-white text-emerald-700 px-3 h-9 rounded-full text-[12px] font-bold hover:bg-emerald-50 transition-colors">
                  <Download className="w-3.5 h-3.5" /> পিডিএফ রসিদ
                </Link>
              </div>
            </div>

            {/* Tracker */}
            <div className="rounded-2xl bg-white border border-neutral-100 p-4">
              <h3 className="font-extrabold text-sm mb-3">অর্ডার ট্র্যাকিং</h3>
              {cancelled ? (
                <div className="flex items-center gap-2 text-red-600 text-sm font-semibold"><XIcon className="w-4 h-4" /> অর্ডার বাতিল করা হয়েছে</div>
              ) : (
                <ol className="relative pl-7">
                  {statusSteps.map((s, i) => {
                    const done = i <= activeIdx;
                    const current = i === activeIdx;
                    const Icon = s.icon;
                    const hist = (o.statusHistory || []).find((h) => h.status === s.key);
                    return (
                      <li key={s.key} className="relative pb-5 last:pb-0">
                        {i < statusSteps.length - 1 && (
                          <span className={`absolute left-[-14px] top-7 bottom-0 w-0.5 ${i < activeIdx ? 'bg-emerald-500' : 'bg-neutral-200'}`} />
                        )}
                        <span className={`absolute -left-[22px] top-0 w-7 h-7 rounded-full grid place-items-center ${done ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-400'} ${current ? 'ring-4 ring-emerald-100' : ''}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="ml-2">
                          <div className={`text-[13px] font-extrabold ${done ? 'text-neutral-900' : 'text-neutral-500'}`}>{s.label}</div>
                          <div className="text-[11px] text-neutral-500">
                            {hist ? new Date(hist.at).toLocaleString() : (current ? 'চলমান' : (done ? '' : 'অপেক্ষাধীন'))}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* Items */}
            <div className="rounded-2xl bg-white border border-neutral-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100 font-extrabold text-sm flex items-center gap-2"><Package className="w-4 h-4 text-emerald-700" /> আইটেম ({o.items.length})</div>
              <div className="divide-y divide-neutral-100">
                {o.items.map((it, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <img src={it.image} alt={it.name} onError={(e) => { e.currentTarget.src = 'https://placehold.co/80/f5f5f5/525252?text=img'; }} className="w-12 h-12 rounded-lg object-cover bg-neutral-50" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold line-clamp-1">{it.name}</div>
                      <div className="text-[11px] text-neutral-500">{it.unit} · {it.qty} × ৳{formatBDT(it.price)}</div>
                    </div>
                    <div className="text-sm font-extrabold text-emerald-700">৳{formatBDT(it.price * it.qty)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-2xl bg-white border border-neutral-100 p-4 text-sm">
              <div className="flex items-center justify-between"><span className="text-neutral-500">সাবটোটাল</span><span className="font-semibold">৳{formatBDT(o.subtotal)}</span></div>
              <div className="flex items-center justify-between mt-1"><span className="text-neutral-500">ডেলিভারি</span><span className="font-semibold">{o.delivery === 0 ? 'ফ্রি' : `৳${formatBDT(o.delivery)}`}</span></div>
              {o.discount > 0 && (<div className="flex items-center justify-between mt-1 text-emerald-700"><span>ডিসকাউন্ট {o.couponCode ? `(${o.couponCode})` : ''}</span><span className="font-semibold">-৳{formatBDT(o.discount)}</span></div>)}
              <div className="border-t border-dashed border-neutral-200 my-2" />
              <div className="flex items-center justify-between"><span className="font-bold">মোট</span><span className="font-extrabold text-emerald-700">৳{formatBDT(o.total)}</span></div>
            </div>

            {/* Address */}
            <div className="rounded-2xl bg-white border border-neutral-100 p-4 text-sm">
              <div className="font-extrabold text-sm mb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-700" /> ডেলিভারি ঠিকানা</div>
              <div className="flex items-center gap-1 text-neutral-700"><User className="w-3 h-3 text-neutral-400" /> {o.address.fullName}</div>
              <div className="flex items-center gap-1 text-neutral-700 mt-0.5"><Phone className="w-3 h-3 text-neutral-400" /> {o.address.phone}</div>
              <div className="text-neutral-600 mt-1">{o.address.address}, {o.address.area}{o.address.city ? `, ${o.address.city}` : ''}</div>
              {o.address.note && <div className="mt-1 text-neutral-500 italic">নোট: {o.address.note}</div>}
            </div>

            {/* Payment */}
            <div className="rounded-2xl bg-white border border-neutral-100 p-4 text-sm">
              <div className="font-extrabold text-sm mb-2 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-emerald-700" /> পেমেন্ট</div>
              <div className="flex items-center justify-between"><span className="text-neutral-500">পদ্ধতি</span><span className="font-semibold uppercase">{o.paymentMethod}</span></div>
              <div className="flex items-center justify-between mt-1"><span className="text-neutral-500">স্ট্যাটাস</span><span className={`font-semibold capitalize px-2 py-0.5 rounded-full text-[11px] ${payColors[o.paymentStatus] || 'bg-neutral-100 text-neutral-700'}`}>{o.paymentStatus}</span></div>
              {o.paymentPhone && <div className="flex items-center justify-between mt-1"><span className="text-neutral-500">প্রেরকের নম্বর</span><span className="font-semibold">{o.paymentPhone}</span></div>}
              {o.paymentTxn && <div className="flex items-center justify-between mt-1"><span className="text-neutral-500">TrxID</span><span className="font-mono text-xs">{o.paymentTxn}</span></div>}
              {o.paymentNote && <div className="mt-2 text-[11px] text-neutral-500 italic">নোট: {o.paymentNote}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Track;
