import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { api, formatBDT } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import MobileHeader from '../components/MobileHeader';
import { Banknote, Smartphone, Wallet, MapPin, ChevronRight, Check, ShieldCheck, Copy, Info, Plus, Pencil, Home as HomeIcon, Briefcase, Building2, Tag, X, Star, Download, LogIn, UserPlus, Percent, Truck, Search } from 'lucide-react';

const LABEL_ICONS = { Home: HomeIcon, Office: Briefcase, Other: Building2 };

const PaymentMethod = ({ label, selected, onClick, icon: Icon, color, sub, testid }) => (
  <button data-testid={testid} type="button" onClick={onClick} className={`w-full rounded-2xl p-3.5 border-2 flex items-center gap-3 text-left transition-all duration-200 ${selected ? 'border-emerald-600 bg-emerald-50 shadow-sm' : 'border-neutral-200 bg-white hover:border-emerald-300'}`}>
    <div className={`w-10 h-10 rounded-xl grid place-items-center ${color}`}><Icon className="w-5 h-5 text-white" /></div>
    <div className="flex-1">
      <div className="text-[13.5px] font-semibold text-neutral-900">{label}</div>
      <div className="text-[11.5px] text-neutral-500">{sub}</div>
    </div>
    <div className={`w-5 h-5 rounded-full border-2 grid place-items-center transition-colors ${selected ? 'bg-emerald-600 border-emerald-600' : 'border-neutral-300'}`}>
      {selected && <Check className="w-3 h-3 text-white" />}
    </div>
  </button>
);

const AddressCard = ({ a, selected, onSelect }) => {
  const Icon = LABEL_ICONS[a.label] || HomeIcon;
  return (
    <button type="button" data-testid={`checkout-addr-${a.id}`} onClick={() => onSelect(a)} className={`w-full text-left rounded-2xl p-3.5 border-2 transition-all duration-200 ${selected ? 'border-emerald-600 bg-emerald-50 shadow-sm' : 'border-neutral-200 bg-white hover:border-emerald-300'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 grid place-items-center"><Icon className="w-4 h-4 text-emerald-700" /></div>
          <div>
            <div className="font-extrabold text-[13.5px] flex items-center gap-1.5">
              {a.label}
              {a.isDefault && <span className="text-[9.5px] uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-0.5"><Star className="w-2.5 h-2.5" />ডিফল্ট</span>}
            </div>
            <div className="text-[11.5px] text-neutral-500">{a.fullName} · {a.phone}</div>
          </div>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 grid place-items-center shrink-0 ${selected ? 'bg-emerald-600 border-emerald-600' : 'border-neutral-300'}`}>
          {selected && <Check className="w-3 h-3 text-white" />}
        </div>
      </div>
      <div className="text-[12.5px] text-neutral-700 mt-2 leading-relaxed pl-11">
        {a.address}, {a.area}{a.city ? `, ${a.city}` : ''}{a.postalCode ? ` — ${a.postalCode}` : ''}
      </div>
    </button>
  );
};

// LocalStorage helpers for guest order tracking
const GUEST_ORDERS_KEY = 'os_guest_orders';
const saveGuestOrder = (order, phone) => {
  try {
    const prev = JSON.parse(localStorage.getItem(GUEST_ORDERS_KEY) || '[]');
    const entry = {
      orderNo: order.orderNo,
      id: order.id,
      phone: phone,
      total: order.total,
      itemsCount: (order.items || []).reduce((s, i) => s + (i.qty || 1), 0),
      placedAt: order.createdAt,
    };
    const dedup = prev.filter((e) => e.orderNo !== entry.orderNo);
    localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify([entry, ...dedup].slice(0, 25)));
  } catch (_) {}
};

const Checkout = () => {
  const { cart, subtotal, delivery, siteDiscount, siteDiscountPercent, siteDiscountLabel, tax, taxPercent, minOrderAmount, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const isGuest = !user;
  const [step, setStep] = useState('details');
  const [method, setMethod] = useState('cod');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [newMode, setNewMode] = useState(false);
  const [addr, setAddr] = useState({ fullName: user?.name || '', phone: user?.phone || '', address: '', area: '', city: 'Dhaka', note: '', postalCode: '' });
  const [saveNew, setSaveNew] = useState(true);
  const [pay, setPay] = useState({ senderPhone: user?.phone || '', txnId: '' });
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState({ bkashNumber: '', nagadNumber: '', instructions: '', bkashType: 'personal', nagadType: 'personal' });

  // coupon
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get('/settings/payment'); setSettings(data); } catch (_) {}
      if (user) {
        try {
          const { data } = await api.get('/auth/me/addresses');
          setAddresses(data || []);
          if (data && data.length > 0) {
            const def = data.find((a) => a.isDefault) || data[0];
            setSelectedAddrId(def.id);
          } else { setNewMode(true); }
        } catch (_) { setNewMode(true); }
      } else {
        setNewMode(true);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (cart.length === 0 && !order) nav('/cart');
  }, [cart.length, order, nav]);

  if (cart.length === 0 && !order) return null;

  const couponDiscount = coupon?.discount || 0;
  const totalWithCoupon = Math.max(0, subtotal - siteDiscount + tax + delivery - couponDiscount);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (isGuest) {
      toast({ title: 'কুপন প্রয়োগে লগইন প্রয়োজন', description: 'লগইন না করে কুপন প্রয়োগ করা যাবে না — তবে গেস্ট চেকআউট চলবে।', variant: 'destructive' });
      return;
    }
    setCouponLoading(true);
    try {
      const { data } = await api.post('/coupons/apply', { code: couponCode.trim(), subtotal });
      setCoupon(data);
      toast({ title: `কুপন প্রয়োগ হয়েছে · -৳${formatBDT(data.discount)}` });
    } catch (e) {
      setCoupon(null);
      toast({ title: 'কুপন বৈধ নয়', description: e.response?.data?.detail || 'আবার চেষ্টা করুন', variant: 'destructive' });
    } finally { setCouponLoading(false); }
  };

  const clearCoupon = () => { setCoupon(null); setCouponCode(''); };

  const submitDetails = async (e) => {
    e.preventDefault();
    if (newMode || addresses.length === 0) {
      if (!addr.fullName || !addr.phone || !addr.address || !addr.area) {
        toast({ title: 'অনুগ্রহ করে সব আবশ্যক ঘর পূরণ করুন', variant: 'destructive' }); return;
      }
      if (saveNew && user) {
        try {
          const { data } = await api.post('/auth/me/addresses', { ...addr, isDefault: addresses.length === 0 });
          setAddresses((s) => [...s, data]); setSelectedAddrId(data.id);
        } catch (_) {}
      }
    } else if (!selectedAddrId) {
      toast({ title: 'একটি ঠিকানা নির্বাচন করুন', variant: 'destructive' }); return;
    }
    if (minOrderAmount > 0 && subtotal < minOrderAmount) {
      toast({ title: `সর্বনিম্ন অর্ডার ৳${formatBDT(minOrderAmount)} প্রয়োজন`, variant: 'destructive' }); return;
    }
    setStep('payment');
  };

  const placeOrder = async () => {
    if (method !== 'cod') {
      if (!pay.senderPhone || pay.senderPhone.length < 11) { toast({ title: 'আপনার পাঠানো মোবাইল নম্বর দিন', variant: 'destructive' }); return; }
      if (!pay.txnId || pay.txnId.length < 6) { toast({ title: 'ট্রানজেকশন আইডি দিন', variant: 'destructive' }); return; }
    }
    setLoading(true);
    try {
      const items = cart.map((i) => ({ productId: i.id, name: i.name, image: i.image, price: i.price, qty: i.qty, unit: i.unit, variant: i.variantLabel || null }));
      const useSaved = !newMode && addresses.length > 0 && selectedAddrId;
      const finalAddr = useSaved ? addresses.find((a) => a.id === selectedAddrId) : addr;
      const { data } = await api.post('/orders', {
        items, address: finalAddr, paymentMethod: method,
        paymentPhone: method !== 'cod' ? pay.senderPhone : null,
        paymentTxn: method !== 'cod' ? pay.txnId.trim() : null,
        subtotal, delivery, total: totalWithCoupon,
        couponCode: coupon?.code || null,
        discount: (siteDiscount || 0) + (couponDiscount || 0),
      });
      setOrder(data);
      // Save guest order to localStorage for "My Orders" on guest profile
      saveGuestOrder(data, finalAddr.phone);
      clearCart();
      setStep('done');
    } catch (e) {
      toast({ title: 'অর্ডার ব্যর্থ হয়েছে', description: e.response?.data?.detail || 'আবার চেষ্টা করুন', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const copyNumber = (n) => { try { navigator.clipboard.writeText(n.replace(/\D/g, '')); toast({ title: 'নাম্বার কপি হয়েছে' }); } catch (_) {} };

  if (step === 'done' && order) {
    const orderPhone = order.address?.phone || '';
    return (
      <div className="pb-12 max-w-2xl mx-auto lg:px-6">
        <MobileHeader title="অর্ডার সম্পন্ন" />
        <div className="px-6 py-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 grid place-items-center animate-in zoom-in duration-300">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-extrabold mt-4">ধন্যবাদ, {(order.userName || '').split(' ')[0]}!</h2>
          <p className="text-sm text-neutral-500 mt-1">আপনার অর্ডার গ্রহণ করা হয়েছে।</p>
          {order.paymentMethod !== 'cod' && order.paymentStatus === 'pending' && (
            <div className="mt-3 inline-block bg-amber-50 text-amber-800 text-[12px] font-semibold px-3 py-1.5 rounded-full">পেমেন্ট ভেরিফিকেশনের অপেক্ষায়</div>
          )}
          <div className="mt-5 rounded-2xl border border-neutral-100 p-4 text-left text-sm">
            <div className="flex items-center justify-between"><span className="text-neutral-500">অর্ডার নম্বর</span><span data-testid="checkout-success-orderno" className="font-mono font-semibold">{order.orderNo}</span></div>
            <div className="flex items-center justify-between mt-1"><span className="text-neutral-500">মোট</span><span className="font-extrabold text-emerald-700">৳{formatBDT(order.total)}</span></div>
            <div className="flex items-center justify-between mt-1"><span className="text-neutral-500">পেমেন্ট</span><span className="font-semibold uppercase">{order.paymentMethod}</span></div>
            {order.paymentTxn && <div className="flex items-center justify-between mt-1"><span className="text-neutral-500">TrxID</span><span className="font-mono text-xs">{order.paymentTxn}</span></div>}
          </div>

          {/* Tracker tip */}
          <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-left text-[12.5px] text-emerald-900">
            <div className="font-bold mb-1">📦 আপনার ট্র্যাকিং তথ্য সংরক্ষণ করুন</div>
            <div>অর্ডার নম্বর <span className="font-mono font-bold">{order.orderNo}</span> ও আপনার মোবাইল নম্বর দিয়ে যেকোনো সময় ট্র্যাক করতে পারবেন।</div>
          </div>

          <Link data-testid="checkout-receipt-btn" to={`/receipt/${order.orderNo}?phone=${encodeURIComponent(orderPhone)}`} className="mt-5 w-full inline-flex items-center justify-center gap-1.5 h-12 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors">
            <Download className="w-4 h-4" /> পিডিএফ রসিদ ডাউনলোড
          </Link>
          <Link data-testid="checkout-track-btn" to={`/track?orderNo=${order.orderNo}&phone=${encodeURIComponent(orderPhone)}`} className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-white border border-emerald-700 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors">
            <Search className="w-4 h-4" /> অর্ডার ট্র্যাক করুন
          </Link>
          {user ? (
            <button data-testid="checkout-view-order-btn" onClick={() => nav(`/order/${order.id}`)} className="mt-2 w-full h-11 rounded-full bg-neutral-100 text-neutral-700 font-semibold hover:bg-neutral-200 transition-colors">অর্ডার বিস্তারিত</button>
          ) : (
            <button onClick={() => nav('/')} className="mt-2 w-full h-11 rounded-full bg-neutral-100 text-neutral-700 font-semibold hover:bg-neutral-200 transition-colors">হোমে ফিরে যান</button>
          )}
        </div>
      </div>
    );
  }

  const officialNumber = method === 'bkash' ? settings.bkashNumber : method === 'nagad' ? settings.nagadNumber : '';
  const accountType = method === 'bkash' ? settings.bkashType : settings.nagadType;
  const useSaved = !newMode && addresses.length > 0;

  return (
    <div className="pb-28 lg:pb-12 max-w-2xl mx-auto lg:px-6">
      <MobileHeader title="চেকআউট" back hideSearch />

      {step === 'details' && (
        <form onSubmit={submitDetails} className="px-4 mt-3 space-y-3">
          {/* Guest hint — login/signup option */}
          {isGuest && (
            <div data-testid="checkout-guest-hint" className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center gap-3 animate-in fade-in duration-200">
              <div className="w-10 h-10 rounded-xl bg-white grid place-items-center shrink-0"><LogIn className="w-4 h-4 text-emerald-700" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-emerald-900">গেস্ট হিসেবে কেনাকাটা করছেন</div>
                <div className="text-[11.5px] text-emerald-800 mt-0.5">দ্রুত চেকআউটের জন্য চাইলে লগইন বা সাইনআপ করুন। লগইন ছাড়াও অর্ডার করতে পারবেন।</div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Link data-testid="checkout-login-link" to="/login?next=/checkout" className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-full bg-emerald-700 text-white text-[11.5px] font-bold hover:bg-emerald-800 transition-colors">
                  <LogIn className="w-3 h-3" /> লগইন
                </Link>
                <Link data-testid="checkout-signup-link" to="/signup?next=/checkout" className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-full bg-white border border-emerald-700 text-emerald-700 text-[11.5px] font-bold hover:bg-emerald-50 transition-colors">
                  <UserPlus className="w-3 h-3" /> সাইনআপ
                </Link>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-700 flex items-center gap-1"><MapPin className="w-3 h-3" /> ডেলিভারি ঠিকানা</div>
            {user && addresses.length > 0 && (
              <Link to="/profile/addresses" data-testid="checkout-manage-addr-link" className="text-[11.5px] font-semibold text-emerald-700 hover:text-emerald-800">পরিচালনা</Link>
            )}
          </div>

          {useSaved && (
            <div className="space-y-2">
              {addresses.map((a) => (
                <AddressCard key={a.id} a={a} selected={selectedAddrId === a.id} onSelect={() => setSelectedAddrId(a.id)} />
              ))}
              <button type="button" data-testid="checkout-use-new-btn" onClick={() => setNewMode(true)} className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-white border border-dashed border-emerald-300 text-emerald-700 text-[13px] font-semibold hover:bg-emerald-50 transition-colors">
                <Plus className="w-4 h-4" /> নতুন ঠিকানা ব্যবহার করুন
              </button>
            </div>
          )}

          {(!useSaved || newMode) && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {user && addresses.length > 0 && (
                <button type="button" onClick={() => setNewMode(false)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-neutral-600"><ChevronRight className="w-3 h-3 rotate-180" /> সংরক্ষিতে ফিরুন</button>
              )}
              <input data-testid="checkout-fullName" value={addr.fullName} onChange={(e) => setAddr({ ...addr, fullName: e.target.value })} placeholder="পূর্ণ নাম *" className="w-full h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm transition-colors" />
              <input data-testid="checkout-phone" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} placeholder="মোবাইল নম্বর *" inputMode="tel" className="w-full h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm transition-colors" />
              <textarea data-testid="checkout-address" value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} placeholder="বাসা / রোড / বিল্ডিং *" rows={2} className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm resize-none transition-colors" />
              <div className="grid grid-cols-2 gap-3">
                <input data-testid="checkout-area" value={addr.area} onChange={(e) => setAddr({ ...addr, area: e.target.value })} placeholder="এলাকা / থানা *" className="w-full h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm transition-colors" />
                <input data-testid="checkout-city" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} placeholder="শহর" className="w-full h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm transition-colors" />
              </div>
              <textarea value={addr.note} onChange={(e) => setAddr({ ...addr, note: e.target.value })} placeholder="রাইডারের জন্য নোট (ঐচ্ছিক)" rows={2} className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm resize-none transition-colors" />
              {user && (
                <label className="flex items-center gap-2 text-[12.5px] cursor-pointer select-none">
                  <input data-testid="checkout-save-addr" type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                  পরবর্তীবারের জন্য এই ঠিকানা সংরক্ষণ করুন
                </label>
              )}
            </div>
          )}

          <button data-testid="checkout-continue-payment" type="submit" className="w-full h-12 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 mt-2 flex items-center justify-center gap-2 transition-colors">পেমেন্টে এগিয়ে যান <ChevronRight className="w-4 h-4" /></button>
        </form>
      )}

      {step === 'payment' && (
        <div className="px-4 mt-3 space-y-3">
          {/* Site discount banner */}
          {siteDiscount > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white p-3 flex items-center gap-2">
              <Percent className="w-4 h-4 shrink-0" />
              <div className="text-[12.5px] leading-tight">
                <span className="font-extrabold">{siteDiscountLabel || 'সাইট ডিসকাউন্ট'}</span> · {siteDiscountPercent}% ছাড় প্রয়োগ হয়েছে (-৳{formatBDT(siteDiscount)})
              </div>
            </div>
          )}

          {/* Coupon code — only for logged in */}
          {user && (
            <div className="rounded-2xl bg-white border border-neutral-100 p-3.5">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-700 flex items-center gap-1 mb-2"><Tag className="w-3 h-3" /> কুপন কোড</div>
              {coupon ? (
                <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3 border border-emerald-200 animate-in fade-in duration-200">
                  <div>
                    <div className="font-bold text-[13px] text-emerald-800">{coupon.code} প্রয়োগ হয়েছে</div>
                    <div className="text-[11.5px] text-emerald-700">ছাড়: -৳{formatBDT(coupon.discount)}</div>
                  </div>
                  <button data-testid="checkout-clear-coupon" onClick={clearCoupon} className="w-8 h-8 grid place-items-center rounded-full hover:bg-emerald-100 text-emerald-800"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input data-testid="checkout-coupon-input" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="কুপন কোড (যেমন SOBUJ100)" className="flex-1 h-11 px-3.5 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm font-mono transition-colors" />
                  <button data-testid="checkout-apply-coupon" type="button" disabled={couponLoading || !couponCode.trim()} onClick={applyCoupon} className="h-11 px-5 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-60 transition-colors">{couponLoading ? '...' : 'প্রয়োগ'}</button>
                </div>
              )}
            </div>
          )}

          <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-700">পেমেন্ট পদ্ধতি</div>
          <PaymentMethod testid="pay-cod" label="ক্যাশ অন ডেলিভারি" sub="অর্ডার আসার সময় ক্যাশে পেমেন্ট" selected={method === 'cod'} onClick={() => setMethod('cod')} icon={Banknote} color="bg-neutral-800" />
          <PaymentMethod testid="pay-bkash" label="bKash (পার্সোনাল)" sub="অফিসিয়াল নম্বরে ম্যানুয়ালি সেন্ড মানি করুন" selected={method === 'bkash'} onClick={() => setMethod('bkash')} icon={Smartphone} color="bg-pink-600" />
          <PaymentMethod testid="pay-nagad" label="Nagad" sub="অফিসিয়াল নম্বরে ম্যানুয়ালি সেন্ড মানি করুন" selected={method === 'nagad'} onClick={() => setMethod('nagad')} icon={Wallet} color="bg-orange-500" />

          {(method === 'bkash' || method === 'nagad') && (
            <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-[12.5px] text-emerald-900 leading-relaxed">{settings.instructions || `নিচের নম্বরে ${method === 'bkash' ? 'bKash' : 'Nagad'} "Send Money" করুন ৳${formatBDT(totalWithCoupon)} এবং ট্রানজেকশন আইডি লিখুন।`}</div>
              </div>
              <div className="rounded-xl bg-white p-3.5 border border-emerald-200">
                <div className="text-[10.5px] uppercase tracking-wider font-semibold text-neutral-500">{method === 'bkash' ? 'bKash' : 'Nagad'} · {accountType}</div>
                <div className="flex items-center justify-between mt-1">
                  <div className="font-mono text-xl font-extrabold text-neutral-900">{officialNumber || 'সেট করা হয়নি'}</div>
                  {officialNumber && (
                    <button type="button" data-testid="checkout-copy-number" onClick={() => copyNumber(officialNumber)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors">
                      <Copy className="w-3.5 h-3.5" /> কপি
                    </button>
                  )}
                </div>
                <div className="mt-1.5 text-[11px] text-neutral-500">পাঠানোর পরিমাণ: <span className="font-bold text-neutral-800">৳{formatBDT(totalWithCoupon)}</span></div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-700 uppercase">আপনার {method === 'bkash' ? 'bKash' : 'Nagad'} নম্বর (প্রেরক) *</label>
                  <input data-testid="checkout-sender-phone" value={pay.senderPhone} onChange={(e) => setPay({ ...pay, senderPhone: e.target.value })} placeholder="01XXXXXXXXX" inputMode="tel" className="mt-1 w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 outline-none focus:border-emerald-500 text-sm transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-neutral-700 uppercase">ট্রানজেকশন আইডি (TrxID) *</label>
                  <input data-testid="checkout-txn-id" value={pay.txnId} onChange={(e) => setPay({ ...pay, txnId: e.target.value.toUpperCase() })} placeholder="যেমন 8GH27AC4QY" className="mt-1 w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 outline-none focus:border-emerald-500 text-sm font-mono transition-colors" />
                  <div className="text-[10.5px] text-neutral-500 mt-1">{method === 'bkash' ? 'bKash' : 'Nagad'} সাকসেস SMS / অ্যাপ হিস্ট্রিতে পাবেন।</div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-emerald-50 p-3 space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-[12.5px]"><span className="text-neutral-600">সাবটোটাল</span><span>৳{formatBDT(subtotal)}</span></div>
            {siteDiscount > 0 && (
              <div className="flex items-center justify-between text-[12.5px] text-emerald-700"><span>ডিসকাউন্ট ({siteDiscountPercent}%)</span><span>-৳{formatBDT(siteDiscount)}</span></div>
            )}
            {tax > 0 && (
              <div className="flex items-center justify-between text-[12.5px]"><span className="text-neutral-600">ভ্যাট/ট্যাক্স ({taxPercent}%)</span><span>৳{formatBDT(tax)}</span></div>
            )}
            <div className="flex items-center justify-between text-[12.5px]"><span className="text-neutral-600">ডেলিভারি</span><span>{delivery === 0 ? 'ফ্রি' : `৳${formatBDT(delivery)}`}</span></div>
            {couponDiscount > 0 && (
              <div className="flex items-center justify-between text-[12.5px] text-emerald-700"><span>কুপন ({coupon.code})</span><span>-৳{formatBDT(couponDiscount)}</span></div>
            )}
            <div className="flex items-center justify-between font-bold"><span>মোট</span><span data-testid="checkout-total" className="text-emerald-700">৳{formatBDT(totalWithCoupon)}</span></div>
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> নিরাপদ চেকআউট · মোবাইল পেমেন্ট ১৫–৩০ মিনিটে যাচাই করা হয়।</div>

          <div className="lg:hidden fixed bottom-16 inset-x-0 bg-white border-t border-neutral-100 px-4 py-3 z-30">
            <button data-testid="checkout-confirm-order" disabled={loading} onClick={placeOrder} className="w-full h-12 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60 transition-colors">
              {loading ? 'অর্ডার দেওয়া হচ্ছে…' : `অর্ডার কনফার্ম · ৳${formatBDT(totalWithCoupon)}`}
            </button>
          </div>
          <div className="hidden lg:block mt-4">
            <button data-testid="checkout-confirm-order-desktop" disabled={loading} onClick={placeOrder} className="w-full h-12 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60 transition-colors">
              {loading ? 'অর্ডার দেওয়া হচ্ছে…' : `অর্ডার কনফার্ম · ৳${formatBDT(totalWithCoupon)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
