import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../hooks/use-toast';
import { Plus, Pencil, Trash2, Save, X, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { compressImage } from '../../lib/image';

const blank = () => ({ title: '', subtitle: '', image: '', ctaLabel: 'Shop now', ctaLink: '/categories', active: true, order: 0 });

const AdminBanners = () => {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/banners'); setItems(data || []); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(blank()); setOpen(true); };
  const openEdit = (b) => { setEditing(b); setForm({ ...b }); setOpen(true); };
  const close = () => { setOpen(false); setEditing(null); };

  const onImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const dataUrl = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.85 });
      setForm((s) => ({ ...s, image: dataUrl }));
    } catch (_) {
      toast({ title: 'ছবি লোড ব্যর্থ', variant: 'destructive' });
    } finally { e.target.value = ''; }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editing) await api.put(`/admin/banners/${editing.id}`, form);
      else await api.post('/admin/banners', form);
      toast({ title: editing ? 'Banner updated' : 'Banner added' });
      await load(); close();
    } catch (e) { toast({ title: 'Save failed', description: e.response?.data?.detail || 'Try again', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const remove = async (b) => {
    if (!window.confirm('Delete this banner?')) return;
    try { await api.delete(`/admin/banners/${b.id}`); toast({ title: 'Banner deleted' }); await load(); }
    catch (e) { toast({ title: 'Delete failed', variant: 'destructive' }); }
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold">Hero banners</h1>
          <p className="text-sm text-neutral-500 mt-1">Promotional banners shown on the storefront homepage.</p>
        </div>
        <button data-testid="banner-add-btn" onClick={openAdd} className="inline-flex items-center gap-2 bg-emerald-700 text-white h-11 px-4 md:px-5 rounded-full text-sm font-semibold hover:bg-emerald-800 transition-colors">
          <Plus className="w-4 h-4" /> New banner
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3">{[1,2].map((i) => <div key={i} className="h-32 rounded-2xl bg-neutral-100 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-10 text-center">
          <ImageIcon className="w-7 h-7 text-emerald-600 mx-auto" />
          <div className="text-[14px] font-semibold mt-2">No banners yet</div>
          <div className="text-[12px] text-neutral-500 mt-1">Create your first hero banner to grab customer attention.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((b) => (
            <div key={b.id} data-testid={`banner-card-${b.id}`} className="rounded-2xl bg-white border border-neutral-100 p-4 hover:border-emerald-200 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-20 h-20 rounded-xl bg-emerald-50 overflow-hidden grid place-items-center shrink-0">
                  {b.image ? <img src={b.image} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-emerald-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-extrabold text-sm truncate">{b.title}</div>
                    <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${b.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                      {b.active ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />} {b.active ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <div className="text-[12px] text-neutral-500 mt-0.5 truncate">{b.subtitle || '—'}</div>
                  <div className="text-[11px] text-neutral-400 mt-1">CTA: {b.ctaLabel} → {b.ctaLink}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(b)} data-testid={`banner-edit-${b.id}`} className="w-9 h-9 grid place-items-center rounded-full hover:bg-neutral-100"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(b)} data-testid={`banner-delete-${b.id}`} className="w-9 h-9 grid place-items-center rounded-full hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative w-full md:max-w-lg bg-white md:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">
            <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <div className="font-extrabold text-base">{editing ? 'Edit banner' : 'New banner'}</div>
              <button onClick={close} className="w-9 h-9 grid place-items-center rounded-full hover:bg-neutral-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="p-4 space-y-3">
              <input data-testid="banner-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title *" className="w-full h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              <input data-testid="banner-subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Subtitle" className="w-full h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input data-testid="banner-ctaLabel" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} placeholder="CTA label" className="h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
                <input data-testid="banner-ctaLink" value={form.ctaLink} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} placeholder="CTA link (e.g. /categories)" className="h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input data-testid="banner-order" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} placeholder="Order" className="h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input data-testid="banner-active" type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
                  Active
                </label>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-700 uppercase">Background image (optional)</label>
                <input data-testid="banner-image" type="file" accept="image/*" onChange={onImage} className="mt-1 w-full text-sm" />
                {form.image && (
                  <div className="mt-2 relative rounded-xl overflow-hidden border border-neutral-200">
                    <img src={form.image} alt="" className="w-full h-32 object-cover" />
                    <button type="button" onClick={() => setForm({ ...form, image: '' })} className="absolute top-1 right-1 w-8 h-8 grid place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"><X className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={close} className="flex-1 h-12 rounded-full bg-neutral-100 text-neutral-700 font-semibold hover:bg-neutral-200">Cancel</button>
                <button data-testid="banner-save" disabled={saving} type="submit" className="flex-1 h-12 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60 inline-flex items-center justify-center gap-2"><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBanners;
