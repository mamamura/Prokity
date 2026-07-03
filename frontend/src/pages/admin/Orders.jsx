import React, { useEffect, useState } from 'react';
import { api, formatBDT } from '../../lib/api';
import { useToast } from '../../hooks/use-toast';
import { ChevronDown, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const statusList = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const colors = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-violet-50 text-violet-700 border-violet-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};
// Per-order card background — helps admin visually separate one order from the next
// at a glance. Each status has its own tint + left accent stripe.
const cardBg = {
  pending: 'bg-amber-50/60 border-amber-200 border-l-4 border-l-amber-500',
  confirmed: 'bg-blue-50/60 border-blue-200 border-l-4 border-l-blue-500',
  shipped: 'bg-violet-50/60 border-violet-200 border-l-4 border-l-violet-500',
  delivered: 'bg-emerald-50/60 border-emerald-200 border-l-4 border-l-emerald-600',
  cancelled: 'bg-red-50/60 border-red-200 border-l-4 border-l-red-500',
};
const payColors = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  unpaid: 'bg-neutral-200 text-neutral-700',
  rejected: 'bg-red-100 text-red-700',
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const { toast } = useToast();

  const load = async () => { setLoading(true); const { data } = await api.get('/admin/orders'); setOrders(data); setLoading(false); };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try { await api.patch(`/admin/orders/${id}`, { status }); toast({ title: `Order → ${status}` }); load(); }
    catch (e) { toast({ title: 'Update failed', variant: 'destructive' }); }
  };

  const verifyPayment = async (id, status, note = null) => {
    try {
      await api.patch(`/admin/orders/${id}/payment`, { status, note });
      toast({ title: status === 'paid' ? 'Payment verified ✓' : 'Payment rejected' });
      setVerifyingId(null); setRejectNote('');
      load();
    } catch (e) { toast({ title: 'Action failed', description: e.response?.data?.detail || 'Try again', variant: 'destructive' }); }
  };

  const filterOptions = ['all', 'awaiting-payment', ...statusList];
  const filtered = filter === 'all' ? orders :
    filter === 'awaiting-payment' ? orders.filter((o) => o.paymentMethod !== 'cod' && o.paymentStatus === 'pending') :
    orders.filter((o) => o.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold">Orders</h1>
          <p className="text-sm text-neutral-500">{orders.length} total — verify payments, update status.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
        {filterOptions.map((s) => {
          const count = s === 'all' ? orders.length :
            s === 'awaiting-payment' ? orders.filter((o) => o.paymentMethod !== 'cod' && o.paymentStatus === 'pending').length :
            orders.filter((o) => o.status === s).length;
          const label = s === 'awaiting-payment' ? 'Awaiting payment' : s;
          return (
            <button key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap capitalize ${filter === s ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'}`}>
              {label} ({count})
            </button>
          );
        })}
      </div>
      <div className="space-y-3">
        {loading ? <div className="p-8 text-center text-sm text-neutral-500">Loading…</div> : filtered.length === 0 ? (
          <div className="rounded-2xl border border-neutral-100 bg-white p-10 text-center text-sm text-neutral-500">No orders here.</div>
        ) : filtered.map((o) => (
          <div key={o.id} data-testid={`admin-order-card-${o.id}`} className={`rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${cardBg[o.status] || 'bg-white border-neutral-100'}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-xs text-neutral-500">{o.orderNo}</div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${colors[o.status]}`}>{o.status}</span>
                </div>
                <div className="font-extrabold mt-0.5">{o.userName} <span className="text-xs font-normal text-neutral-500">· {o.userPhone}</span></div>
                <div className="text-[11.5px] text-neutral-500 mt-0.5">{new Date(o.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-emerald-700 text-lg">৳{formatBDT(o.total)}</div>
                <div className="text-[11px] uppercase mt-0.5"><span className="text-neutral-500">{o.paymentMethod}</span> · <span className={`px-1.5 py-0.5 rounded font-bold ${payColors[o.paymentStatus] || 'bg-neutral-100 text-neutral-700'}`}>{o.paymentStatus}</span></div>
              </div>
            </div>

            {/* Manual payment verification block */}
            {o.paymentMethod !== 'cod' && o.paymentStatus === 'pending' && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-center gap-1.5 text-amber-800 text-[12px] font-semibold mb-2"><AlertCircle className="w-3.5 h-3.5" /> Payment verification required</div>
                <div className="text-xs text-amber-900 space-y-0.5">
                  <div>Sender phone: <span className="font-bold font-mono">{o.paymentPhone || 'N/A'}</span></div>
                  <div>Transaction ID: <span className="font-bold font-mono">{o.paymentTxn || 'N/A'}</span></div>
                  <div>Amount: <span className="font-bold">৳{formatBDT(o.total)}</span></div>
                </div>
                {verifyingId === o.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Reason (will be sent to customer)…" rows={2} className="w-full p-2 rounded-lg bg-white border border-amber-200 outline-none focus:border-amber-400 text-xs resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => { setVerifyingId(null); setRejectNote(''); }} className="flex-1 h-9 rounded-full bg-white border border-neutral-200 text-xs font-semibold">Cancel</button>
                      <button onClick={() => verifyPayment(o.id, 'rejected', rejectNote || 'Transaction ID could not be verified.')} className="flex-1 h-9 rounded-full bg-red-600 text-white text-xs font-bold">Confirm reject</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => verifyPayment(o.id, 'paid')} className="inline-flex items-center gap-1 h-9 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Verify & accept</button>
                    <button onClick={() => setVerifyingId(o.id)} className="inline-flex items-center gap-1 h-9 px-4 rounded-full bg-white border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                  </div>
                )}
              </div>
            )}
            {o.paymentMethod !== 'cod' && o.paymentStatus === 'paid' && (
              <div className="mt-3 text-[11px] text-emerald-700 bg-emerald-50 inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold"><CheckCircle2 className="w-3 h-3" /> Payment verified · TrxID {o.paymentTxn}</div>
            )}
            {o.paymentMethod !== 'cod' && o.paymentStatus === 'rejected' && (
              <div className="mt-3 text-[11px] text-red-700 bg-red-50 px-2 py-1 rounded-lg font-semibold">Rejected{o.paymentNote ? ` — ${o.paymentNote}` : ''}</div>
            )}

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/80 border border-white p-3 text-xs">
                <div className="font-semibold text-neutral-700 mb-1">Delivery</div>
                <div className="text-neutral-600">{o.address.fullName}, {o.address.phone}</div>
                <div className="text-neutral-600">{o.address.address}, {o.address.area}, {o.address.city}</div>
                {o.address.note && <div className="text-neutral-500 mt-1 italic">Note: {o.address.note}</div>}
              </div>
              <div className="rounded-xl bg-white/80 border border-white p-3 text-xs">
                <div className="font-semibold text-neutral-700 mb-1">Items ({o.items.length})</div>
                <ul className="space-y-0.5 max-h-28 overflow-auto">
                  {o.items.map((it, i) => (<li key={i} className="flex justify-between"><span className="truncate pr-2">{it.qty}× {it.name}</span><span className="shrink-0">৳{formatBDT(it.price * it.qty)}</span></li>))}
                </ul>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-500">Status</span>
                <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)} className={`px-3 h-9 rounded-full border text-xs font-semibold capitalize ${colors[o.status]}`}>
                  {statusList.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
              {o.paymentTxn && <div className="text-[11px] font-mono text-neutral-500">{o.paymentTxn}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminOrders;
