import React, { useEffect, useState } from 'react';
import { api, formatBDT } from '../../lib/api';
import { Plus, Pencil, Trash2, X, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const empty = { name: '', description: '', price: '', oldPrice: '', image: '', images: [], variants: [], category: '', unit: '1 কেজি', stock: 100, organic: true, featured: false, tags: [] };

// Preset unit options — Bengali & English. Admin can also type custom.
const UNIT_PRESETS = [
  { group: 'ওজন (গ্রাম / কেজি)', items: ['১০০ গ্রাম', '২০০ গ্রাম', '২৫০ গ্রাম', '৫০০ গ্রাম', '১ কেজি', '২ কেজি', '৫ কেজি', '১০ কেজি'] },
  { group: 'তরল (মিলি / লিটার)', items: ['১০০ মিলি', '২৫০ মিলি', '৫০০ মিলি', '১ লিটার', '২ লিটার', '৫ লিটার'] },
  { group: 'পিস / প্যাক', items: ['১ পিস', '২ পিস', '৪ পিস', '৬ পিস', '১ ডজন (১২ পিস)', '১ হালি (৪ পিস)', '১ প্যাক', '১ বোতল', '১ বান্ডেল'] },
];

const ProductForm = ({ initial, categories, onClose, onSaved }) => {
  const { toast } = useToast();
  const [f, setF] = useState({ ...empty, ...(initial || {}), tags: initial?.tags || [], images: initial?.images || [], variants: initial?.variants || [], price: initial?.price?.toString() || '', oldPrice: initial?.oldPrice?.toString() || '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    const t = tagInput.trim().replace(/\s+/g, '-').toLowerCase();
    if (!t) return;
    if (f.tags.includes(t)) { setTagInput(''); return; }
    setF({ ...f, tags: [...f.tags, t] });
    setTagInput('');
  };
  const removeTag = (t) => setF({ ...f, tags: f.tags.filter((x) => x !== t) });

  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => { setF((s) => ({ ...s, image: reader.result })); setUploading(false); };
    reader.onerror = () => { toast({ title: 'ছবি পড়া যায়নি', variant: 'destructive' }); setUploading(false); };
    reader.readAsDataURL(file);
  };

  // Multiple images upload — appends to images gallery
  const onMultiFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const results = await Promise.all(files.map((file) => new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej();
      r.readAsDataURL(file);
    })));
    setF((s) => ({ ...s, images: [...(s.images || []), ...results] }));
    setUploading(false);
    e.target.value = ''; // reset input so same file can be re-picked
  };

  const removeImage = (i) => setF((s) => ({ ...s, images: (s.images || []).filter((_, idx) => idx !== i) }));

  const addVariant = () => setF((s) => ({ ...s, variants: [...(s.variants || []), { label: UNIT_PRESETS[0].items[3], price: s.price || 100, stock: 100 }] }));
  const updateVariant = (i, patch) => setF((s) => ({ ...s, variants: s.variants.map((v, idx) => idx === i ? { ...v, ...patch } : v) }));
  const removeVariant = (i) => setF((s) => ({ ...s, variants: s.variants.filter((_, idx) => idx !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name || !f.price || !f.image || !f.category) { toast({ title: 'Fill all required fields', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = { name: f.name, description: f.description, price: parseFloat(f.price), oldPrice: f.oldPrice ? parseFloat(f.oldPrice) : null, image: f.image, images: f.images || [], variants: (f.variants || []).map((v) => ({ label: v.label, price: parseFloat(v.price), oldPrice: v.oldPrice ? parseFloat(v.oldPrice) : null, stock: v.stock ? parseInt(v.stock) : null })), category: f.category, unit: f.unit, stock: parseInt(f.stock) || 0, organic: f.organic, featured: f.featured, tags: f.tags };
      if (initial?.id) { await api.put(`/products/${initial.id}`, payload); toast({ title: 'Product updated' }); }
      else { await api.post('/products', payload); toast({ title: 'Product created' }); }
      onSaved();
    } catch (e) {
      toast({ title: 'Save failed', description: e.response?.data?.detail || 'Try again', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-5 py-3.5 flex items-center justify-between">
          <h2 className="font-extrabold text-lg">{initial ? 'Edit product' : 'Add product'}</h2>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full hover:bg-neutral-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-neutral-700 uppercase">Product image *</label>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="w-24 h-24 rounded-xl bg-neutral-50 border border-neutral-200 grid place-items-center overflow-hidden">
                {f.image ? <img src={f.image} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-neutral-400" />}
              </div>
              <div className="flex-1 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 w-fit">
                  <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload image'}
                  <input data-testid="prod-image-file" type="file" accept="image/*" onChange={onFile} className="hidden" />
                </label>
                {f.image && (
                  <button type="button" onClick={() => setF({ ...f, image: '' })} className="inline-flex items-center gap-1 text-[11px] text-red-600 font-semibold"><X className="w-3 h-3" /> ছবি সরান</button>
                )}
              </div>
            </div>
          </div>

          {/* Additional (gallery) images */}
          <div>
            <label className="text-[11px] font-semibold text-neutral-700 uppercase">অতিরিক্ত ছবি (গ্যালারি) — একাধিক আপলোড</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {(f.images || []).map((img, i) => (
                <div key={i} data-testid={`prod-gallery-${i}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 w-5 h-5 grid place-items-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                </div>
              ))}
              <label data-testid="prod-gallery-upload" className="w-16 h-16 rounded-lg border-2 border-dashed border-emerald-300 grid place-items-center cursor-pointer text-emerald-600 hover:bg-emerald-50 transition-colors">
                <Plus className="w-5 h-5" />
                <input data-testid="prod-gallery-files" type="file" accept="image/*" multiple onChange={onMultiFiles} className="hidden" />
              </label>
            </div>
            <div className="text-[10.5px] text-neutral-500 mt-1">প্রোডাক্ট ডিটেইলে গ্যালারিতে দেখা যাবে। একসাথে একাধিক ছবি বাছাই করা যাবে।</div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-neutral-700 uppercase">Name *</label>
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-neutral-700 uppercase">Description</label>
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} className="mt-1 w-full p-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-neutral-700 uppercase">Category *</label>
              <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm">
                <option value="">Select category</option>
                {categories.map((c) => (<option key={c.slug} value={c.slug}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-neutral-700 uppercase">Unit / পরিমাণ</label>
              <select data-testid="prod-unit-select" value={UNIT_PRESETS.some((g) => g.items.includes(f.unit)) ? f.unit : '__custom__'} onChange={(e) => { const v = e.target.value; if (v === '__custom__') { setF({ ...f, unit: '' }); } else { setF({ ...f, unit: v }); } }} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm">
                {UNIT_PRESETS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.items.map((u) => (<option key={u} value={u}>{u}</option>))}
                  </optgroup>
                ))}
                <option value="__custom__">🖋 কাস্টম (নিজে লিখুন)</option>
              </select>
              {(!UNIT_PRESETS.some((g) => g.items.includes(f.unit))) && (
                <input data-testid="prod-unit-custom" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="যেমন: ৩ কেজি, ১৫০ মিলি, ৮ পিস" className="mt-2 w-full h-10 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              )}
              <div className="text-[10.5px] text-neutral-500 mt-1">গ্রাহক প্রোডাক্ট কার্ডে এই পরিমাণ দেখবে।</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-neutral-700 uppercase">Price (৳) *</label>
              <input type="number" step="0.01" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-neutral-700 uppercase">Old price</label>
              <input type="number" step="0.01" value={f.oldPrice} onChange={(e) => setF({ ...f, oldPrice: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-neutral-700 uppercase">Stock</label>
              <input type="number" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
            </div>
          </div>

          {/* Variants — per-product size/quantity options users can pick at checkout */}
          <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[13px] font-extrabold text-emerald-900">ভ্যারিয়েন্ট / পরিমাণ অপশন</div>
                <div className="text-[10.5px] text-emerald-700 mt-0.5">গ্রাহক প্রোডাক্ট পেজে এখান থেকে একটি বেছে নিতে পারবে। খালি রাখলে শুধু ডিফল্ট Unit ব্যবহার হবে।</div>
              </div>
              <button data-testid="prod-add-variant" type="button" onClick={addVariant} className="inline-flex items-center gap-1 bg-emerald-700 text-white text-[11.5px] font-bold h-8 px-3 rounded-full hover:bg-emerald-800"><Plus className="w-3 h-3" /> যোগ করুন</button>
            </div>
            {(f.variants || []).length === 0 ? (
              <div className="text-[11.5px] text-emerald-800/70 italic">কোনো ভ্যারিয়েন্ট নেই। "যোগ করুন" চেপে পরিমাণ (৫০০ গ্রাম / ১ কেজি ইত্যাদি) ও দাম দিন।</div>
            ) : (
              <div className="space-y-2">
                {f.variants.map((v, i) => (
                  <div key={i} data-testid={`prod-variant-${i}`} className="grid grid-cols-12 gap-2 items-center bg-white rounded-xl p-2 border border-emerald-100">
                    <select data-testid={`prod-variant-label-${i}`} value={UNIT_PRESETS.some((g) => g.items.includes(v.label)) ? v.label : '__custom__'} onChange={(e) => { const val = e.target.value; if (val === '__custom__') updateVariant(i, { label: '' }); else updateVariant(i, { label: val }); }} className="col-span-5 h-10 px-2 rounded-lg bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-[12.5px]">
                      {UNIT_PRESETS.map((g) => (
                        <optgroup key={g.group} label={g.group}>
                          {g.items.map((u) => (<option key={u} value={u}>{u}</option>))}
                        </optgroup>
                      ))}
                      <option value="__custom__">🖋 কাস্টম</option>
                    </select>
                    {(!UNIT_PRESETS.some((g) => g.items.includes(v.label))) && (
                      <input data-testid={`prod-variant-label-custom-${i}`} value={v.label} onChange={(e) => updateVariant(i, { label: e.target.value })} placeholder="Label" className="col-span-5 h-10 px-2 rounded-lg bg-neutral-50 border border-neutral-200 outline-none text-[12.5px]" />
                    )}
                    <input data-testid={`prod-variant-price-${i}`} type="number" step="0.01" value={v.price} onChange={(e) => updateVariant(i, { price: e.target.value })} placeholder="দাম" className="col-span-3 h-10 px-2 rounded-lg bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-[12.5px]" />
                    <input data-testid={`prod-variant-stock-${i}`} type="number" value={v.stock ?? ''} onChange={(e) => updateVariant(i, { stock: e.target.value })} placeholder="স্টক" className="col-span-3 h-10 px-2 rounded-lg bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-[12.5px]" />
                    <button data-testid={`prod-variant-remove-${i}`} type="button" onClick={() => removeVariant(i)} className="col-span-1 w-8 h-8 grid place-items-center rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 mx-auto"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[11px] font-semibold text-neutral-700 uppercase">Tags</label>
            <div className="mt-1 flex items-center gap-2">
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="best-seller, raw, gluten-free…" className="flex-1 h-10 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              <button type="button" onClick={addTag} className="h-10 px-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100">Add tag</button>
            </div>
            {f.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-1 rounded-full">#{t}<button type="button" onClick={() => removeTag(t)} className="text-emerald-600 hover:text-red-600 ml-0.5">×</button></span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.organic} onChange={(e) => setF({ ...f, organic: e.target.checked })} className="w-4 h-4 accent-emerald-600" /> Certified organic</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} className="w-4 h-4 accent-emerald-600" /> Featured on home</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full bg-neutral-100 text-neutral-700 font-semibold">Cancel</button>
            <button disabled={saving} type="submit" className="flex-1 h-11 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60">{saving ? 'Saving…' : (initial ? 'Save changes' : 'Create product')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [p, c] = await Promise.all([api.get('/products'), api.get('/categories')]);
    setProducts(p.data); setCats(c.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const del = async (id) => {
    try { await api.delete(`/products/${id}`); toast({ title: 'Product deleted' }); setConfirmDel(null); load(); }
    catch (e) { toast({ title: 'Delete failed', variant: 'destructive' }); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold">Products</h1>
          <p className="text-sm text-neutral-500">Manage your organic catalogue.</p>
        </div>
        <button onClick={() => { setEditing(null); setOpen(true); }} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 h-10 rounded-full text-sm font-semibold hover:bg-emerald-700"><Plus className="w-4 h-4" /> Add product</button>
      </div>
      <div className="rounded-2xl bg-white border border-neutral-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-neutral-500">Loading…</div> : products.length === 0 ? (
          <div className="p-12 text-center"><div className="text-sm font-semibold">No products yet</div><div className="text-xs text-neutral-500 mt-1">Add your first organic product to get started.</div></div>
        ) : (
          <>
          <table className="hidden md:table w-full text-sm">
            <thead className="bg-neutral-50 text-[11px] uppercase text-neutral-500">
              <tr><th className="text-left px-4 py-2">Product</th><th className="text-left px-4 py-2">Category</th><th className="text-right px-4 py-2">Price</th><th className="text-right px-4 py-2">Stock</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-neutral-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt={p.name} onError={(e) => { e.currentTarget.src = 'https://placehold.co/60/f5f5f5/525252?text=img'; }} className="w-10 h-10 rounded-lg object-cover bg-neutral-50" />
                      <div>
                        <div className="font-semibold text-[13px] line-clamp-1 max-w-[260px]">{p.name}</div>
                        <div className="text-[10.5px] text-neutral-500">{p.unit} {p.featured && <span className="ml-1 text-emerald-700">• Featured</span>}</div>
                        {p.tags && p.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.tags.slice(0, 3).map((t) => (<span key={t} className="text-[9.5px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">#{t}</span>))}
                            {p.tags.length > 3 && <span className="text-[9.5px] text-neutral-500">+{p.tags.length - 3}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">{(cats.find((c) => c.slug === p.category)?.name) || p.category}</td>
                  <td className="px-4 py-3 text-right font-bold">৳{formatBDT(p.price)}{p.oldPrice && (<span className="ml-1 text-[10px] text-neutral-400 line-through font-normal">৳{formatBDT(p.oldPrice)}</span>)}</td>
                  <td className="px-4 py-3 text-right text-sm">{p.stock}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditing(p); setOpen(true); }} className="w-8 h-8 grid place-items-center rounded-lg text-neutral-600 hover:bg-neutral-100"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setConfirmDel(p)} className="w-8 h-8 grid place-items-center rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-neutral-100">
            {products.map((p) => (
              <div key={p.id} className="p-3 flex items-center gap-3">
                <img src={p.image} alt={p.name} onError={(e) => { e.currentTarget.src = 'https://placehold.co/60/f5f5f5/525252?text=img'; }} className="w-14 h-14 rounded-lg object-cover bg-neutral-50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] line-clamp-1">{p.name}</div>
                  <div className="text-[11px] text-neutral-500">{p.unit} · stock {p.stock}</div>
                  <div className="font-bold text-emerald-700 text-sm mt-0.5">৳{formatBDT(p.price)}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => { setEditing(p); setOpen(true); }} className="w-9 h-9 grid place-items-center rounded-lg bg-neutral-100 text-neutral-700"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setConfirmDel(p)} className="w-9 h-9 grid place-items-center rounded-lg bg-red-50 text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
      {open && <ProductForm initial={editing} categories={cats} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full">
            <div className="font-extrabold text-lg">Delete this product?</div>
            <div className="text-sm text-neutral-500 mt-1">“{confirmDel.name}” will be permanently removed.</div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirmDel(null)} className="flex-1 h-11 rounded-full bg-neutral-100 font-semibold text-sm">Cancel</button>
              <button onClick={() => del(confirmDel.id)} className="flex-1 h-11 rounded-full bg-red-600 text-white font-semibold text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
