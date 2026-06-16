import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api, formatBDT } from '../lib/api';
import { Download, ArrowLeft, MapPin, Phone, User as UserIcon, Calendar, Hash, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Logo from '../components/Logo';

/**
 * Public PDF receipt — renders a branded invoice and lets the user download
 * an actual PDF file via jsPDF + html2canvas. Also supports printing.
 * Accessible at /receipt/:orderNo?phone=01XXXXXXXXX.
 */
const Receipt = () => {
  const { orderNo } = useParams();
  const [params] = useSearchParams();
  const phone = (params.get('phone') || '').trim();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const receiptRef = useRef(null);

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

  const downloadPdf = async () => {
    if (!receiptRef.current || downloading) return;
    setDownloading(true);
    try {
      const node = receiptRef.current;
      // Render with high pixel ratio for crisp PDF and let html2canvas honor element CSS.
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: node.scrollWidth,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      // Maintain aspect ratio
      const imgW = pageWidth - 16; // 8mm margins on each side
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 8;
      if (imgH < pageHeight - 16) {
        pdf.addImage(imgData, 'PNG', 8, y, imgW, imgH, undefined, 'FAST');
      } else {
        // Slice across pages if too tall
        let remaining = imgH;
        const sliceHeightMm = pageHeight - 16;
        const sliceHeightPx = (sliceHeightMm * canvas.width) / imgW;
        let srcY = 0;
        while (remaining > 0) {
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = Math.min(sliceHeightPx, canvas.height - srcY);
          const ctx = sliceCanvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
          const sliceData = sliceCanvas.toDataURL('image/png');
          const sliceMmH = (sliceCanvas.height * imgW) / canvas.width;
          pdf.addImage(sliceData, 'PNG', 8, 8, imgW, sliceMmH, undefined, 'FAST');
          srcY += sliceCanvas.height;
          remaining -= sliceMmH;
          if (remaining > 0) pdf.addPage();
        }
      }
      pdf.save(`Receipt-${order.orderNo}.pdf`);
    } catch (e) {
      // Fallback: open print dialog
      window.print();
    } finally {
      setDownloading(false);
    }
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
  const status = (order.status || '').toLowerCase();
  const statusBn = { pending: 'গৃহীত', confirmed: 'নিশ্চিত', shipped: 'প্রেরিত', delivered: 'ডেলিভারি সম্পন্ন', cancelled: 'বাতিল' }[status] || status;
  const payStatusBn = { pending: 'অপেক্ষমাণ', paid: 'পরিশোধিত', failed: 'ব্যর্থ', refunded: 'ফেরত' }[(order.paymentStatus || '').toLowerCase()] || order.paymentStatus;
  const payMethodBn = { cod: 'ক্যাশ অন ডেলিভারি', bkash: 'বিকাশ', nagad: 'নগদ' }[(order.paymentMethod || '').toLowerCase()] || order.paymentMethod;

  return (
    <div className="receipt-page bg-neutral-100 min-h-screen pb-24">
      {/* Top action bar — hidden in PDF/print */}
      <div className="no-print sticky top-0 z-30 bg-white border-b border-neutral-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to={`/track?orderNo=${encodeURIComponent(order.orderNo)}&phone=${encodeURIComponent(phone)}`} className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-700">
            <ArrowLeft className="w-4 h-4" /> ফিরে যান
          </Link>
          <div className="flex items-center gap-2">
            <button data-testid="receipt-print-btn" onClick={() => window.print()} className="inline-flex items-center gap-1.5 bg-white border border-neutral-200 text-neutral-700 px-3 h-9 rounded-full text-[12.5px] font-semibold hover:bg-neutral-50 transition-colors">
              <Printer className="w-3.5 h-3.5" /> প্রিন্ট
            </button>
            <button data-testid="receipt-download-btn" onClick={downloadPdf} disabled={downloading} className="inline-flex items-center gap-1.5 bg-emerald-700 text-white px-4 h-9 rounded-full text-[13px] font-semibold hover:bg-emerald-800 disabled:opacity-60 transition-colors">
              <Download className="w-4 h-4" /> {downloading ? 'তৈরি হচ্ছে…' : 'পিডিএফ ডাউনলোড'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div ref={receiptRef} id="receipt-card" className="receipt-card bg-white rounded-2xl shadow-md print:shadow-none print:rounded-none overflow-hidden" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', Inter, sans-serif" }}>
          {/* Header with brand logo */}
          <div className="p-6 border-b-4 border-emerald-700" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Logo size="xl" />
                <div>
                  <div className="font-extrabold text-emerald-900 text-xl leading-tight">প্রকৃতির ঘ্রাণ</div>
                  <div className="text-[11.5px] text-emerald-700 font-medium">খাঁটি পণ্য, সুস্থ জীবন</div>
                  <div className="text-[11.5px] text-neutral-600 mt-1">বিশুদ্ধতা আমাদের অঙ্গীকার</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">রসিদ / INVOICE</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">No. <span className="font-mono font-bold text-neutral-700">{order.orderNo}</span></div>
                <div className="text-[10px] text-neutral-400 mt-0.5">তারিখ: <span className="font-medium text-neutral-700">{created}</span></div>
              </div>
            </div>
          </div>

          {/* Amount summary band */}
          <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-80 flex items-center gap-1"><Hash className="w-2.5 h-2.5" /> অর্ডার নম্বর</div>
              <div data-testid="receipt-order-no" className="font-mono text-lg font-extrabold mt-0.5">{order.orderNo}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider opacity-80">মোট পরিশোধ্য</div>
              <div className="text-2xl font-extrabold">৳{formatBDT(order.total)}</div>
            </div>
          </div>

          {/* Customer + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4 p-6 border-b border-dashed border-neutral-200">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">বিল প্রাপক</div>
              <div className="mt-1.5 text-sm font-extrabold text-neutral-900 flex items-center gap-1"><UserIcon className="w-3.5 h-3.5 text-neutral-400" /> {order.address.fullName}</div>
              <div className="text-[12.5px] text-neutral-700 flex items-center gap-1 mt-1"><Phone className="w-3 h-3 text-neutral-400" /> {order.address.phone}</div>
              <div className="text-[12.5px] text-neutral-700 mt-1 flex items-start gap-1">
                <MapPin className="w-3 h-3 text-neutral-400 mt-0.5 shrink-0" />
                <span>{order.address.address}, {order.address.area}{order.address.city ? `, ${order.address.city}` : ''}{order.address.postalCode ? ` — ${order.address.postalCode}` : ''}</span>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">পেমেন্ট ও অবস্থা</div>
              <div className="mt-1.5 space-y-1.5">
                <div className="flex items-center gap-2"><span className="text-[11px] text-neutral-500 w-20">পদ্ধতি</span><span className="text-[12.5px] font-bold">{payMethodBn}</span></div>
                <div className="flex items-center gap-2"><span className="text-[11px] text-neutral-500 w-20">পেমেন্ট</span><span className={`text-[10.5px] font-bold uppercase px-2 py-0.5 rounded-full ${order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{payStatusBn}</span></div>
                <div className="flex items-center gap-2"><span className="text-[11px] text-neutral-500 w-20">অর্ডার</span><span className="text-[10.5px] font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{statusBn}</span></div>
                {order.paymentTxn && (<div className="flex items-center gap-2"><span className="text-[11px] text-neutral-500 w-20">TrxID</span><span className="text-[11.5px] font-mono">{order.paymentTxn}</span></div>)}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="p-6">
            <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 mb-2">আইটেমসমূহ</div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wider text-neutral-500 border-b-2 border-emerald-700">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">পণ্য</th>
                  <th className="py-2 px-2 text-center">পরিমাণ</th>
                  <th className="py-2 px-2 text-right">একক দর</th>
                  <th className="py-2 pl-2 text-right">মোট</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="py-2.5 pr-2 text-neutral-400 text-[11.5px]">{i + 1}</td>
                    <td className="py-2.5 pr-2">
                      <div className="font-semibold text-[13px] text-neutral-900">{it.name}</div>
                      {it.unit && <div className="text-[11px] text-neutral-500">{it.unit}</div>}
                    </td>
                    <td className="py-2.5 px-2 text-center font-medium">{it.qty}</td>
                    <td className="py-2.5 px-2 text-right">৳{formatBDT(it.price)}</td>
                    <td className="py-2.5 pl-2 text-right font-bold text-emerald-700">৳{formatBDT(it.price * it.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
              <div className="flex items-center justify-between"><span className="text-neutral-500">সাবটোটাল</span><span className="font-semibold">৳{formatBDT(order.subtotal)}</span></div>
              <div className="flex items-center justify-between"><span className="text-neutral-500">ডেলিভারি চার্জ</span><span className="font-semibold">{order.delivery === 0 ? 'ফ্রি' : `৳${formatBDT(order.delivery)}`}</span></div>
              {order.discount > 0 && (
                <div className="flex items-center justify-between text-emerald-700"><span>ডিসকাউন্ট{order.couponCode ? ` (${order.couponCode})` : ''}</span><span className="font-semibold">-৳{formatBDT(order.discount)}</span></div>
              )}
              <div className="border-t-2 border-emerald-700 my-1.5" />
              <div className="flex items-center justify-between text-base font-extrabold">
                <span className="text-emerald-900">সর্বমোট</span>
                <span className="text-emerald-700">৳{formatBDT(order.total)}</span>
              </div>
            </div>

            {order.address.note && (
              <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-900">
                <span className="font-bold">রাইডার নোট:</span> {order.address.note}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 border-t-2 border-dashed border-emerald-100 text-center">
            <div className="text-[13px] text-emerald-800 font-bold">ধন্যবাদ আপনার অর্ডারের জন্য 🌿</div>
            <div className="text-[10.5px] text-neutral-500 mt-1.5">এই রসিদটি কম্পিউটার-জেনারেটেড — কোনো স্বাক্ষর প্রয়োজন নেই।</div>
            <div className="text-[10.5px] text-neutral-400 mt-0.5">প্রকৃতির ঘ্রাণ · বিশুদ্ধতা আমাদের অঙ্গীকার · সহায়তা: হোমপেজ → Help &amp; Support</div>
          </div>
        </div>
      </div>

      {/* Print styles — keep clean on paper */}
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
