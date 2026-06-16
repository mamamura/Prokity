import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../hooks/use-toast';
import { Save, Smartphone, Wallet, Info, Globe, Truck, Building2, MessageCircle as MC, Percent, Tag } from 'lucide-react';

const tabs = [
  { key: 'payment', label: 'Payment', icon: Wallet },
  { key: 'site', label: 'Site info', icon: Globe },
  { key: 'delivery', label: 'Delivery', icon: Truck },
  { key: 'pricing', label: 'Pricing', icon: Percent },
];

const AdminSettings = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState('payment');
  const [p, setP] = useState({ bkashNumber: '', nagadNumber: '', bkashType: 'personal', nagadType: 'personal', instructions: '' });
  const [s, setS] = useState({ siteName: '', tagline: '', contactPhone: '', contactEmail: '', contactAddress: '', facebookUrl: '', instagramUrl: '', whatsappNumber: '', deliveryFee: 60, freeDeliveryAbove: 500, aboutText: '', globalDiscountPercent: 0, globalDiscountLabel: '', taxPercent: 0, minOrderAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => {
    try {
      const [a, b] = await Promise.all([api.get('/settings/payment'), api.get('/settings/site')]);
      setP({ ...p, ...a.data });
      setS({ ...s, ...b.data });
    } finally { setLoading(false); }
    // eslint-disable-next-line
  })(); }, []);

  const savePayment = async (e) => {
    e.preventDefault();
    if (!p.bkashNumber && !p.nagadNumber) { toast({ title: 'অন্তত একটি নাম্বার দিন', variant: 'destructive' }); return; }
    setSaving(true);
    try { await api.put('/admin/settings/payment', p); toast({ title: 'Payment settings updated' }); }
    catch (e) { toast({ title: 'Save failed', description: e.response?.data?.detail || 'Try again', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const saveSite = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await api.put('/admin/settings/site', s); toast({ title: 'Site settings updated' }); }
    catch (e) { toast({ title: 'Save failed', description: e.response?.data?.detail || 'Try again', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  if (loading) return (<div className="p-10 text-center text-sm text-neutral-500">Loading settings…</div>);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-extrabold">Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Configure your storefront, payments and delivery.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-full w-full md:w-auto md:inline-flex mb-5 overflow-x-auto">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button key={t.key} data-testid={`settings-tab-${t.key}`} onClick={() => setTab(t.key)} className={`shrink-0 inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-[12.5px] font-semibold transition-all ${active ? 'bg-white text-neutral-900 shadow' : 'text-neutral-600 hover:text-neutral-900'}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'payment' && (
        <form onSubmit={savePayment} className="max-w-2xl space-y-4">
          <div className="rounded-2xl bg-white border border-neutral-100 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-pink-600 grid place-items-center"><Smartphone className="w-4 h-4 text-white" /></div>
              <div>
                <div className="font-extrabold text-sm">bKash</div>
                <div className="text-[10.5px] text-neutral-500">Used when customer picks bKash</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10.5px] uppercase tracking-wider font-semibold text-neutral-600">Number</label>
                <input data-testid="settings-bkashNumber" value={p.bkashNumber} onChange={(e) => setP({ ...p, bkashNumber: e.target.value })} placeholder="01XXXXXXXXX" className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm font-mono" />
              </div>
              <div>
                <label className="text-[10.5px] uppercase tracking-wider font-semibold text-neutral-600">Account type</label>
                <select data-testid="settings-bkashType" value={p.bkashType} onChange={(e) => setP({ ...p, bkashType: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm">
                  <option value="personal">Personal</option>
                  <option value="merchant">Merchant</option>
                  <option value="agent">Agent</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-neutral-100 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-orange-500 grid place-items-center"><Wallet className="w-4 h-4 text-white" /></div>
              <div>
                <div className="font-extrabold text-sm">Nagad</div>
                <div className="text-[10.5px] text-neutral-500">Used when customer picks Nagad</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10.5px] uppercase tracking-wider font-semibold text-neutral-600">Number</label>
                <input data-testid="settings-nagadNumber" value={p.nagadNumber} onChange={(e) => setP({ ...p, nagadNumber: e.target.value })} placeholder="01XXXXXXXXX" className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm font-mono" />
              </div>
              <div>
                <label className="text-[10.5px] uppercase tracking-wider font-semibold text-neutral-600">Account type</label>
                <select data-testid="settings-nagadType" value={p.nagadType} onChange={(e) => setP({ ...p, nagadType: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm">
                  <option value="personal">Personal</option>
                  <option value="merchant">Merchant</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-neutral-100 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-2"><Info className="w-4 h-4 text-emerald-700" /><div className="font-extrabold text-sm">Checkout instructions</div></div>
            <textarea data-testid="settings-instructions" value={p.instructions} onChange={(e) => setP({ ...p, instructions: e.target.value })} rows={3} placeholder="Shown to customers on the payment screen." className="w-full p-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm resize-none" />
          </div>

          <button data-testid="settings-payment-save" disabled={saving} type="submit" className="w-full md:w-auto px-6 h-12 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60 inline-flex items-center justify-center gap-2 transition-colors">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      )}

      {tab === 'site' && (
        <form onSubmit={saveSite} className="max-w-2xl space-y-4">
          <div className="rounded-2xl bg-white border border-neutral-100 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 grid place-items-center"><Globe className="w-4 h-4 text-white" /></div>
              <div className="font-extrabold text-sm">Brand</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10.5px] uppercase tracking-wider font-semibold text-neutral-600">Site name</label>
                <input data-testid="settings-siteName" value={s.siteName} onChange={(e) => setS({ ...s, siteName: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              </div>
              <div>
                <label className="text-[10.5px] uppercase tracking-wider font-semibold text-neutral-600">Tagline</label>
                <input data-testid="settings-tagline" value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-[10.5px] uppercase tracking-wider font-semibold text-neutral-600">About text</label>
              <textarea data-testid="settings-aboutText" value={s.aboutText} onChange={(e) => setS({ ...s, aboutText: e.target.value })} rows={3} className="mt-1 w-full p-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm resize-none" />
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-neutral-100 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3"><Building2 className="w-4 h-4 text-emerald-700" /><div className="font-extrabold text-sm">Contact</div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input data-testid="settings-contactPhone" value={s.contactPhone} onChange={(e) => setS({ ...s, contactPhone: e.target.value })} placeholder="Contact phone" className="h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              <input data-testid="settings-contactEmail" value={s.contactEmail} onChange={(e) => setS({ ...s, contactEmail: e.target.value })} placeholder="Contact email" className="h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              <input data-testid="settings-whatsapp" value={s.whatsappNumber} onChange={(e) => setS({ ...s, whatsappNumber: e.target.value })} placeholder="WhatsApp number" className="h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              <input data-testid="settings-contactAddress" value={s.contactAddress} onChange={(e) => setS({ ...s, contactAddress: e.target.value })} placeholder="Address" className="h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              <input data-testid="settings-facebookUrl" value={s.facebookUrl} onChange={(e) => setS({ ...s, facebookUrl: e.target.value })} placeholder="Facebook URL" className="h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              <input data-testid="settings-instagramUrl" value={s.instagramUrl} onChange={(e) => setS({ ...s, instagramUrl: e.target.value })} placeholder="Instagram URL" className="h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
            </div>
          </div>

          <button data-testid="settings-site-save" disabled={saving} type="submit" className="w-full md:w-auto px-6 h-12 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60 inline-flex items-center justify-center gap-2 transition-colors">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save site settings'}
          </button>
        </form>
      )}

      {tab === 'delivery' && (
        <form onSubmit={saveSite} className="max-w-2xl space-y-4">
          <div className="rounded-2xl bg-white border border-neutral-100 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 grid place-items-center"><Truck className="w-4 h-4 text-white" /></div>
              <div>
                <div className="font-extrabold text-sm">Delivery rules</div>
                <div className="text-[10.5px] text-neutral-500">These control the storefront cart calculations.</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10.5px] uppercase tracking-wider font-semibold text-neutral-600">Delivery fee (৳)</label>
                <input data-testid="settings-deliveryFee" type="number" value={s.deliveryFee} onChange={(e) => setS({ ...s, deliveryFee: parseFloat(e.target.value) || 0 })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              </div>
              <div>
                <label className="text-[10.5px] uppercase tracking-wider font-semibold text-neutral-600">Free delivery above (৳)</label>
                <input data-testid="settings-freeDeliveryAbove" type="number" value={s.freeDeliveryAbove} onChange={(e) => setS({ ...s, freeDeliveryAbove: parseFloat(e.target.value) || 0 })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              </div>
            </div>
          </div>
          <button data-testid="settings-delivery-save" disabled={saving} type="submit" className="w-full md:w-auto px-6 h-12 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60 inline-flex items-center justify-center gap-2 transition-colors">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save delivery rules'}
          </button>
        </form>
      )}
      {tab === 'pricing' && (
        <form onSubmit={saveSite} className="max-w-2xl space-y-4">
          <div className="rounded-2xl bg-white border border-neutral-100 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-rose-600 grid place-items-center"><Percent className="w-4 h-4 text-white" /></div>
              <div>
                <div className="font-extrabold text-sm">Global discount</div>
                <div className="text-[10.5px] text-neutral-500">Applies to every cart's subtotal — great for sitewide promotions.</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10.5px] uppercase tracking-wider font-semibold text-neutral-600">Discount %</label>
                <input data-testid="settings-globalDiscountPercent" type="number" step="0.1" min="0" max="90" value={s.globalDiscountPercent} onChange={(e) => setS({ ...s, globalDiscountPercent: parseFloat(e.target.value) || 0 })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
                <div className="text-[10.5px] text-neutral-500 mt-1">0 মানে ডিসকাউন্ট বন্ধ</div>
              </div>
              <div className="md:col-span-2">
                <label className="text-[10.5px] uppercase tracking-wider font-semibold text-neutral-600">Promo label</label>
                <div className="relative mt-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                  <input data-testid="settings-globalDiscountLabel" value={s.globalDiscountLabel} onChange={(e) => setS({ ...s, globalDiscountLabel: e.target.value })} placeholder="e.g. ঈদ ডিসকাউন্ট, Winter Sale" className="w-full h-11 pl-8 pr-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
                </div>
                <div className="text-[10.5px] text-neutral-500 mt-1">কার্ট ও চেকআউটে এই লেবেলটি দেখা যাবে</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-neutral-100 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 grid place-items-center"><Percent className="w-4 h-4 text-white" /></div>
              <div>
                <div className="font-extrabold text-sm">VAT / Tax</div>
                <div className="text-[10.5px] text-neutral-500">Optional. Applied on (subtotal − discount).</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10.5px] uppercase tracking-wider font-semibold text-neutral-600">VAT / Tax %</label>
                <input data-testid="settings-taxPercent" type="number" step="0.1" min="0" max="50" value={s.taxPercent} onChange={(e) => setS({ ...s, taxPercent: parseFloat(e.target.value) || 0 })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              </div>
              <div>
                <label className="text-[10.5px] uppercase tracking-wider font-semibold text-neutral-600">Minimum order (৳)</label>
                <input data-testid="settings-minOrderAmount" type="number" step="1" min="0" value={s.minOrderAmount} onChange={(e) => setS({ ...s, minOrderAmount: parseFloat(e.target.value) || 0 })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
                <div className="text-[10.5px] text-neutral-500 mt-1">0 মানে কোনো সীমা নেই</div>
              </div>
            </div>
          </div>

          <button data-testid="settings-pricing-save" disabled={saving} type="submit" className="w-full md:w-auto px-6 h-12 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60 inline-flex items-center justify-center gap-2 transition-colors">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save pricing'}
          </button>
        </form>
      )}
    </div>
  );
};

export default AdminSettings;
