import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api, formatBDT } from '../lib/api';
import { Download, ArrowLeft, Leaf, MapPin, Phone, User as UserIcon, Calendar, Hash, Printer } from 'lucide-react';

/**
 * Public PDF-style receipt — printable via browser "Save as PDF".
 * Accessible at /receipt/:orderNo?phone=01XXXXXXXXX (matches the same auth-less rule as /api/orders/track).
 */
const Receipt = () => {
  const { orderNo } = useParams();
  const [params] = useSearchParams();
  const phone = (params.get('phone') || '').trim();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data } = await api.get(`/orders/track/${encodeURIComponent(orderNo)}`, { params: { phone } });
        if (!cancel) setOrder(data);
      } catch (e) {
        if (!cancel) setErr(e.response?.data?.detail || 'রসিদ লোড করা যায়নি।');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [orderNo, phone]);

  const download = () => {
    // Triggers the browser print dialog which can "Save as PDF".
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-neutral-50 text-sm text-neutral-500">
        রসিদ লোড হচ্ছে…
      </div>
    );
  }

  if (err || !order) {
    return (
      <div className="min-h-screen grid place-items-center bg-neutral-50 px-6 text-center">
        <div>
          <div className="text-2xl font-extrabold mb-2">রসিদ খুঁজে পাওয়া যায়নি</div>
          <p className="text-sm text-neutral-500 mb-4">{err || 'অর্ডার নম্বর ও মোবাইল নম্বর মিলছে না।'}</p>
          <Link to="/track" className="inline-flex items-center gap-1 bg-emerald-700 text-white px-4 h-10 rounded-full text-sm font-semibold hover:bg-emerald-800">
            <ArrowLeft className="w-4 h-4" /> ট্র্যাক পেজে ফিরে যান
          </Link>
        </div>
      </div>
    );
  }

  const created = new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="receipt-page bg-neutral-100 min-h-screen pb-24">
      {/* Top action bar — hidden on print */}
      <div className="no-print sticky top-0 z-30 bg-white border-b border-neutral-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to={`/track?orderNo=${encodeURIComponent(order.orderNo)}&phone=${encodeURIComponent(phone)}`} className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-700">
            <ArrowLeft className="w-4 h-4" /> ফিরে যান
          </Link>
          <button data-testid="receipt-download-btn" onClick={download} className="inline-flex items-center gap-1.5 bg-emerald-700 text-white px-4 h-9 rounded-full text-[13px] font-semibold hover:bg-emerald-800 transition-colors">
            <Download className="w-4 h-4" /> পিডিএফ ডাউনলোড
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="receipt-card bg-white rounded-2xl shadow-md print:shadow-none print:rounded-none overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white p-6 print:bg-emerald-700">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-11 h-11 rounded-xl bg-white/15 grid place-items-center"><Leaf className="w-5 h-5" /></div>
                <div>
                  <div className="font-extrabold text-lg leading-none">প্রকৃতির ঘ্রাণ</div>
                  <div className="text-[11px] opacity-90 mt-0.5">Organic Shop · অর্গানিক পণ্যের ভরসাযোগ্য ঠিকানা</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase opacity-80 tracking-wider">রসিদ</div>
                <div className="text-[10px] opacity-80 mt-0.5">INVOICE</div>
              </div>
            </div>
            <div className="mt-5 flex items-end justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[10px] opacity-80 uppercase tracking-wider flex items-center gap-1"><Hash className="w-2.5 h-2.5" /> অর্ডার নম্বর</div>
                <div data-testid="receipt-order-no" className="font-mono text-xl font-extrabold">{order.orderNo}</div>
              </div>
              <div>
                <div className="text-[10px] opacity-80 uppercase tracking-wider flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> তারিখ</div>
                <div className="text-[13px] font-semibold">{created}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] opacity-80 uppercase tracking-wider">মোট</div>
                <div className="text-2xl font-extrabold">৳{formatBDT(order.total)}</div>
              </div>
            </div>
          </div>

          {/* Customer & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4 p-5 border-b border-dashed border-neutral-200">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">গ্রাহক</div>
              <div className="mt-1.5 text-sm font-extrabold text-neutral-900 flex items-center gap-1"><UserIcon className="w-3.5 h-3.5 text-neutral-400" /> {order.address.fullName}</div>
              <div className="text-[12.5px] text-neutral-700 flex items-center gap-1 mt-1"><Phone className="w-3 h-3 text-neutral-400" /> {order.address.phone}</div>
              <div className="text-[12.5px] text-neutral-700 mt-1 flex items-start gap-1">
                <MapPin className="w-3 h-3 text-neutral-400 mt-0.5 shrink-0" />
                <span>{order.address.address}, {order.address.area}{order.address.city ? `, ${order.address.city}` : ''}{order.address.postalCode ? ` — ${order.address.postalCode}` : ''}</span>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">পেমেন্ট</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="text-[10.5px] font-bold uppercase bg-neutral-900 text-white px-2 py-0.5 rounded-full">{order.paymentMethod}</span>
                <span className="text-[10.5px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full capitalize">Status: {order.paymentStatus}</span>
                <span className="text-[10.5px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full capitalize">Order: {order.status}</span>
              </div>
              {order.paymentTxn && (
                <div className="text-[11.5px] text-neutral-700 mt-2">TrxID: <span className="font-mono">{order.paymentTxn}</span></div>
              )}
              {order.paymentPhone && (
                <div className="text-[11.5px] text-neutral-700">প্রেরকের নম্বর: {order.paymentPhone}</div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="p-5">
            <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-2">আইটেম</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
                  <th className="py-2">পণ্য</th>
                  <th className="py-2 text-center">পরিমাণ</th>
                  <th className="py-2 text-right">দর</th>
                  <th className="py-2 text-right">মোট</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="py-2.5">
                      <div className="font-semibold text-[13px] text-neutral-900">{it.name}</div>
                      <div className="text-[11px] text-neutral-500">{it.unit}</div>
                    </td>
                    <td className="py-2.5 text-center font-medium">{it.qty}</td>
                    <td className="py-2.5 text-right">৳{formatBDT(it.price)}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-700">৳{formatBDT(it.price * it.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex items-center justify-between"><span className="text-neutral-500">সাবটোটাল</span><span className="font-semibold">৳{formatBDT(order.subtotal)}</span></div>
              <div className="flex items-center justify-between"><span className="text-neutral-500">ডেলিভারি</span><span className="font-semibold">{order.delivery === 0 ? 'ফ্রি' : `৳${formatBDT(order.delivery)}`}</span></div>
              {order.discount > 0 && (
                <div className="flex items-center justify-between text-emerald-700"><span>ডিসকাউন্ট{order.couponCode ? ` (${order.couponCode})` : ''}</span><span className="font-semibold">-৳{formatBDT(order.discount)}</span></div>
              )}
              <div className="border-t border-neutral-200 my-1.5" />
              <div className="flex items-center justify-between text-base font-extrabold">
                <span>মোট পরিশোধ্য</span>
                <span className="text-emerald-700">৳{formatBDT(order.total)}</span>
              </div>
            </div>

            {order.address.note && (
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-[12px] text-amber-900">
                <span className="font-bold">রাইডার নোট:</span> {order.address.note}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 text-center">
            <div className="text-[12px] text-neutral-600">ধন্যবাদ আপনার অর্ডারের জন্য 🌿</div>
            <div className="text-[10.5px] text-neutral-400 mt-1">এই রসিদটি কম্পিউটার-জেনারেটেড — কোনো স্বাক্ষর প্রয়োজন নেই।</div>
            <div className="text-[10.5px] text-neutral-400 mt-0.5">www.prokritir-ghran · সহায়তা: হোমপেজ &gt; Help &amp; Support</div>
          </div>
        </div>

        <div className="no-print text-center mt-4">
          <button onClick={download} className="inline-flex items-center gap-1.5 bg-white border border-neutral-200 text-neutral-700 px-4 h-10 rounded-full text-[13px] font-semibold hover:bg-neutral-50">
            <Printer className="w-4 h-4" /> প্রিন্ট / পিডিএফ সেভ
          </button>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .receipt-page { background: white !important; padding: 0 !important; }
          .receipt-card { box-shadow: none !important; border-radius: 0 !important; }
          @page { margin: 12mm; size: A4; }
        }
      `}</style>
    </div>
  );
};

export default Receipt;
